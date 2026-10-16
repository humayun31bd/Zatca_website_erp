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
    const { queryId } = params;

    const body = await req.json();
    const { resolutionStatus } = body; // RESOLVED or CLOSED

    const statusToSet = resolutionStatus === "CLOSED" ? "CLOSED" : "RESOLVED";

    const existingQuery = db.select().from(voucherAuditComments).where(eq(voucherAuditComments.id, queryId)).get();
    if (!existingQuery) {
      return NextResponse.json({ error: "Audit query not found." }, { status: 404 });
    }

    const resolveDate = new Date();

    const updated = db.transaction((tx) => {
      const q = tx
        .update(voucherAuditComments)
        .set({
          status: statusToSet,
          resolvedAt: resolveDate,
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
          payload: JSON.stringify({ queryId, status: statusToSet, resolvedAt: resolveDate }),
          status: "PENDING",
        })
        .run();

      return q;
    });

    return NextResponse.json({ success: true, auditQuery: updated });
  } catch (error: any) {
    console.error("POST Resolve Audit Query Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
