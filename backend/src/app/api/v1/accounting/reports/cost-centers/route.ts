import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { getCostCenterPerformanceReport, CostCenterSourceType } from "@/lib/accounting/cost_center_source_service";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId as string;
    const searchParams = req.nextUrl.searchParams;
    const sourceType = (searchParams.get("sourceType") as CostCenterSourceType) || undefined;
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const data = await getCostCenterPerformanceReport({
      tenantId,
      sourceType,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      reportName: "Cost Center Analytical Performance Report",
      period: {
        startDate: startDate?.toISOString() || "All Inception",
        endDate: endDate?.toISOString() || "Latest",
      },
      costCenters: data,
    });
  } catch (error: any) {
    console.error("GET Cost Center Report Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
