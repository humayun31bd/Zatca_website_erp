import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fixedAssets, vouchers, voucherLines, syncQueue } from "@/lib/db/accounting_schema";
import { calculateMonthlyDepreciation } from "@/lib/accounting/asset_calculator";
import { validateVoucherInvariants } from "@/lib/accounting/validator";
import { generateVoucherNumber } from "@/lib/accounting/voucher_number_generator";
import { verifySession } from "@/lib/auth/session";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.nextUrl.searchParams.get("tenantId") || "default-tenant";
    const makerId = session?.userId || req.headers.get("x-user-id") || "system-depr-runner";

    const body = await req.json().catch(() => ({}));
    const { fiscalYear = "2026-2027", periodNumber = new Date().getMonth() + 1 } = body;

    const activeAssets = await db
      .select()
      .from(fixedAssets)
      .where(and(eq(fixedAssets.tenantId, tenantId), eq(fixedAssets.status, "ACTIVE")));

    if (!activeAssets.length) {
      return NextResponse.json({
        success: true,
        message: "No active fixed assets found for depreciation run.",
        processedCount: 0,
        totalDepreciation: 0,
      });
    }

    const createdJvs: any[] = [];
    let totalDepreciationAmount = 0;

    for (const asset of activeAssets) {
      const deprResult = calculateMonthlyDepreciation({
        purchaseCost: asset.purchaseCost,
        salvageValue: asset.salvageValue,
        usefulLifeMonths: asset.usefulLifeMonths,
        depreciationMethod: asset.depreciationMethod as any,
        depreciationRate: asset.depreciationRate,
        accumulatedDepreciation: asset.accumulatedDepreciation,
        bookValue: asset.bookValue,
      });

      if (deprResult.monthlyDepreciation <= 0) continue;

      const lines = [
        {
          accountId: asset.depreciationExpenseAccountId,
          debit: deprResult.monthlyDepreciation,
          credit: 0,
          narration: `Monthly Depreciation Expense - Asset Tag: ${asset.assetTag}`,
        },
        {
          accountId: asset.accumulatedDepreciationAccountId,
          debit: 0,
          credit: deprResult.monthlyDepreciation,
          narration: `Accumulated Depreciation - Asset Tag: ${asset.assetTag}`,
        },
      ];

      const validation = validateVoucherInvariants(lines);
      if (!validation.isValid) {
        throw new Error(`Depreciation JV Invariant failure for asset ${asset.assetTag}: ${validation.error}`);
      }

      const { voucherNumber } = await generateVoucherNumber({
        tenantId,
        voucherType: "JV",
        date: new Date(),
      });

      // Execute in transaction
      db.transaction((tx) => {
        const [jv] = tx
          .insert(vouchers)
          .values({
            tenantId,
            voucherNumber,
            voucherType: "JV",
            voucherDate: new Date(),
            fiscalYear,
            periodNumber,
            costCenterId: asset.costCenterId || null,
            narration: `Automated Monthly Depreciation Run for Asset: ${asset.assetName} (${asset.assetTag})`,
            totalAmount: deprResult.monthlyDepreciation,
            status: "APPROVED",
            makerId,
            checkerId: "system-auto-checker",
            approverId: "system-auto-approver",
            syncStatus: "PENDING",
          })
          .returning()
          .all();

        tx.insert(voucherLines).values(
          lines.map((l) => ({
            voucherId: jv.id,
            accountId: l.accountId,
            costCenterId: asset.costCenterId || null,
            debit: l.debit,
            credit: l.credit,
            narration: l.narration,
          }))
        ).run();

        // Update Fixed Asset record
        tx.update(fixedAssets)
          .set({
            accumulatedDepreciation: deprResult.newAccumulatedDepreciation,
            bookValue: deprResult.newBookValue,
            status: deprResult.isFullyDepreciated ? "ACTIVE" : "ACTIVE",
          })
          .where(eq(fixedAssets.id, asset.id))
          .run();

        // Queue Sync Outbox
        tx.insert(syncQueue)
          .values({
            tenantId,
            entityType: "VOUCHER",
            entityId: jv.id,
            action: "INSERT",
            payload: JSON.stringify({ voucher: jv, lines }),
            status: "PENDING",
          })
          .run();

        createdJvs.push(jv);
        totalDepreciationAmount += deprResult.monthlyDepreciation;
      });
    }

    return NextResponse.json({
      success: true,
      message: `Monthly Depreciation run executed successfully for ${createdJvs.length} assets.`,
      processedCount: createdJvs.length,
      totalDepreciation: totalDepreciationAmount,
      vouchers: createdJvs,
    });
  } catch (error: any) {
    console.error("Monthly Depreciation Run Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
