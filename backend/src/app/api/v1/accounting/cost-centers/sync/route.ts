import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { syncAllSourceEntitiesToCostCenters } from "@/lib/accounting/cost_center_source_service";

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId as string;

    const result = await syncAllSourceEntitiesToCostCenters(tenantId);

    return NextResponse.json({
      success: true,
      message: `Synchronized ${result.totalCreatedOrUpdated} source entities into Chart of Accounts Cost Centers.`,
      result,
    });
  } catch (error: any) {
    console.error("POST Cost Centers Sync Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
