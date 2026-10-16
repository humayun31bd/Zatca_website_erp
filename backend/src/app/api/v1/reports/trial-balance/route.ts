import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { generateSixColumnTrialBalance } from "@/lib/accounting/trial_balance_service";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId as string;
    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const level = searchParams.get('level') ? parseInt(searchParams.get('level')!, 10) : undefined;
    const hideZeroBalances = searchParams.get('hideZero') === 'true';

    const report = await generateSixColumnTrialBalance({
      tenantId,
      startDate,
      endDate,
      level,
      hideZeroBalances,
    });

    // Backwards-compatible response structure with 6-column enhancement
    return NextResponse.json({
      success: true,
      reportName: "6-Column Periodic Trial Balance",
      dateRange: report.dateRange,
      data: {
        lines: report.rows.map((r) => ({
          code: r.code,
          name: r.name,
          type: r.type,
          level: r.level,
          // 6 Columns
          openingDebit: r.openingDebit,
          openingCredit: r.openingCredit,
          transactionDebit: r.transactionDebit,
          transactionCredit: r.transactionCredit,
          closingDebit: r.closingDebit,
          closingCredit: r.closingCredit,
          // Legacy aliases
          debit: r.closingDebit,
          credit: r.closingCredit,
        })),
        totalDebit: report.totals.closingDebit,
        totalCredit: report.totals.closingCredit,
        totals: report.totals,
        invariants: report.invariants,
      },
    });
  } catch (error: any) {
    console.error("GET Trial Balance Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
