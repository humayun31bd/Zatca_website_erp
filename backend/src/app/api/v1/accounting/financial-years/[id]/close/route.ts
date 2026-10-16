import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { executeYearEndClose } from "@/lib/accounting/year_end_close_service";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { nextYearId, retainedEarningsAccountId } = body;

    if (!nextYearId || !retainedEarningsAccountId) {
      return NextResponse.json(
        { error: "nextYearId and retainedEarningsAccountId are required to execute year-end close." },
        { status: 400 }
      );
    }

    const result = await executeYearEndClose({
      tenantId: session.tenantId as string,
      closingYearId: params.id,
      nextYearId,
      retainedEarningsAccountId,
      closedByUserId: (session.userId as string) || "user",
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("POST Year End Close Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
