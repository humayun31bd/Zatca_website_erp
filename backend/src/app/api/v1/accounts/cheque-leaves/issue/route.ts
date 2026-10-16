import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chequeLeaves, chequeBooks, accounts } from "@/lib/db/accounting_schema";
import { logChequeAudit } from "@/lib/accounting/cheque_audit_helper";
import { verifySession } from "@/lib/auth/session";
import { eq, and, asc } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || "tenant-grocery-01";
    const userName = session?.userName || "Financial Controller / Maker";

    const body = await req.json();
    const {
      bankAccountId,
      chequeLeafId,
      payeeName,
      amount,
      issueDate,
      dueDate,
      remarks,
      voucherId,
    } = body;

    if (!bankAccountId || !payeeName || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: bankAccountId, payeeName, amount." },
        { status: 400 }
      );
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount value." }, { status: 400 });
    }

    const issuedDateObj = issueDate ? new Date(issueDate) : new Date();

    const result = db.transaction((tx) => {
      let leafToUse: any = null;

      if (chequeLeafId) {
        leafToUse = tx
          .select()
          .from(chequeLeaves)
          .where(and(
            eq(chequeLeaves.id, chequeLeafId),
            eq(chequeLeaves.tenantId, tenantId)
          ))
          .get();

        if (!leafToUse) {
          throw new Error("Specified cheque leaf not found.");
        }
        if (leafToUse.status !== "AVAILABLE") {
          throw new Error(`Cheque leaf #${leafToUse.leafNumber} is not AVAILABLE (Status: ${leafToUse.status}).`);
        }
      } else {
        // Auto-assign next available leaf for this bank account
        leafToUse = tx
          .select()
          .from(chequeLeaves)
          .where(and(
            eq(chequeLeaves.tenantId, tenantId),
            eq(chequeLeaves.bankAccountId, bankAccountId),
            eq(chequeLeaves.status, "AVAILABLE")
          ))
          .orderBy(asc(chequeLeaves.leafNumber))
          .get();

        if (!leafToUse) {
          throw new Error("No available cheque leaves found for the selected bank account. Please register a new cheque book.");
        }
      }

      const isPostDated = dueDate && new Date(dueDate) > new Date();
      const statusToSet = isPostDated ? "ISSUED" : "ISSUED";

      const updatedLeaf = tx
        .update(chequeLeaves)
        .set({
          payeeName: payeeName.trim(),
          amount: numericAmount,
          status: statusToSet,
          issuedDate: issuedDateObj,
          remarks: remarks || (isPostDated ? `PDC Issued due on ${dueDate}` : "Issued via Cheque Management"),
          voucherId: voucherId || null,
        })
        .where(eq(chequeLeaves.id, leafToUse.id))
        .returning()
        .get();

      // Log Audit Entry
      logChequeAudit({
        tenantId,
        chequeLeafId: updatedLeaf.id,
        actionType: "ISSUED",
        previousStatus: leafToUse.status,
        newStatus: statusToSet,
        performedBy: userName,
        remarks: `Issued to ${payeeName} for SAR ${numericAmount}`,
        tx,
      });

      return updatedLeaf;
    });

    return NextResponse.json({
      success: true,
      message: `Cheque #${result.leafNumber} issued successfully to ${result.payeeName}.`,
      chequeLeaf: result,
    });
  } catch (error: any) {
    console.error("POST Issue Cheque Error:", error);
    return NextResponse.json({ error: error.message || "Failed to issue cheque" }, { status: 400 });
  }
}
