import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { supplierBills, suppliers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { getNextDocumentNumber } from "@/lib/procurement/document_sequences";

function formatBill(bill: any, supplier: any = null) {
  return {
    id: bill.id,
    tenantId: bill.tenantId,
    billNumber: bill.billNumber,
    supplierId: bill.supplierId,
    supplierName: supplier?.name || bill.supplierName || "Supplier",
    poId: bill.poId || null,
    grnId: bill.grnId || null,
    issueDate: bill.issueDate instanceof Date ? bill.issueDate.toISOString() : (bill.issueDate || new Date().toISOString()),
    dueDate: bill.dueDate ? (bill.dueDate instanceof Date ? bill.dueDate.toISOString() : bill.dueDate) : null,
    subtotalAmount: String(bill.subtotalAmount ?? "0.00"),
    discountAmount: String(bill.discountAmount ?? "0.00"),
    vatAmount: String(bill.vatAmount ?? "0.00"),
    totalAmount: String(bill.totalAmount ?? "0.00"),
    paidAmount: String(bill.paidAmount ?? "0.00"),
    paymentStatus: bill.paymentStatus || "UNPAID",
    referenceDocUrl: bill.referenceDocUrl || null,
    referenceDocName: bill.referenceDocName || null,
    remarks: bill.remarks || "",
    createdAt: bill.createdAt instanceof Date ? bill.createdAt.toISOString() : (bill.createdAt || new Date().toISOString()),
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId =
      session?.tenantId ||
      req.headers.get("x-tenant-id") ||
      req.nextUrl.searchParams.get("tenantId") ||
      "336eaf82-a524-4b0a-9326-7197b1e5459e";

    const bills = await db
      .select({
        bill: supplierBills,
        supplier: suppliers,
      })
      .from(supplierBills)
      .leftJoin(suppliers, eq(supplierBills.supplierId, suppliers.id))
      .where(eq(supplierBills.tenantId, tenantId))
      .orderBy(desc(supplierBills.createdAt));

    const result = bills.map((b) => formatBill(b.bill, b.supplier));

    return NextResponse.json({ success: true, data: result, bills: result });
  } catch (error: any) {
    console.error("GET Bills Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId =
      session?.tenantId ||
      req.headers.get("x-tenant-id") ||
      req.nextUrl.searchParams.get("tenantId") ||
      "336eaf82-a524-4b0a-9326-7197b1e5459e";

    const body = await req.json();

    const {
      supplierId,
      supplierName,
      poId,
      grnId,
      issueDate,
      dueDate,
      subtotalAmount,
      discountAmount,
      vatAmount,
      totalAmount,
      referenceDocUrl,
      referenceDocName,
      remarks,
    } = body;

    if (!supplierId) {
      return NextResponse.json({ error: "Supplier ID is required" }, { status: 400 });
    }

    const finalBillNumber =
      body.billNumber || (await getNextDocumentNumber(tenantId, 'BILL', issueDate)).documentNumber;
    const newBillId = crypto.randomUUID();

    const sub = Number(subtotalAmount || 0);
    const discount = Number(discountAmount || 0);
    const taxableBase = Math.max(0, sub - discount);
    const vat = Number(vatAmount !== undefined ? vatAmount : taxableBase * 0.15);
    const tot = Number(totalAmount !== undefined ? totalAmount : taxableBase + vat);

    const [newBill] = await db
      .insert(supplierBills)
      .values({
        id: newBillId,
        tenantId,
        billNumber: finalBillNumber,
        supplierId,
        supplierName: supplierName || "Supplier",
        poId: poId || null,
        grnId: grnId || null,
        issueDate: issueDate || new Date().toISOString(),
        dueDate: dueDate || null,
        subtotalAmount: sub,
        discountAmount: discount,
        vatAmount: vat,
        totalAmount: tot,
        paidAmount: 0,
        paymentStatus: "UNPAID",
        referenceDocUrl: referenceDocUrl || null,
        referenceDocName: referenceDocName || null,
        remarks: remarks || "",
      })
      .returning();

    const supplier = await db.select().from(suppliers).where(eq(suppliers.id, supplierId)).get();

    return NextResponse.json({
      success: true,
      data: formatBill(newBill, supplier),
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST Bill Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { billId, paymentAmount, paymentMethod, referenceNumber } = body;

    if (!billId || !paymentAmount) {
      return NextResponse.json({ error: "Bill ID and payment amount are required" }, { status: 400 });
    }

    const existing = await db.select().from(supplierBills).where(eq(supplierBills.id, billId)).get();
    if (!existing) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const newPaidAmount = Number(existing.paidAmount || 0) + Number(paymentAmount);
    let newStatus = "PARTIAL";
    if (newPaidAmount >= Number(existing.totalAmount)) {
      newStatus = "PAID";
    }

    const [updated] = await db
      .update(supplierBills)
      .set({
        paidAmount: newPaidAmount,
        paymentStatus: newStatus,
        remarks: existing.remarks ? `${existing.remarks} | Paid SAR ${paymentAmount} via ${paymentMethod || "BANK"}` : `Paid SAR ${paymentAmount} via ${paymentMethod || "BANK"}`,
      })
      .where(eq(supplierBills.id, billId))
      .returning();

    const supplier = await db.select().from(suppliers).where(eq(suppliers.id, existing.supplierId)).get();

    return NextResponse.json({
      success: true,
      data: formatBill(updated, supplier),
    });
  } catch (error: any) {
    console.error("PUT Bill Payment Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
