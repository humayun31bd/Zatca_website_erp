import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryAdjustments, inventoryAdjustmentItems } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

function formatAdjustment(adj: any, items: any[] = []) {
  return {
    id: adj.id,
    tenantId: adj.tenantId,
    adjustmentNumber: adj.adjustmentNumber,
    warehouseId: adj.warehouseId,
    warehouseName: adj.warehouseName || "Location",
    reason: adj.reason || "OTHER",
    status: adj.status || "APPROVED",
    adjustedBy: adj.adjustedBy || "Manager",
    adjustmentDate: adj.adjustmentDate instanceof Date ? adj.adjustmentDate.toISOString() : (adj.adjustmentDate || new Date().toISOString()),
    remarks: adj.remarks || "",
    createdAt: adj.createdAt instanceof Date ? adj.createdAt.toISOString() : (adj.createdAt || new Date().toISOString()),
    items: items.map((item) => ({
      id: item.id,
      adjustmentId: item.adjustmentId,
      productId: item.productId || null,
      productName: item.productName || "Product",
      adjustmentType: item.adjustmentType || "SUBTRACT",
      quantity: Number(item.quantity ?? 0),
    })),
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId || "tenant-grocery-01";

    const adjustments = await db
      .select()
      .from(inventoryAdjustments)
      .where(eq(inventoryAdjustments.tenantId, tenantId))
      .orderBy(desc(inventoryAdjustments.createdAt));

    const result = [];
    for (const adj of adjustments) {
      const items = await db
        .select()
        .from(inventoryAdjustmentItems)
        .where(eq(inventoryAdjustmentItems.adjustmentId, adj.id));

      result.push(formatAdjustment(adj, items));
    }

    return NextResponse.json({ success: true, data: result, adjustments: result });
  } catch (error: any) {
    console.error("GET Adjustments Error:", error);
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
      warehouseId,
      warehouseName,
      reason,
      adjustedBy,
      adjustmentDate,
      remarks,
      items = [],
    } = body;

    if (!warehouseId || !reason) {
      return NextResponse.json({ error: "Location and adjustment reason are required" }, { status: 400 });
    }

    const adjustmentNumber = `ADJ-${Date.now().toString().slice(-6)}`;
    const newAdjId = crypto.randomUUID();

    const [newAdj] = await db
      .insert(inventoryAdjustments)
      .values({
        id: newAdjId,
        tenantId,
        adjustmentNumber,
        warehouseId,
        warehouseName: warehouseName || "Main Warehouse",
        reason: reason || "AUDIT_CORRECTION",
        status: "APPROVED",
        adjustedBy: adjustedBy || "Manager",
        adjustmentDate: adjustmentDate || new Date().toISOString(),
        remarks: remarks || "",
      })
      .returning();

    const formattedItems = items.map((item: any) => ({
      id: crypto.randomUUID(),
      adjustmentId: newAdjId,
      productId: item.productId || null,
      productName: item.productName || item.description || "Product",
      adjustmentType: item.adjustmentType || "SUBTRACT",
      quantity: Number(item.quantity || 1),
    }));

    for (const item of formattedItems) {
      await db.insert(inventoryAdjustmentItems).values(item);
    }

    return NextResponse.json({
      success: true,
      data: formatAdjustment(newAdj, formattedItems),
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST Adjustment Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
