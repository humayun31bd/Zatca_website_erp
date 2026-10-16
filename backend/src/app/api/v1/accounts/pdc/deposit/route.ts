import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chequeLeaves, accounts } from "@/lib/db/accounting_schema";
import { logChequeAudit } from "@/lib/accounting/cheque_audit_helper";
import { verifySession } from "@/lib/auth/session";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || "tenant-grocery-01";
    const userName = session?.userName || "Financial Controller / Maker";

    const body = await req.json();
    const { chequeLeafId, targetBankAccountId, depositDate, remarks } = body;

    if (!chequeLeafId) {
      return NextResponse.json({ error: "Missing required parameter: chequeLeafId" }, { status: 400 });
    }

    const leafRecord = await db
      .select()
      .from(chequeLeaves)
      .where(and(eq(chequeLeaves.id, chequeLeafId), eq(chequeLeaves.tenantId, tenantId)))
      .get();

    if (!leafRecord) {
      return NextResponse.json({ error: "Cheque leaf record not found." }, { status: 404 });
    }

    if (leafRecord.status !== "RECEIVED") {
      return NextResponse.json(
        { error: `Cheque leaf #${leafRecord.leafNumber} cannot be deposited (Current Status: ${leafRecord.status}). Only RECEIVED PDCs can be deposited.` },
        { status: 400 }
      );
    }

    const depositDateObj = depositDate ? new Date(depositDate) : new Date();
    const bankIdToUse = targetBankAccountId || leafRecord.bankAccountId;

    const result = await db.transaction(async (tx) => {
      const [updatedLeaf] = await tx
        .update(chequeLeaves)
        .set({
          status: "PRESENTED",
          bankAccountId: bankIdToUse,
          remarks: remarks || `Deposited for clearance on ${depositDateObj.toISOString().split("T")[0]}`,
        })
        .where(eq(chequeLeaves.id, chequeLeafId))
        .returning();

      await logChequeAudit({
        tenantId,
        chequeLeafId: updatedLeaf.id,
        actionType: "DEPOSITED",
        previousStatus: leafRecord.status,
        newStatus: "PRESENTED",
        performedBy: userName,
        remarks: remarks || `Deposited PDC to Bank Account #${bankIdToUse}`,
        tx,
      });

      return updatedLeaf;
    });

    return NextResponse.json({
      success: true,
      message: `PDC Cheque #${result.leafNumber} marked as PRESENTED / DEPOSITED for bank clearance.`,
      pdc: result,
    });
  } catch (error: any) {
    console.error("POST Deposit PDC Error:", error);
    return NextResponse.json({ error: error.message || "Failed to deposit PDC" }, { status: 500 });
  }
}
