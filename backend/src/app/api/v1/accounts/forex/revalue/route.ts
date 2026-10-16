import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vouchers, voucherLines, syncQueue } from "@/lib/db/accounting_schema";
import { calculateUnrealizedRevaluation } from "@/lib/accounting/forex_calculator";
import { validateVoucherInvariants } from "@/lib/accounting/validator";
import { generateVoucherNumber } from "@/lib/accounting/voucher_number_generator";
import { verifySession } from "@/lib/auth/session";
import { enforceFeatureGuard } from "@/lib/entitlements/featureGuard";

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.nextUrl.searchParams.get("tenantId") || "default-tenant";

    // Enforce Plan Entitlement Feature Guard
    const guardError = await enforceFeatureGuard(tenantId, "forexRevaluation");
    if (guardError) return guardError;

    const makerId = session?.userId || req.headers.get("x-user-id") || "system-forex-revaluer";

    const body = await req.json();
    const {
      currencyCode = "USD",
      closingRate,
      foreignBalance,
      currentBookBaseValue,
      foreignAccountId,
      unrealizedGainLossAccountId,
      fiscalYear = "2026-2027",
      periodNumber = new Date().getMonth() + 1,
    } = body;

    if (!closingRate || !foreignBalance || !foreignAccountId || !unrealizedGainLossAccountId) {
      return NextResponse.json(
        { error: "Missing required fields: closingRate, foreignBalance, foreignAccountId, unrealizedGainLossAccountId" },
        { status: 400 }
      );
    }

    const revalResult = calculateUnrealizedRevaluation(
      Number(foreignBalance),
      Number(currentBookBaseValue || 0),
      Number(closingRate)
    );

    if (Math.abs(revalResult.unrealizedGainLoss) === 0) {
      return NextResponse.json({
        success: true,
        message: "No exchange variance detected. Balance matches closing rate.",
        revaluation: revalResult,
      });
    }

    const isGain = revalResult.isGain;
    const absDifference = Math.abs(revalResult.unrealizedGainLoss);

    // Build balanced revaluation JV lines
    const lines = isGain
      ? [
          {
            accountId: foreignAccountId,
            debit: absDifference,
            credit: 0,
            narration: `Unrealized Forex Gain Revaluation (${currencyCode} @ ${closingRate})`,
          },
          {
            accountId: unrealizedGainLossAccountId,
            debit: 0,
            credit: absDifference,
            narration: `Unrealized Forex Gain Credit (${currencyCode} @ ${closingRate})`,
          },
        ]
      : [
          {
            accountId: unrealizedGainLossAccountId,
            debit: absDifference,
            credit: 0,
            narration: `Unrealized Forex Loss Expense (${currencyCode} @ ${closingRate})`,
          },
          {
            accountId: foreignAccountId,
            debit: 0,
            credit: absDifference,
            narration: `Unrealized Forex Loss Revaluation (${currencyCode} @ ${closingRate})`,
          },
        ];

    const validation = validateVoucherInvariants(lines);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { voucherNumber } = await generateVoucherNumber({
      tenantId,
      voucherType: "JV",
      date: new Date(),
    });

    let createdJv: any = null;

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
          narration: `Period-End Forex Revaluation for ${currencyCode} at rate ${closingRate}`,
          totalAmount: absDifference,
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
          debit: l.debit,
          credit: l.credit,
          narration: l.narration,
        }))
      ).run();

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

      createdJv = jv;
    });

    return NextResponse.json({
      success: true,
      message: `Forex Revaluation JV generated successfully.`,
      revaluation: revalResult,
      voucher: createdJv,
    });
  } catch (error: any) {
    console.error("Forex Revaluation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
