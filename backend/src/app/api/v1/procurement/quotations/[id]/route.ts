import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { supplierQuotations, supplierQuotationItems, suppliers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

function formatQuotation(q: any, items: any[] = [], supplier: any = null) {
  return {
    id: q.id,
    tenantId: q.tenantId,
    supplierId: q.supplierId,
    supplierName: supplier?.name || "Unknown Supplier",
    quotationNumber: q.quotationNumber,
    supplierRefNo: q.supplierRefNo || q.supplier_ref_no || null,
    documentUrl: q.documentUrl || q.document_url || null,
    issueDate: q.issueDate instanceof Date ? q.issueDate.toISOString() : new Date(q.issueDate * 1000).toISOString(),
    validUntil: q.validUntil ? (q.validUntil instanceof Date ? q.validUntil.toISOString() : new Date(q.validUntil * 1000).toISOString()) : null,
    subtotalAmount: String(q.subtotalAmount ?? "0"),
    totalVatAmount: String(q.totalVatAmount ?? "0"),
    totalAmount: String(q.totalAmount ?? "0"),
    status: q.status || "SUBMITTED",
    remarks: q.remarks || "",
    createdAt: q.createdAt instanceof Date ? q.createdAt.toISOString() : new Date(q.createdAt * 1000).toISOString(),
    items: items.map(item => ({
      ...item,
      quantity: Number(item.quantity ?? 0),
      unitPrice: Number(item.unitPrice ?? 0),
      vatRate: Number(item.vatRate ?? 15),
      subtotalAmount: Number(item.subtotalAmount ?? 0),
      vatAmount: Number(item.vatAmount ?? 0),
      totalAmount: Number(item.totalAmount ?? 0),
    })),
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rows = await db
      .select({
        quotation: supplierQuotations,
        supplier: suppliers,
      })
      .from(supplierQuotations)
      .leftJoin(suppliers, eq(supplierQuotations.supplierId, suppliers.id))
      .where(eq(supplierQuotations.id, id))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    const items = await db
      .select()
      .from(supplierQuotationItems)
      .where(eq(supplierQuotationItems.quotationId, id));

    const formatted = formatQuotation(rows[0].quotation, items, rows[0].supplier);
    return NextResponse.json({ success: true, data: formatted, quotation: formatted });
  } catch (error: any) {
    console.error("GET Quotation [id] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.status) updateData.status = body.status;
    if (body.remarks !== undefined) updateData.remarks = body.remarks;
    if (body.validUntil) updateData.validUntil = new Date(body.validUntil);
    if (body.supplierRefNo !== undefined) updateData.supplierRefNo = body.supplierRefNo;
    if (body.documentUrl !== undefined) updateData.documentUrl = body.documentUrl;

    const [updated] = await db
      .update(supplierQuotations)
      .set(updateData)
      .where(eq(supplierQuotations.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    const items = await db
      .select()
      .from(supplierQuotationItems)
      .where(eq(supplierQuotationItems.quotationId, id));

    const sup = await db.select().from(suppliers).where(eq(suppliers.id, updated.supplierId)).get();

    return NextResponse.json({
      success: true,
      quotation: formatQuotation(updated, items, sup),
    });
  } catch (error: any) {
    console.error("PUT Quotation [id] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.delete(supplierQuotationItems).where(eq(supplierQuotationItems.quotationId, id));
    await db.delete(supplierQuotations).where(eq(supplierQuotations.id, id));

    return NextResponse.json({ success: true, message: "Quotation deleted successfully" });
  } catch (error: any) {
    console.error("DELETE Quotation [id] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
