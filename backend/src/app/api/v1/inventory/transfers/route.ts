import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryTransfers, inventoryTransferItems } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

function formatTransfer(trf: any, items: any[] = []) {
  return {
    id: trf.id,
    tenantId: trf.tenantId,
    transferNumber: trf.transferNumber,
    fromWarehouseId: trf.fromWarehouseId,
    fromWarehouseName: trf.fromWarehouseName || "Source Location",
    toWarehouseId: trf.toWarehouseId,
    toWarehouseName: trf.toWarehouseName || "Destination Location",
    status: trf.status || "COMPLETED",
    transferDate: trf.transferDate instanceof Date ? trf.transferDate.toISOString() : (trf.transferDate || new Date().toISOString()),
    remarks: trf.remarks || "",
    createdAt: trf.createdAt instanceof Date ? trf.createdAt.toISOString() : (trf.createdAt || new Date().toISOString()),
    items: items.map((item) => ({
      id: item.id,
      transferId: item.transferId,
      productId: item.productId || null,
      productName: item.productName || "Product",
      quantity: Number(item.quantity ?? 0),
    })),
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId || "tenant-grocery-01";

    const transfers = await db
      .select()
      .from(inventoryTransfers)
      .where(eq(inventoryTransfers.tenantId, tenantId))
      .orderBy(desc(inventoryTransfers.createdAt));

    const result = [];
    for (const trf of transfers) {
      const items = await db
        .select()
        .from(inventoryTransferItems)
        .where(eq(inventoryTransferItems.transferId, trf.id));

      result.push(formatTransfer(trf, items));
    }

    return NextResponse.json({ success: true, data: result, transfers: result });
  } catch (error: any) {
    console.error("GET Transfers Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId || "tenant-grocery-01";
    const body = await req.json();

    const {
      transferNumber: customTransferNo,
      fromWarehouseId,
      fromWarehouseName,
      toWarehouseId,
      toWarehouseName,
      status,
      transferDate,
      remarks,
      items = [],
    } = body;

    if (!fromWarehouseId || !toWarehouseId) {
      return NextResponse.json({ error: "Source and destination locations are required" }, { status: 400 });
    }

    const transferNumber = customTransferNo?.trim() || `TRF-${Date.now().toString().slice(-6)}`;
    const newTrfId = crypto.randomUUID();

    const [newTrf] = await db
      .insert(inventoryTransfers)
      .values({
        id: newTrfId,
        tenantId,
        transferNumber,
        fromWarehouseId,
        fromWarehouseName: fromWarehouseName || "Source Location",
        toWarehouseId,
        toWarehouseName: toWarehouseName || "Destination Location",
        status: status || "COMPLETED",
        transferDate: transferDate || new Date().toISOString(),
        remarks: remarks || "",
      })
      .returning();

    const formattedItems = items.map((item: any) => ({
      id: crypto.randomUUID(),
      transferId: newTrfId,
      productId: item.productId || null,
      productName: item.productName || item.description || "Product",
      quantity: Number(item.quantity || 1),
    }));

    for (const item of formattedItems) {
      await db.insert(inventoryTransferItems).values(item);
    }

    return NextResponse.json({
      success: true,
      data: formatTransfer(newTrf, formattedItems),
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST Transfer Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
