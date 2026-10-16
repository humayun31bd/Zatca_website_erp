import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { voucherAuditComments, syncQueue } from "@/lib/db/accounting_schema";
import { verifySession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; queryId: string } }
) {
  try {
    const session = await verifySession(req);
    const respondedBy = session?.userId || req.headers.get("x-user-id") || "finance-user-1";
    const { queryId } = params;

    const body = await req.json();
    const { managementResponse } = body;

    if (!managementResponse) {
      return NextResponse.json({ error: "Missing required field: managementResponse" }, { status: 400 });
    }

    const existingQuery = db.select().from(voucherAuditComments).where(eq(voucherAuditComments.id, queryId)).get();
    if (!existingQuery) {
      return NextResponse.json({ error: "Audit query not found." }, { status: 404 });
    }

    const respondDate = new Date();

    const updated = db.transaction((tx) => {
      const q = tx
        .update(voucherAuditComments)
        .set({
          status: "RESPONDED",
          managementResponse,
          respondedBy,
          respondedAt: respondDate,
        })
        .where(eq(voucherAuditComments.id, queryId))
        .returning()
        .get();

      tx.insert(syncQueue)
        .values({
          tenantId: existingQuery.tenantId,
          entityType: "AUDIT_QUERY",
          entityId: queryId,
          action: "UPDATE",
          payload: JSON.stringify({ queryId, status: "RESPONDED", managementResponse, respondedBy }),
          status: "PENDING",
        })
        .run();

      return q;
    });

    return NextResponse.json({ success: true, auditQuery: updated });
  } catch (error: any) {
    console.error("POST Respond Audit Query Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
