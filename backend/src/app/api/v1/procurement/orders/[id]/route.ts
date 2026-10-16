import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { purchaseOrders, purchaseOrderItems, suppliers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

function formatPO(po: any, items: any[] = [], supplier: any = null) {
  return {
    id: po.id,
    tenantId: po.tenantId,
    poNumber: po.poNumber,
    supplierId: po.supplierId,
    supplierName: supplier?.name || po.supplierName || "Unknown Supplier",
    supplierPhone: supplier?.phone || null,
    supplierEmail: supplier?.email || null,
    supplierAddress: supplier?.address || null,
    supplierTaxNumber: supplier?.taxNumber || supplier?.vatNumber || null,
    csId: po.csId || null,
    quotationId: po.quotationId || null,
    status: po.status || "ISSUED",
    issueDate: po.issueDate instanceof Date ? po.issueDate.toISOString() : (po.issueDate || new Date().toISOString()),
    expectedDeliveryDate: po.expectedDeliveryDate ? (po.expectedDeliveryDate instanceof Date ? po.expectedDeliveryDate.toISOString() : po.expectedDeliveryDate) : null,
    subtotalAmount: String(po.subtotalAmount ?? "0.00"),
    vatAmount: String(po.vatAmount ?? "0.00"),
    totalAmount: String(po.totalAmount ?? "0.00"),
    currency: po.currency || "SAR",
    notes: po.notes || "",
    createdAt: po.createdAt instanceof Date ? po.createdAt.toISOString() : (po.createdAt || new Date().toISOString()),
    items: items.map((item) => ({
      id: item.id,
      poId: item.poId,
      productId: item.productId || null,
      description: item.description || "",
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
    const ordersList = await db
      .select({
        po: purchaseOrders,
        supplier: suppliers,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(eq(purchaseOrders.id, id))
      .limit(1);

    if (ordersList.length === 0) {
      return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
    }

    const items = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.poId, id));

    const formatted = formatPO(ordersList[0].po, items, ordersList[0].supplier);
    return NextResponse.json({ success: true, data: formatted, po: formatted });
  } catch (error: any) {
    console.error("GET PO [id] Error:", error);
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
      updatedAt: new Date().toISOString(),
    };

    if (body.status) updateData.status = body.status;
    if (body.expectedDeliveryDate !== undefined) updateData.expectedDeliveryDate = body.expectedDeliveryDate;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const [updated] = await db
      .update(purchaseOrders)
      .set(updateData)
      .where(eq(purchaseOrders.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
    }

    const items = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.poId, id));

    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, updated.supplierId)).limit(1);

    const formatted = formatPO(updated, items, supplier);
    return NextResponse.json({ success: true, data: formatted, po: formatted });
  } catch (error: any) {
    console.error("PUT PO [id] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.poId, id));
    await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));

    return NextResponse.json({ success: true, message: "Purchase Order deleted successfully" });
  } catch (error: any) {
    console.error("DELETE PO [id] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
