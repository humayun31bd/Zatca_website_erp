import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recurringVouchers, vouchers, voucherLines, syncQueue } from "@/lib/db/accounting_schema";
import { calculateNextRunDate } from "@/lib/accounting/recurring_calculator";
import { validateVoucherInvariants } from "@/lib/accounting/validator";
import { generateVoucherNumber } from "@/lib/accounting/voucher_number_generator";
import { verifySession } from "@/lib/auth/session";
import { enforceFeatureGuard } from "@/lib/entitlements/featureGuard";
import { eq, and, lte } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.nextUrl.searchParams.get("tenantId") || "default-tenant";

    // Enforce Plan Entitlement Feature Guard
    const guardError = await enforceFeatureGuard(tenantId, "recurringVouchers");
    if (guardError) return guardError;

    const makerId = session?.userId || req.headers.get("x-user-id") || "system-recurring-runner";

    const body = await req.json().catch(() => ({}));
    const { referenceDate = new Date(), fiscalYear = "2026-2027", periodNumber = new Date().getMonth() + 1 } = body;
    const now = new Date(referenceDate);

    // Fetch templates due for execution
    const dueTemplates = await db
      .select()
      .from(recurringVouchers)
      .where(
        and(
          eq(recurringVouchers.tenantId, tenantId),
          eq(recurringVouchers.isActive, true),
          lte(recurringVouchers.nextRunDate, now)
        )
      );

    if (!dueTemplates.length) {
      return NextResponse.json({
        success: true,
        message: "No recurring voucher templates due for execution.",
        processedCount: 0,
        vouchers: [],
      });
    }

    const generatedVouchers: any[] = [];

    for (const template of dueTemplates) {
      let payload: any = {};
      try {
        payload = JSON.parse(template.payloadJson);
      } catch (e) {
        console.error(`Invalid JSON payload for template ${template.id}`);
        continue;
      }

      const lines = payload.lines || [];
      const narration = payload.narration || template.templateName;

      const validation = validateVoucherInvariants(lines);
      if (!validation.isValid) {
        console.error(`Recurring voucher template ${template.id} failed invariant check: ${validation.error}`);
        continue;
      }

      const { voucherNumber } = await generateVoucherNumber({
        tenantId,
        voucherType: template.voucherType,
        date: now,
      });

      db.transaction((tx) => {
        const [newVoucher] = tx
          .insert(vouchers)
          .values({
            tenantId,
            voucherNumber,
            voucherType: template.voucherType,
            voucherDate: now,
            fiscalYear,
            periodNumber,
            narration: `[Recurring Auto-Run] ${narration}`,
            totalAmount: template.amount,
            status: "APPROVED",
            makerId,
            checkerId: "system-auto-checker",
            approverId: "system-auto-approver",
            syncStatus: "PENDING",
          })
          .returning()
          .all();

        tx.insert(voucherLines).values(
          lines.map((l: any) => ({
            voucherId: newVoucher.id,
            accountId: l.accountId,
            costCenterId: l.costCenterId || null,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            narration: l.narration || narration,
          }))
        ).run();

        tx.insert(syncQueue)
          .values({
            tenantId,
            entityType: "VOUCHER",
            entityId: newVoucher.id,
            action: "INSERT",
            payload: JSON.stringify({ voucher: newVoucher, lines }),
            status: "PENDING",
          })
          .run();

        // Calculate next run date
        const newTotalRuns = template.totalRuns + 1;
        const nextDate = calculateNextRunDate(template.nextRunDate, template.frequency as any);
        const shouldDisable = template.maxRuns ? newTotalRuns >= template.maxRuns : false;

        tx.update(recurringVouchers)
          .set({
            lastRunDate: now,
            totalRuns: newTotalRuns,
            nextRunDate: nextDate,
            isActive: !shouldDisable,
          })
          .where(eq(recurringVouchers.id, template.id))
          .run();

        generatedVouchers.push(newVoucher);
      });
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${generatedVouchers.length} recurring vouchers successfully.`,
      processedCount: generatedVouchers.length,
      vouchers: generatedVouchers,
    });
  } catch (error: any) {
    console.error("Recurring Voucher Process Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
