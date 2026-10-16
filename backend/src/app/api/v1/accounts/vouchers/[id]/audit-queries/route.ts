import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vouchers, voucherAuditComments, syncQueue } from "@/lib/db/accounting_schema";
import { verifySession } from "@/lib/auth/session";
import { eq, desc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const voucherId = params.id;

    const queries = db
      .select()
      .from(voucherAuditComments)
      .where(eq(voucherAuditComments.voucherId, voucherId))
      .orderBy(desc(voucherAuditComments.createdAt))
      .all();

    return NextResponse.json({ success: true, count: queries.length, auditQueries: queries });
  } catch (error: any) {
    console.error("GET Audit Queries Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession(req);
    const voucherId = params.id;
    const auditorId = session?.userId || req.headers.get("x-user-id") || "auditor-user-1";
    const body = await req.json();

    const { auditorType, queryType, commentText } = body;

    if (!commentText) {
      return NextResponse.json({ error: "Missing required field: commentText" }, { status: 400 });
    }

    const [existingVoucher] = db.select().from(vouchers).where(eq(vouchers.id, voucherId)).all();
    if (!existingVoucher) {
      return NextResponse.json({ error: "Voucher not found." }, { status: 404 });
    }

    const tenantId = existingVoucher.tenantId;

    const result = db.transaction((tx) => {
      const newComment = tx
        .insert(voucherAuditComments)
        .values({
          tenantId,
          voucherId,
          auditorId,
          auditorType: auditorType || "INTERNAL",
          queryType: queryType || "OBSERVATION",
          commentText,
          status: "OPEN",
        })
        .returning()
        .get();

      // Transactional Outbox Sync Entry
      tx.insert(syncQueue)
        .values({
          tenantId,
          entityType: "AUDIT_QUERY",
          entityId: newComment.id,
          action: "INSERT",
          payload: JSON.stringify({ voucherId, queryId: newComment.id, queryType, commentText }),
          status: "PENDING",
        })
        .run();

      return newComment;
    });

    return NextResponse.json({ success: true, auditQuery: result });
  } catch (error: any) {
    console.error("POST Audit Query Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
