import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { getComparativeBalanceSheet } from "@/lib/accounting/balance_sheet_service";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const yearIdsParam = searchParams.get("yearIds");
    const asOfDateParam = searchParams.get("asOfDate");

    const yearIds = yearIdsParam
      ? yearIdsParam.split(",").map((id) => id.trim()).filter(Boolean)
      : undefined;

    const asOfDate = asOfDateParam ? new Date(asOfDateParam) : new Date();

    const report = await getComparativeBalanceSheet({
      tenantId: session.tenantId as string,
      yearIds,
      asOfDate,
    });

    return NextResponse.json(report, { status: 200 });
  } catch (error: any) {
    console.error("GET Comparative Balance Sheet Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
