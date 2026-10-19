import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryTransfers, inventoryTransferItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId || "tenant-grocery-01";
    const { id } = await params;

    const [trf] = await db
      .select()
      .from(inventoryTransfers)
      .where(and(eq(inventoryTransfers.id, id), eq(inventoryTransfers.tenantId, tenantId)))
      .limit(1);

    if (!trf) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    const items = await db
      .select()
      .from(inventoryTransferItems)
      .where(eq(inventoryTransferItems.transferId, trf.id));

    return NextResponse.json({ success: true, data: formatTransfer(trf, items) });
  } catch (error: any) {
    console.error("GET Transfer [id] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId || "tenant-grocery-01";
    const { id } = await params;
    const body = await req.json();

    const [existing] = await db
      .select()
      .from(inventoryTransfers)
      .where(and(eq(inventoryTransfers.id, id), eq(inventoryTransfers.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    const updateFields: any = {};
    if (body.status !== undefined) updateFields.status = body.status;
    if (body.remarks !== undefined) updateFields.remarks = body.remarks;

    const [updated] = await db
      .update(inventoryTransfers)
      .set(updateFields)
      .where(and(eq(inventoryTransfers.id, id), eq(inventoryTransfers.tenantId, tenantId)))
      .returning();

    const items = await db
      .select()
      .from(inventoryTransferItems)
      .where(eq(inventoryTransferItems.transferId, updated.id));

    return NextResponse.json({ success: true, data: formatTransfer(updated, items) });
  } catch (error: any) {
    console.error("PUT Transfer [id] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
