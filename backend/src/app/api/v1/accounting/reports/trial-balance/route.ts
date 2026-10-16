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

    return NextResponse.json(report, { status: 200 });
  } catch (error: any) {
    console.error("GET Accounting Trial Balance Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
