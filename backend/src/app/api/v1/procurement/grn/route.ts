import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { goodsReceivedNotes, grnItems, purchaseOrders, suppliers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { getNextDocumentNumber } from "@/lib/procurement/document_sequences";

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

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId =
      session?.tenantId ||
      req.headers.get("x-tenant-id") ||
      req.nextUrl.searchParams.get("tenantId") ||
      "336eaf82-a524-4b0a-9326-7197b1e5459e";

    const grnList = await db
      .select({
        grn: goodsReceivedNotes,
        supplier: suppliers,
      })
      .from(goodsReceivedNotes)
      .leftJoin(suppliers, eq(goodsReceivedNotes.supplierId, suppliers.id))
      .where(eq(goodsReceivedNotes.tenantId, tenantId))
      .orderBy(desc(goodsReceivedNotes.createdAt));

    const result = [];
    for (const row of grnList) {
      const items = await db
        .select()
        .from(grnItems)
        .where(eq(grnItems.grnId, row.grn.id));

      result.push(formatGRN(row.grn, items, row.supplier));
    }

    return NextResponse.json({ success: true, data: result, grnList: result });
  } catch (error: any) {
    console.error("GET GRN Error:", error);
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
      poId,
      poNumber,
      supplierId,
      warehouseId,
      receivedDate,
      deliveryNoteNumber,
      remarks,
      items = [],
    } = body;

    if (!supplierId) {
      return NextResponse.json({ error: "Supplier ID is required" }, { status: 400 });
    }

    const finalGrnNumber =
      body.grnNumber || (await getNextDocumentNumber(tenantId, 'GRN', receivedDate)).documentNumber;
    const newGrnId = crypto.randomUUID();

    const [newGrn] = await db
      .insert(goodsReceivedNotes)
      .values({
        id: newGrnId,
        tenantId,
        grnNumber: finalGrnNumber,
        poId: poId || null,
        poNumber: poNumber || null,
        supplierId,
        warehouseId: warehouseId || null,
        receivedDate: receivedDate || new Date().toISOString(),
        status: "RECEIVED",
        deliveryNoteNumber: deliveryNoteNumber || "",
        remarks: remarks || "",
      })
      .returning();

    const formattedItems = items.map((item: any) => ({
      id: crypto.randomUUID(),
      grnId: newGrnId,
      productId: item.productId || null,
      description: item.description || "Received Item",
      orderedQuantity: Number(item.orderedQuantity || 0),
      receivedQuantity: Number(item.receivedQuantity || 0),
      unitPrice: Number(item.unitPrice || 0),
    }));

    for (const item of formattedItems) {
      await db.insert(grnItems).values(item);
    }

    // Update PO status to PARTIAL_RECEIVED or RECEIVED if poId present
    if (poId) {
      await db.update(purchaseOrders).set({ status: "RECEIVED" }).where(eq(purchaseOrders.id, poId));
    }

    const supplier = await db.select().from(suppliers).where(eq(suppliers.id, supplierId)).get();

    return NextResponse.json({
      success: true,
      data: formatGRN(newGrn, formattedItems, supplier),
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST GRN Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
