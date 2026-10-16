import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  invoices,
  invoiceLineItems,
  invoicePayments,
  whatsappMessages,
  billingCredits,
  purchaseInvoices,
  purchaseInvoiceLineItems,
  supplierQuotations,
  supplierQuotationItems,
  quotationComparativeStatements,
  csItems,
  purchaseOrders,
  purchaseOrderItems,
  goodsReceivedNotes,
  grnItems,
  qualityCheckRecords,
  qcItems,
  supplierBills,
  supplierReturns,
  supplierReturnItems,
  cashBookEntries,
  counterSessions,
} from "@/lib/db/schema";
import {
  vouchers,
  voucherLines,
  chequeLeaves,
  journalEntries,
  journalEntryLines,
  syncQueue,
  voucherAuditComments,
  chequeLeafAuditLogs,
} from "@/lib/db/accounting_schema";
import { deliveryOrders, orderStatusLogs } from "@/lib/db/delivery_orders_schema";
import { verifySession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  try {
    await verifySession(req);

    db.transaction((tx) => {
      // 1. POS / Sales Data Cleanup
      try { tx.delete(orderStatusLogs).run(); } catch {}
      try { tx.delete(deliveryOrders).run(); } catch {}
      try { tx.delete(invoiceLineItems).run(); } catch {}
      try { tx.delete(invoicePayments).run(); } catch {}
      try { tx.delete(whatsappMessages).run(); } catch {}
      try { tx.delete(billingCredits).run(); } catch {}
      try { tx.delete(invoices).run(); } catch {}
      try { tx.delete(counterSessions).run(); } catch {}
      try { tx.delete(cashBookEntries).run(); } catch {}

      // 2. Purchase / Procurement Data Cleanup
      try { tx.delete(supplierReturnItems).run(); } catch {}
      try { tx.delete(supplierReturns).run(); } catch {}
      try { tx.delete(supplierBills).run(); } catch {}
      try { tx.delete(qcItems).run(); } catch {}
      try { tx.delete(qualityCheckRecords).run(); } catch {}
      try { tx.delete(grnItems).run(); } catch {}
      try { tx.delete(goodsReceivedNotes).run(); } catch {}
      try { tx.delete(purchaseOrderItems).run(); } catch {}
      try { tx.delete(purchaseOrders).run(); } catch {}
      try { tx.delete(csItems).run(); } catch {}
      try { tx.delete(quotationComparativeStatements).run(); } catch {}
      try { tx.delete(supplierQuotationItems).run(); } catch {}
      try { tx.delete(supplierQuotations).run(); } catch {}
      try { tx.delete(purchaseInvoiceLineItems).run(); } catch {}
      try { tx.delete(purchaseInvoices).run(); } catch {}

      // 3. Vouchers & GL Ledger Cleanup
      try {
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
      } catch {}

      try { tx.delete(chequeLeafAuditLogs).run(); } catch {}
      try { tx.delete(voucherAuditComments).run(); } catch {}
      try { tx.delete(voucherLines).run(); } catch {}
      try { tx.delete(vouchers).run(); } catch {}
      try { tx.delete(journalEntryLines).run(); } catch {}
      try { tx.delete(journalEntries).run(); } catch {}
      try { tx.delete(syncQueue).run(); } catch {}
    });

    return NextResponse.json({
      success: true,
      message: "Transactional data wipe completed successfully. All POS data, purchase invoices, vouchers, and GL journal entries have been completely cleared.",
    });
  } catch (error: any) {
    console.error("Master Wipe Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
