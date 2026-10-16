import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chequeLeaves, journalEntries, journalEntryLines, accounts } from "@/lib/db/accounting_schema";
import { logChequeAudit } from "@/lib/accounting/cheque_audit_helper";
import { verifySession } from "@/lib/auth/session";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || "tenant-grocery-01";
    const userName = session?.userName || "Financial Controller / Maker";

    const body = await req.json();
    const { chequeLeafId, reason, stopFeeAmount } = body;

    if (!chequeLeafId) {
      return NextResponse.json({ error: "Missing required field: chequeLeafId" }, { status: 400 });
    }

    const leafRecord = await db
      .select()
      .from(chequeLeaves)
      .where(and(eq(chequeLeaves.id, chequeLeafId), eq(chequeLeaves.tenantId, tenantId)))
      .get();

    if (!leafRecord) {
      return NextResponse.json({ error: "Cheque leaf not found." }, { status: 404 });
    }

    if (leafRecord.status === "CLEARED") {
      return NextResponse.json(
        { error: `Cheque #${leafRecord.leafNumber} is already CLEARED and cannot be cancelled or stop-paid.` },
        { status: 400 }
      );
    }

    const numericStopFee = parseFloat(stopFeeAmount || "0");
    const cancellationReason = reason || "Stop Payment Request / Cancelled Leaf";

    const result = db.transaction((tx) => {
      // 1. Update Cheque Leaf status to CANCELLED
      const updatedLeaf = tx
        .update(chequeLeaves)
        .set({
          status: "CANCELLED",
          remarks: `Cancelled: ${cancellationReason}`,
        })
        .where(eq(chequeLeaves.id, chequeLeafId))
        .returning()
        .get();

      let feeEntryNumber = null;

      // 2. If Stop Payment Fee was charged by Bank, post Journal Entry
      if (numericStopFee > 0) {
        feeEntryNumber = `JE-STOPFEE-${Date.now()}`;
        const je = tx
          .insert(journalEntries)
          .values({
            tenantId,
            entryNumber: feeEntryNumber,
            referenceType: "BANK_STOP_FEE",
            referenceId: chequeLeafId,
            entryDate: new Date(),
            description: `Bank Stop Payment Fee for Cheque #${leafRecord.leafNumber}`,
            status: "POSTED",
          })
          .returning()
          .get();

        // Find bank expense account or default expense
        const bankExpenseAcc = tx
          .select()
          .from(accounts)
          .where(and(eq(accounts.tenantId, tenantId), eq(accounts.type, "EXPENSE")))
          .get();

        const expAccId = bankExpenseAcc ? bankExpenseAcc.id : leafRecord.bankAccountId;

        tx.insert(journalEntryLines).values([
          {
            journalEntryId: je.id,
            accountId: expAccId,
            debit: numericStopFee,
            credit: 0,
            description: `Stop Payment Charge - Cheque #${leafRecord.leafNumber}`,
          },
          {
            journalEntryId: je.id,
            accountId: leafRecord.bankAccountId,
            debit: 0,
            credit: numericStopFee,
            description: `Stop Payment Charge - Cheque #${leafRecord.leafNumber}`,
          },
        ]);
      }

      // 3. Log Audit Entry
      logChequeAudit({
        tenantId,
        chequeLeafId: updatedLeaf.id,
        actionType: "CANCELLED",
        previousStatus: leafRecord.status,
        newStatus: "CANCELLED",
        performedBy: userName,
        remarks: `Cancelled leaf. Reason: ${cancellationReason}`,
        tx,
      });

      return { updatedLeaf, feeEntryNumber };
    });

    return NextResponse.json({
      success: true,
      message: `Cheque #${result.updatedLeaf.leafNumber} marked as CANCELLED.`,
      chequeLeaf: result.updatedLeaf,
      feeJournalEntry: result.feeEntryNumber,
    });
  } catch (error: any) {
    console.error("POST Cancel Cheque Error:", error);
    return NextResponse.json({ error: error.message || "Failed to cancel cheque" }, { status: 500 });
  }
}
