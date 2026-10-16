import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { supplierReturns, supplierReturnItems, suppliers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

function formatReturn(ret: any, supplier: any = null, items: any[] = []) {
  return {
    id: ret.id,
    tenantId: ret.tenantId,
    returnNumber: ret.returnNumber,
    debitNoteNumber: ret.debitNoteNumber || `DN-${ret.returnNumber}`,
    supplierId: ret.supplierId,
    supplierName: supplier?.name || ret.supplierName || "Supplier",
    originalBillId: ret.originalBillId || null,
    billNumber: ret.billNumber || null,
    returnDate: ret.returnDate instanceof Date ? ret.returnDate.toISOString() : (ret.returnDate || new Date().toISOString()),
    reason: ret.reason || "DEFECTIVE",
    subtotalAmount: String(ret.subtotalAmount ?? "0.00"),
    vatAmount: String(ret.vatAmount ?? "0.00"),
    totalAmount: String(ret.totalAmount ?? "0.00"),
    status: ret.status || "DRAFT",
    refundStatus: ret.refundStatus || "PENDING",
    remarks: ret.remarks || "",
    items: items.map(item => ({
      id: item.id,
      productId: item.productId || null,
      itemDescription: item.itemDescription,
      unitPrice: String(item.unitPrice ?? "0.00"),
      quantity: Number(item.quantity ?? 1),
      vatRate: Number(item.vatRate ?? 15),
      vatAmount: String(item.vatAmount ?? "0.00"),
      totalAmount: String(item.totalAmount ?? "0.00"),
      reason: item.reason || "",
    })),
    createdAt: ret.createdAt instanceof Date ? ret.createdAt.toISOString() : (ret.createdAt || new Date().toISOString()),
  };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || "tenant-grocery-01";
    const { id } = params;

    const [ret] = await db
      .select({
        ret: supplierReturns,
        supplier: suppliers,
      })
      .from(supplierReturns)
      .leftJoin(suppliers, eq(supplierReturns.supplierId, suppliers.id))
      .where(and(eq(supplierReturns.tenantId, tenantId), eq(supplierReturns.id, id)));

    if (!ret) {
      return NextResponse.json({ error: "Supplier Return not found" }, { status: 404 });
    }

    const items = await db
      .select()
      .from(supplierReturnItems)
      .where(eq(supplierReturnItems.returnId, id));

    const formatted = formatReturn(ret.ret, ret.supplier, items);
    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error("GET Supplier Return Detail Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || "tenant-grocery-01";
    const { id } = params;
    const body = await req.json();

    const [existing] = await db
      .select()
      .from(supplierReturns)
      .where(and(eq(supplierReturns.tenantId, tenantId), eq(supplierReturns.id, id)));

    if (!existing) {
      return NextResponse.json({ error: "Supplier Return not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(supplierReturns)
      .set({
        status: body.status || existing.status,
        refundStatus: body.refundStatus || existing.refundStatus,
        remarks: body.remarks !== undefined ? body.remarks : existing.remarks,
        subtotalAmount: body.subtotalAmount ? Number(body.subtotalAmount) : existing.subtotalAmount,
        vatAmount: body.vatAmount ? Number(body.vatAmount) : existing.vatAmount,
        totalAmount: body.totalAmount ? Number(body.totalAmount) : existing.totalAmount,
      })
      .where(eq(supplierReturns.id, id))
      .returning();

    const items = await db
      .select()
      .from(supplierReturnItems)
      .where(eq(supplierReturnItems.returnId, id));

    const formatted = formatReturn(updated, null, items);
    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error("PUT Supplier Return Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || "tenant-grocery-01";
    const { id } = params;

    await db
      .delete(supplierReturns)
      .where(and(eq(supplierReturns.tenantId, tenantId), eq(supplierReturns.id, id)));

    return NextResponse.json({ success: true, deleted: true });
  } catch (error: any) {
    console.error("DELETE Supplier Return Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
