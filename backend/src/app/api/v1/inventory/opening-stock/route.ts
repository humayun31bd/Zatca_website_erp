import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { openingStock, products } from "@/lib/db/product_schema";
import { eq, and, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const session = await verifySession(request);
    if (!session || !session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = session.tenantId as string;

    const records = await db.select({
      openingStockId: openingStock.openingStockId,
      productId: openingStock.productId,
      quantity: openingStock.quantity,
      warehouseId: openingStock.warehouseId,
      locationBin: openingStock.locationBin,
      createdAt: openingStock.createdAt,
      updatedAt: openingStock.updatedAt,
      productName: products.name,
      sku: products.sku,
      barcode: products.barcode,
      price: products.price,
      costPrice: products.costPrice,
      currentStock: products.stockQuantity,
    })
    .from(openingStock)
    .innerJoin(products, eq(openingStock.productId, products.id))
    .where(eq(openingStock.tenantId, tenantId))
    .orderBy(desc(openingStock.createdAt));

    return NextResponse.json(records);
  } catch (error: any) {
    console.error("GET Opening Stock error:", error);
    return NextResponse.json({ error: "Failed to fetch opening stock", details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession(request);
    if (!session || !session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = session.tenantId as string;

    const body = await request.json();
    const items = Array.isArray(body) ? body : [body];

    const results = [];
    for (const item of items) {
      if (!item.productId || item.quantity === undefined) continue;

      const qty = parseInt(item.quantity) || 0;
      const warehouseId = item.warehouseId || null;
      const locationBin = item.locationBin || null;
      const costPrice = item.costPrice !== undefined && item.costPrice !== null && item.costPrice !== '' ? parseFloat(item.costPrice) : undefined;

      // Check existing entry
      const existing = await db.select().from(openingStock)
        .where(and(
          eq(openingStock.tenantId, tenantId),
          eq(openingStock.productId, item.productId),
          warehouseId ? eq(openingStock.warehouseId, warehouseId) : eq(openingStock.productId, item.productId)
        )).limit(1);

      let savedRecord;
      if (existing.length > 0) {
        [savedRecord] = await db.update(openingStock)
          .set({
            quantity: qty,
            warehouseId: warehouseId,
            locationBin: locationBin,
            updatedAt: new Date(),
          })
          .where(eq(openingStock.openingStockId, existing[0].openingStockId))
          .returning();
      } else {
        [savedRecord] = await db.insert(openingStock).values({
          tenantId,
          productId: item.productId,
          quantity: qty,
          warehouseId: warehouseId,
          locationBin: locationBin,
        }).returning();
      }

      // Also update stockQuantity (and optionally costPrice) on product
      const productUpdate: any = {
        stockQuantity: qty,
        stockInHand: qty,
        updatedAt: new Date(),
      };
      if (costPrice !== undefined && !isNaN(costPrice)) {
        productUpdate.costPrice = costPrice;
      }

      await db.update(products)
        .set(productUpdate)
        .where(and(eq(products.id, item.productId), eq(products.tenantId, tenantId)));

      results.push(savedRecord);
    }

    return NextResponse.json(results, { status: 201 });
  } catch (error: any) {
    console.error("POST Opening Stock error:", error);
    return NextResponse.json({ error: "Failed to save opening stock", details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await verifySession(request);
    if (!session || !session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = session.tenantId as string;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await db.delete(openingStock)
      .where(and(eq(openingStock.openingStockId, id), eq(openingStock.tenantId, tenantId)));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Opening Stock error:", error);
    return NextResponse.json({ error: "Failed to delete opening stock" }, { status: 500 });
  }
}
