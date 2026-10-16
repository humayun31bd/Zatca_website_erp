import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chequeLeaves, vouchers, voucherLines, syncQueue, accounts } from "@/lib/db/accounting_schema";
import { verifySession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const userId = session?.userId || req.headers.get("x-user-id") || "recon-user-1";
    const body = await req.json();
    const { chequeLeafId, bouncedDate, penaltyFeeAmount, remarks } = body;

    if (!chequeLeafId) {
      return NextResponse.json(
        { error: "Missing required field: chequeLeafId" },
        { status: 400 }
      );
    }

    const existingLeaf = db
      .select()
      .from(chequeLeaves)
      .where(eq(chequeLeaves.id, chequeLeafId))
      .get();

    if (!existingLeaf) {
      return NextResponse.json({ error: "Cheque Leaf not found." }, { status: 404 });
    }

    const bounceDateObj = bouncedDate ? new Date(bouncedDate) : new Date();
    const penaltyFee = Number(penaltyFeeAmount) || 0.0;

    const result = db.transaction((tx) => {
      // 1. Update Cheque Leaf status to BOUNCED
      const updatedLeaf = tx
        .update(chequeLeaves)
        .set({
          status: "BOUNCED",
          bouncedDate: bounceDateObj,
          remarks: remarks || "Dishonored/Bounced during Bank Reconciliation",
        })
        .where(eq(chequeLeaves.id, chequeLeafId))
        .returning()
        .get();

      let reversalVoucherNumber = null;
      let penaltyVoucherNumber = null;

      // 2. Generate Reversal Journal Voucher if linked to a voucher
      if (existingLeaf.voucherId) {
        const origVoucher = tx
          .select()
          .from(vouchers)
          .where(eq(vouchers.id, existingLeaf.voucherId))
          .get();

        if (origVoucher) {
          const origLines = tx
            .select()
            .from(voucherLines)
            .where(eq(voucherLines.voucherId, origVoucher.id))
            .all();

          reversalVoucherNumber = `JV-BOUNCE-REV-${Date.now()}`;
          const revVoucher = tx
            .insert(vouchers)
            .values({
              tenantId: existingLeaf.tenantId,
              voucherNumber: reversalVoucherNumber,
              voucherType: "JV",
              voucherDate: bounceDateObj,
              fiscalYear: origVoucher.fiscalYear,
              periodNumber: origVoucher.periodNumber,
              chequeLeafId: chequeLeafId,
              chequeNumber: existingLeaf.leafNumber,
              narration: `Automatic Reversal for Bounced Cheque ${existingLeaf.leafNumber} (Ref: ${origVoucher.voucherNumber})`,
              totalAmount: existingLeaf.amount || origVoucher.totalAmount,
              status: "APPROVED",
              makerId: userId,
              approverId: userId,
              syncStatus: "PENDING",
            })
            .returning()
            .get();

          // Swap Debits and Credits to reverse original entry
          const revLinesToInsert = origLines.map((l) => ({
            voucherId: revVoucher.id,
            accountId: l.accountId,
            costCenterId: l.costCenterId,
            debit: l.credit,
            credit: l.debit,
            narration: `Reversal of ${origVoucher.voucherNumber} - Bounced Cheque ${existingLeaf.leafNumber}`,
          }));

          tx.insert(voucherLines).values(revLinesToInsert).run();

          // Outbox Sync for Reversal Voucher
          tx.insert(syncQueue)
            .values({
              tenantId: existingLeaf.tenantId,
              entityType: "VOUCHER",
              entityId: revVoucher.id,
              action: "INSERT",
              payload: JSON.stringify({ voucher: revVoucher, lines: revLinesToInsert }),
              status: "PENDING",
            })
            .run();
        }
      }

      // 3. Generate Bank Penalty Charge Voucher if penalty fee exists
      if (penaltyFee > 0) {
        // Resolve Bank Charges Expense Account
        const expAccount = tx
          .select()
          .from(accounts)
          .where(eq(accounts.tenantId, existingLeaf.tenantId))
          .all()
          .find((a) => a.code === '5.10.02.001.001' || a.type === 'EXPENSE');

        const bankChargeAccId = expAccount?.id || existingLeaf.bankAccountId;

        penaltyVoucherNumber = `PV-BANK-PENALTY-${Date.now()}`;
        const penaltyVoucher = tx
          .insert(vouchers)
          .values({
            tenantId: existingLeaf.tenantId,
            voucherNumber: penaltyVoucherNumber,
            voucherType: "PV",
            voucherDate: bounceDateObj,
            fiscalYear: "2026-2027",
            periodNumber: bounceDateObj.getMonth() + 1,
            chequeNumber: existingLeaf.leafNumber,
            narration: `Bank Penalty Fee for Bounced Cheque ${existingLeaf.leafNumber}`,
            totalAmount: penaltyFee,
            status: "APPROVED",
            makerId: userId,
            approverId: userId,
            syncStatus: "PENDING",
          })
          .returning()
          .get();

        // Bank Charge Lines (Debit: Penalty Fee Account, Credit: Bank Account)
        const penaltyLines = [
          {
            voucherId: penaltyVoucher.id,
            accountId: bankChargeAccId,
            debit: penaltyFee,
            credit: 0,
            narration: `Bank penalty fee for dishonored cheque ${existingLeaf.leafNumber}`,
          },
          {
            voucherId: penaltyVoucher.id,
            accountId: existingLeaf.bankAccountId,
            debit: 0,
            credit: penaltyFee,
            narration: `Bank penalty deduction`,
          },
        ];

        tx.insert(voucherLines).values(penaltyLines).run();

        tx.insert(syncQueue)
          .values({
            tenantId: existingLeaf.tenantId,
            entityType: "VOUCHER",
            entityId: penaltyVoucher.id,
            action: "INSERT",
            payload: JSON.stringify({ voucher: penaltyVoucher, lines: penaltyLines }),
            status: "PENDING",
          })
          .run();
      }

      // Outbox Sync for Bounced Cheque Leaf
      tx.insert(syncQueue)
        .values({
          tenantId: existingLeaf.tenantId,
          entityType: "CHEQUE_LEAF",
          entityId: chequeLeafId,
          action: "UPDATE",
          payload: JSON.stringify({ chequeLeafId, status: "BOUNCED", bouncedDate: bounceDateObj }),
          status: "PENDING",
        })
        .run();

      return {
        chequeLeaf: updatedLeaf,
        reversalVoucherNumber,
        penaltyVoucherNumber,
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("POST Bounce Cheque Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
