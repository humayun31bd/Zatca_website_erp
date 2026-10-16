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

    return NextResponse.json(report, { status: 200 });
  } catch (error: any) {
    console.error('Accounting P&L Report Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
