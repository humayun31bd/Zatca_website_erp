import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chequeLeaves, chequeBooks, accounts } from "@/lib/db/accounting_schema";
import { verifySession } from "@/lib/auth/session";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.nextUrl.searchParams.get("tenantId") || "tenant-grocery-01";
    const bankAccountId = req.nextUrl.searchParams.get("bankAccountId");
    const status = req.nextUrl.searchParams.get("status");

    let whereConditions = [eq(chequeLeaves.tenantId, tenantId)];
    if (bankAccountId) {
      whereConditions.push(eq(chequeLeaves.bankAccountId, bankAccountId));
    }
    if (status && status !== 'ALL') {
      whereConditions.push(eq(chequeLeaves.status, status));
    }

    const leavesWithMeta = await db
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
      .where(and(...whereConditions))
      .orderBy(desc(chequeLeaves.createdAt));

    const formattedLeaves = leavesWithMeta.map(l => ({
      ...l,
      bankAccountName: l.bankAccountName || 'Bank Account',
      chequeBookNumber: l.chequeBookNumber || 'N/A',
      issuedDate: l.issuedDate ? (l.issuedDate instanceof Date ? l.issuedDate.toISOString() : new Date(l.issuedDate * 1000).toISOString()) : null,
      clearedDate: l.clearedDate ? (l.clearedDate instanceof Date ? l.clearedDate.toISOString() : new Date(l.clearedDate * 1000).toISOString()) : null,
      bouncedDate: l.bouncedDate ? (l.bouncedDate instanceof Date ? l.bouncedDate.toISOString() : new Date(l.bouncedDate * 1000).toISOString()) : null,
      createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : new Date(l.createdAt * 1000).toISOString(),
    }));

    return NextResponse.json({
      success: true,
      count: formattedLeaves.length,
      chequeLeaves: formattedLeaves,
    });
  } catch (error: any) {
    console.error("GET Cheque Leaves Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
