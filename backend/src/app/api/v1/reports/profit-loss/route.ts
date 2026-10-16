import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { generateProfitAndLossReport } from "@/lib/accounting/profit_loss_service";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId as string;
    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const financialYearId = searchParams.get('financialYearId') || undefined;

    const report = await generateProfitAndLossReport({
      tenantId,
      startDate,
      endDate,
      financialYearId,
    });

    return NextResponse.json({
      success: true,
      data: {
        totalSales: report.summary.totalRevenue,
        totalReturns: 0,
        netSales: report.summary.totalRevenue,
        costOfGoodsSold: report.summary.totalCogs,
        grossProfit: report.summary.grossProfit,
        grossProfitMargin: report.summary.grossProfitMargin,
        totalExpenses: report.summary.totalOpex,
        operatingProfit: report.summary.operatingProfit,
        totalOtherIncome: report.summary.totalOtherIncome,
        totalOtherExpense: report.summary.totalOtherExpense,
        netProfit: report.summary.netIncome,
        currency: 'SAR',
        period: report.period,
        operatingRevenue: report.operatingRevenue,
        cogs: report.costOfGoodsSold,
        operatingExpenses: report.operatingExpenses,
        nonOperatingRevenue: report.nonOperatingRevenue,
        nonOperatingExpenses: report.nonOperatingExpenses,
      },
      summary: report.summary,
    });
  } catch (error: any) {
    console.error('Profit and Loss error:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}
