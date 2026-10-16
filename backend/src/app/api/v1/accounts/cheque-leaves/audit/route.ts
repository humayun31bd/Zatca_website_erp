import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chequeLeaves, chequeLeafAuditLogs, accounts, chequeBooks } from "@/lib/db/accounting_schema";
import { verifySession } from "@/lib/auth/session";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.nextUrl.searchParams.get("tenantId") || "tenant-grocery-01";
    const chequeLeafId = req.nextUrl.searchParams.get("chequeLeafId");

    if (!chequeLeafId) {
      return NextResponse.json({ error: "Missing required query parameter: chequeLeafId" }, { status: 400 });
    }

    const leafRecord = await db
      .select({
        id: chequeLeaves.id,
        tenantId: chequeLeaves.tenantId,
        chequeBookId: chequeLeaves.chequeBookId,
        bankAccountId: chequeLeaves.bankAccountId,
        leafNumber: chequeLeaves.leafNumber,
        status: chequeLeaves.status,
        voucherId: chequeLeaves.voucherId,
        payeeName: chequeLeaves.payeeName,
        amount: chequeLeaves.amount,
        issuedDate: chequeLeaves.issuedDate,
        clearedDate: chequeLeaves.clearedDate,
        bouncedDate: chequeLeaves.bouncedDate,
        remarks: chequeLeaves.remarks,
        createdAt: chequeLeaves.createdAt,
        bankAccountName: accounts.name,
        chequeBookNumber: chequeBooks.chequeBookNumber,
      })
      .from(chequeLeaves)
      .leftJoin(accounts, eq(chequeLeaves.bankAccountId, accounts.id))
      .leftJoin(chequeBooks, eq(chequeLeaves.chequeBookId, chequeBooks.id))
      .where(and(eq(chequeLeaves.id, chequeLeafId), eq(chequeLeaves.tenantId, tenantId)))
      .get();

    if (!leafRecord) {
      return NextResponse.json({ error: "Cheque leaf not found." }, { status: 404 });
    }

    const logs = await db
      .select()
      .from(chequeLeafAuditLogs)
      .where(and(eq(chequeLeafAuditLogs.chequeLeafId, chequeLeafId), eq(chequeLeafAuditLogs.tenantId, tenantId)))
      .orderBy(desc(chequeLeafAuditLogs.createdAt));

    // If no explicit audit logs exist yet for legacy leaves, generate default leaf creation timeline event
    const auditTimeline = logs.length > 0
      ? logs.map(l => ({
          ...l,
          createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : new Date(Number(l.createdAt) * 1000).toISOString(),
        }))
      : [
          {
            id: `init-${leafRecord.id}`,
            tenantId,
            chequeLeafId: leafRecord.id,
            actionType: leafRecord.status === "RECEIVED" ? "PDC_RECEIVED" : "CREATED",
            previousStatus: null,
            newStatus: leafRecord.status,
            performedBy: "Financial Controller / Maker",
            remarks: leafRecord.remarks || `Initial state (${leafRecord.status})`,
            createdAt: leafRecord.createdAt instanceof Date ? leafRecord.createdAt.toISOString() : new Date(Number(leafRecord.createdAt) * 1000).toISOString(),
          }
        ];

    return NextResponse.json({
      success: true,
      leaf: {
        ...leafRecord,
        issuedDate: leafRecord.issuedDate ? (leafRecord.issuedDate instanceof Date ? leafRecord.issuedDate.toISOString() : new Date(Number(leafRecord.issuedDate) * 1000).toISOString()) : null,
        clearedDate: leafRecord.clearedDate ? (leafRecord.clearedDate instanceof Date ? leafRecord.clearedDate.toISOString() : new Date(Number(leafRecord.clearedDate) * 1000).toISOString()) : null,
        bouncedDate: leafRecord.bouncedDate ? (leafRecord.bouncedDate instanceof Date ? leafRecord.bouncedDate.toISOString() : new Date(Number(leafRecord.bouncedDate) * 1000).toISOString()) : null,
        createdAt: leafRecord.createdAt instanceof Date ? leafRecord.createdAt.toISOString() : new Date(Number(leafRecord.createdAt) * 1000).toISOString(),
      },
      auditLogs: auditTimeline,
    });
  } catch (error: any) {
    console.error("GET Cheque Audit Log Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
