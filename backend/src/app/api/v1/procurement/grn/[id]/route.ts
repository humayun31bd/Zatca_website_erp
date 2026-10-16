import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { goodsReceivedNotes, grnItems, suppliers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

function formatGRN(grn: any, items: any[] = [], supplier: any = null) {
  return {
    id: grn.id,
    tenantId: grn.tenantId,
    grnNumber: grn.grnNumber,
    poId: grn.poId || null,
    poNumber: grn.poNumber || "N/A",
    supplierId: grn.supplierId,
    supplierName: supplier?.name || "Supplier",
    supplierPhone: supplier?.phone || "",
    supplierEmail: supplier?.email || "",
    supplierAddress: supplier?.address || "",
    supplierTaxNumber: supplier?.vatNumber || supplier?.taxNumber || "",
    warehouseId: grn.warehouseId || null,
    receivedDate: grn.receivedDate instanceof Date ? grn.receivedDate.toISOString() : (grn.receivedDate || new Date().toISOString()),
    status: grn.status || "RECEIVED",
    deliveryNoteNumber: grn.deliveryNoteNumber || "",
    remarks: grn.remarks || "",
    createdAt: grn.createdAt instanceof Date ? grn.createdAt.toISOString() : (grn.createdAt || new Date().toISOString()),
    items: items.map((item) => ({
      id: item.id,
      grnId: item.grnId,
      productId: item.productId || null,
      description: item.description || "",
      orderedQuantity: Number(item.orderedQuantity ?? 0),
      receivedQuantity: Number(item.receivedQuantity ?? 0),
      unitPrice: Number(item.unitPrice ?? 0),
    })),
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const grnList = await db
      .select({
        grn: goodsReceivedNotes,
        supplier: suppliers,
      })
      .from(goodsReceivedNotes)
      .leftJoin(suppliers, eq(goodsReceivedNotes.supplierId, suppliers.id))
      .where(eq(goodsReceivedNotes.id, id))
      .limit(1);

    if (grnList.length === 0) {
      return NextResponse.json({ error: "Goods Received Note not found" }, { status: 404 });
    }

    const row = grnList[0];
    const items = await db
      .select()
      .from(grnItems)
      .where(eq(grnItems.grnId, row.grn.id));

    return NextResponse.json({
      success: true,
      data: formatGRN(row.grn, items, row.supplier),
    });
  } catch (error: any) {
    console.error("GET GRN by ID Error:", error);
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

    const updateData: any = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.remarks !== undefined) updateData.remarks = body.remarks;
    if (body.deliveryNoteNumber !== undefined) updateData.deliveryNoteNumber = body.deliveryNoteNumber;
    if (body.receivedDate !== undefined) updateData.receivedDate = body.receivedDate;
    if (body.warehouseId !== undefined) updateData.warehouseId = body.warehouseId;

    if (Object.keys(updateData).length > 0) {
      await db
        .update(goodsReceivedNotes)
        .set(updateData)
        .where(eq(goodsReceivedNotes.id, id));
    }

    const updated = await db
      .select({
        grn: goodsReceivedNotes,
        supplier: suppliers,
      })
      .from(goodsReceivedNotes)
      .leftJoin(suppliers, eq(goodsReceivedNotes.supplierId, suppliers.id))
      .where(eq(goodsReceivedNotes.id, id))
      .limit(1);

    if (updated.length === 0) {
      return NextResponse.json({ error: "GRN not found" }, { status: 404 });
    }

    const items = await db
      .select()
      .from(grnItems)
      .where(eq(grnItems.grnId, id));

    return NextResponse.json({
      success: true,
      data: formatGRN(updated[0].grn, items, updated[0].supplier),
    });
  } catch (error: any) {
    console.error("PUT GRN Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.delete(grnItems).where(eq(grnItems.grnId, id));
    await db.delete(goodsReceivedNotes).where(eq(goodsReceivedNotes.id, id));

    return NextResponse.json({
      success: true,
      message: "Goods Received Note deleted successfully",
    });
  } catch (error: any) {
    console.error("DELETE GRN Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
