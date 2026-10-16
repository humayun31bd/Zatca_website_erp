import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { financialYears, financialPeriods, vouchers, voucherLines, accounts, syncQueue } from "@/lib/db/accounting_schema";
import { validateVoucherInvariants } from "@/lib/accounting/validator";
import { verifySession } from "@/lib/auth/session";
import { eq, and, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.nextUrl.searchParams.get("tenantId") || "default-tenant";
    const makerId = session?.userId || req.headers.get("x-user-id") || "system-closing-engine";

    const body = await req.json();
    const { financialYearId, retainedEarningsAccountId } = body;

    if (!financialYearId || !retainedEarningsAccountId) {
      return NextResponse.json(
        { error: "financialYearId and retainedEarningsAccountId are required" },
        { status: 400 }
      );
    }

    // 1. Verify Financial Year exists
    const [fy] = await db
      .select()
      .from(financialYears)
      .where(and(eq(financialYears.id, financialYearId), eq(financialYears.tenantId, tenantId)))
      .limit(1);

    if (!fy) {
      return NextResponse.json({ error: "Financial year record not found" }, { status: 404 });
    }

    if (fy.isClosed) {
      return NextResponse.json({ error: "Financial year is already CLOSED" }, { status: 400 });
    }

    // 2. Validate that all 12 periods are LOCKED
    const periods = await db
      .select()
      .from(financialPeriods)
      .where(and(eq(financialPeriods.financialYearId, financialYearId), eq(financialPeriods.tenantId, tenantId)));

    const unlockedPeriods = periods.filter((p) => p.periodNumber <= 12 && !p.isLocked);
    if (unlockedPeriods.length > 0) {
      return NextResponse.json(
        {
          error: `Year-End Close rejected: ${unlockedPeriods.length} accounting periods are still OPEN. All 12 monthly periods must be LOCKED before year-end close.`,
          unlockedPeriods: unlockedPeriods.map((p) => p.periodName),
        },
        { status: 400 }
      );
    }

    // 3. Compute Net Revenue and Expense Balances
    const accountBalances = await db
      .select({
        accountId: voucherLines.accountId,
        accountType: accounts.type,
        accountName: accounts.name,
        totalDebit: sql<number>`SUM(${voucherLines.debit})`,
        totalCredit: sql<number>`SUM(${voucherLines.credit})`,
      })
      .from(voucherLines)
      .innerJoin(vouchers, eq(voucherLines.voucherId, vouchers.id))
      .innerJoin(accounts, eq(voucherLines.accountId, accounts.id))
      .where(and(eq(vouchers.tenantId, tenantId), eq(vouchers.fiscalYear, fy.name)))
      .groupBy(voucherLines.accountId, accounts.type, accounts.name);

    let totalRevenueClosed = 0;
    let totalExpenseClosed = 0;
    const closingLines: any[] = [];

    for (const b of accountBalances) {
      const netCredit = (b.totalCredit || 0) - (b.totalDebit || 0);
      const netDebit = (b.totalDebit || 0) - (b.totalCredit || 0);

      if (b.accountType === "REVENUE" && netCredit > 0) {
        totalRevenueClosed += netCredit;
        closingLines.push({
          accountId: b.accountId,
          debit: netCredit,
          credit: 0,
          narration: `Close Revenue Account '${b.accountName}' to Retained Earnings`,
        });
      } else if (b.accountType === "EXPENSE" && netDebit > 0) {
        totalExpenseClosed += netDebit;
        closingLines.push({
          accountId: b.accountId,
          debit: 0,
          credit: netDebit,
          narration: `Close Expense Account '${b.accountName}' to Retained Earnings`,
        });
      }
    }

    const netProfitLoss = totalRevenueClosed - totalExpenseClosed;

    // Balance Retained Earnings Line
    if (netProfitLoss > 0) {
      // Net Profit -> Credit Retained Earnings
      closingLines.push({
        accountId: retainedEarningsAccountId,
        debit: 0,
        credit: netProfitLoss,
        narration: `Transfer Net Profit for ${fy.name} to Retained Earnings`,
      });
    } else if (netProfitLoss < 0) {
      // Net Loss -> Debit Retained Earnings
      closingLines.push({
        accountId: retainedEarningsAccountId,
        debit: Math.abs(netProfitLoss),
        credit: 0,
        narration: `Transfer Net Loss for ${fy.name} to Retained Earnings`,
      });
    }

    if (!closingLines.length) {
      return NextResponse.json({
        success: true,
        message: "No revenue or expense balances to close.",
      });
    }

    const validation = validateVoucherInvariants(closingLines);
    if (!validation.isValid) {
      return NextResponse.json({ error: `Period 13 Closing Voucher Invariant error: ${validation.error}` }, { status: 400 });
    }

    let closingJv: any = null;

    db.transaction((tx) => {
      const voucherNumber = `JV-CLOSE-${fy.name}-${Date.now()}`;
      const [jv] = tx
        .insert(vouchers)
        .values({
          tenantId,
          voucherNumber,
          voucherType: "JV",
          voucherDate: fy.toDate,
          fiscalYear: fy.name,
          periodNumber: 13, // Period 13 Closing
          narration: `Period 13 Year-End Closing Entry for ${fy.name}`,
          totalAmount: validation.totalDebit,
          status: "APPROVED",
          makerId,
          checkerId: "system-auto-checker",
          approverId: "system-auto-approver",
          syncStatus: "PENDING",
        })
        .returning()
        .all();

      tx.insert(voucherLines).values(
        closingLines.map((l) => ({
          voucherId: jv.id,
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
          narration: l.narration,
        }))
      ).run();

      tx.update(financialYears)
        .set({ isClosed: true, isActive: false, updatedAt: new Date() })
        .where(eq(financialYears.id, fy.id))
        .run();

      tx.insert(syncQueue)
        .values({
          tenantId,
          entityType: "VOUCHER",
          entityId: jv.id,
          action: "INSERT",
          payload: JSON.stringify({ voucher: jv, lines: closingLines }),
          status: "PENDING",
        })
        .run();

      closingJv = jv;
    });

    return NextResponse.json({
      success: true,
      message: `Financial Year ${fy.name} CLOSED successfully in Period 13.`,
      summary: {
        financialYear: fy.name,
        totalRevenueClosed,
        totalExpenseClosed,
        netProfitLoss,
        retainedEarningsTransferred: netProfitLoss,
      },
      closingVoucher: closingJv,
    });
  } catch (error: any) {
    console.error("Year-End Close Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
