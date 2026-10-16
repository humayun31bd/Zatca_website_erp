import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vouchers, voucherLines, chequeLeaves, syncQueue, journalEntries, journalEntryLines, voucherAuditComments } from "@/lib/db/accounting_schema";
import { validateVoucherInvariants } from "@/lib/accounting/validator";
import { generateVoucherNumber } from "@/lib/accounting/voucher_number_generator";
import { verifySession } from "@/lib/auth/session";
import { eq, and, asc, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.nextUrl.searchParams.get("tenantId") || "default-tenant";

    const allVouchers = await db
      .select()
      .from(vouchers)
      .where(eq(vouchers.tenantId, tenantId))
      .orderBy(desc(vouchers.createdAt));

    return NextResponse.json({ success: true, vouchers: allVouchers });
  } catch (error: any) {
    console.error("GET Vouchers Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || "default-tenant";
    const makerId = session?.userId || req.headers.get("x-user-id") || "maker-user-1";

    const body = await req.json();
    const {
      voucherType, // RV, PV, JV, CV
      voucherDate,
      fiscalYear,
      periodNumber,
      fundId,
      costCenterId,
      narration,
      lines,
      chequeLeafId: inputChequeLeafId,
      chequeNumber: inputChequeNumber,
      payeeName,
      voucherNumber: customVoucherNumber,
    } = body;

    if (!voucherType || !narration || !lines) {
      return NextResponse.json(
        { error: "Missing required fields: voucherType, narration, lines." },
        { status: 400 }
      );
    }

    // 1. Validate Invariants
    const validation = validateVoucherInvariants(lines);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const dateObj = voucherDate ? new Date(voucherDate) : new Date();

    let voucherNumber = customVoucherNumber;
    if (!voucherNumber) {
      const generated = await generateVoucherNumber({
        tenantId,
        voucherType,
        date: dateObj,
      });
      voucherNumber = generated.voucherNumber;
    }

    const fYear = fiscalYear || "2026-2027";
    const pNum = periodNumber || (dateObj.getMonth() + 1);
    const totalAmount = validation.totalDebit;

    // 2. Write to SQLite in transaction
    const result = db.transaction((tx) => {
      let finalChequeLeafId = inputChequeLeafId || null;
      let finalChequeNumber = inputChequeNumber || null;

      // Handle Cheque Leaf for PV and CV (Outgoing Cheques)
      if (voucherType === "PV" || voucherType === "CV") {
        let leafRecord = null;
        if (inputChequeLeafId) {
          leafRecord = tx.select().from(chequeLeaves).where(eq(chequeLeaves.id, inputChequeLeafId)).get();
        } else {
          // Find next AVAILABLE leaf for any bank line in voucher
          const bankLine = lines.find((l: any) => l.bankAccountId || l.accountId);
          if (bankLine) {
            const accId = bankLine.bankAccountId || bankLine.accountId;
            leafRecord = tx
              .select()
              .from(chequeLeaves)
              .where(and(eq(chequeLeaves.bankAccountId, accId), eq(chequeLeaves.status, "AVAILABLE")))
              .orderBy(asc(chequeLeaves.leafNumber))
              .get();
          }
        }

        if (leafRecord) {
          finalChequeLeafId = leafRecord.id;
          finalChequeNumber = leafRecord.leafNumber;
        }
      }

      // Create Voucher Header
      const newVoucher = tx
        .insert(vouchers)
        .values({
          tenantId,
          voucherNumber,
          voucherType,
          voucherDate: dateObj,
          fiscalYear: fYear,
          periodNumber: pNum,
          fundId: fundId || null,
          costCenterId: costCenterId || null,
          chequeLeafId: finalChequeLeafId,
          chequeNumber: finalChequeNumber,
          narration,
          totalAmount,
          status: "DRAFT",
          makerId,
          syncStatus: "PENDING",
        })
        .returning()
        .get();

      // Update Cheque Leaf status to ISSUED for PV/CV
      if (finalChequeLeafId && (voucherType === "PV" || voucherType === "CV")) {
        tx.update(chequeLeaves)
          .set({
            status: "ISSUED",
            voucherId: newVoucher.id,
            payeeName: payeeName || narration,
            amount: totalAmount,
            issuedDate: dateObj,
          })
          .where(eq(chequeLeaves.id, finalChequeLeafId))
          .run();
      }

      // Handle Incoming Cheque for RV
      if (voucherType === "RV" && inputChequeNumber) {
        const bankLine = lines.find((l: any) => l.bankAccountId || l.accountId);
        const bankAccId = bankLine ? (bankLine.bankAccountId || bankLine.accountId) : "default-bank-acc";
        
        const [rvLeaf] = tx
          .insert(chequeLeaves)
          .values({
            tenantId,
            bankAccountId: bankAccId,
            leafNumber: inputChequeNumber,
            status: "RECEIVED",
            voucherId: newVoucher.id,
            payeeName: payeeName || narration,
            amount: totalAmount,
            issuedDate: dateObj,
            remarks: `Received via RV ${voucherNumber}`,
          })
          .returning()
          .all();

        finalChequeLeafId = rvLeaf.id;
        tx.update(vouchers).set({ chequeLeafId: finalChequeLeafId }).where(eq(vouchers.id, newVoucher.id)).run();
      }

      // Create Voucher Lines
      const linesToInsert = lines.map((l: any) => ({
        voucherId: newVoucher.id,
        accountId: l.accountId,
        costCenterId: l.costCenterId || costCenterId || null,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        narration: l.narration || narration,
      }));

      tx.insert(voucherLines).values(linesToInsert).run();

      // Transactional Outbox Sync Entry
      tx.insert(syncQueue)
        .values({
          tenantId,
          entityType: "VOUCHER",
          entityId: newVoucher.id,
          action: "INSERT",
          payload: JSON.stringify({ voucher: newVoucher, lines: linesToInsert, chequeNumber: finalChequeNumber }),
          status: "PENDING",
        })
        .run();

      return newVoucher;
    });

    return NextResponse.json({ success: true, voucher: result });
  } catch (error: any) {
    console.error("POST Draft Voucher Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.nextUrl.searchParams.get("tenantId") || "default-tenant";

    db.transaction((tx) => {
      // 1. Reset cheque leaves linked to tenant vouchers (prevent foreign key constraint failure)
      tx.update(chequeLeaves)
        .set({
          status: "AVAILABLE",
          voucherId: null,
          payeeName: null,
          amount: null,
          issuedDate: null,
          remarks: null,
        })
        .where(eq(chequeLeaves.tenantId, tenantId))
        .run();

      // 2. Delete voucher audit comments
      tx.delete(voucherAuditComments)
        .where(eq(voucherAuditComments.tenantId, tenantId))
        .run();

      // 3. Delete voucher lines & vouchers
      const tenantVouchers = tx
        .select({ id: vouchers.id })
        .from(vouchers)
        .where(eq(vouchers.tenantId, tenantId))
        .all();
      const voucherIds = tenantVouchers.map((v) => v.id);

      for (const id of voucherIds) {
        tx.delete(voucherLines).where(eq(voucherLines.voucherId, id)).run();
      }

      tx.delete(vouchers).where(eq(vouchers.tenantId, tenantId)).run();

      // 4. Delete GL Journal Entries linked to vouchers
      const voucherJEs = tx
        .select({ id: journalEntries.id })
        .from(journalEntries)
        .where(
          and(
            eq(journalEntries.tenantId, tenantId),
            eq(journalEntries.referenceType, "VOUCHER")
          )
        )
        .all();

      for (const je of voucherJEs) {
        tx.delete(journalEntryLines).where(eq(journalEntryLines.journalEntryId, je.id)).run();
        tx.delete(journalEntries).where(eq(journalEntries.id, je.id)).run();
      }

      // 5. Delete voucher entries in sync queue
      tx.delete(syncQueue)
        .where(and(eq(syncQueue.tenantId, tenantId), eq(syncQueue.entityType, "VOUCHER")))
        .run();

      // If all=true, wipe cleanly across all tenants
      if (req.nextUrl.searchParams.get("all") === "true") {
        tx.update(chequeLeaves)
          .set({
            status: "AVAILABLE",
            voucherId: null,
            payeeName: null,
            amount: null,
            issuedDate: null,
            remarks: null,
          })
          .run();
        tx.delete(voucherAuditComments).run();
        tx.delete(voucherLines).run();
        tx.delete(vouchers).run();
        const allVoucherJEs = tx
          .select({ id: journalEntries.id })
          .from(journalEntries)
          .where(eq(journalEntries.referenceType, "VOUCHER"))
          .all();
        for (const je of allVoucherJEs) {
          tx.delete(journalEntryLines).where(eq(journalEntryLines.journalEntryId, je.id)).run();
          tx.delete(journalEntries).where(eq(journalEntries.id, je.id)).run();
        }
        tx.delete(syncQueue).where(eq(syncQueue.entityType, "VOUCHER")).run();
      }
    });

    return NextResponse.json({
      success: true,
      message: "Referential integrity cleanup complete. All general ledger vouchers and linked sub-ledger items deleted.",
    });
  } catch (error: any) {
    console.error("DELETE Vouchers Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

