import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, warehouses, inventoryTransfers, inventoryAdjustments, goodsReceivedNotes } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId || "tenant-grocery-01";

    const allProducts = await db
      .select()
      .from(products)
      .where(eq(products.tenantId, tenantId));

    let totalSkus = allProducts.length;
    let totalStockValue = 0;
    let lowStockCount = 0;

    const productBreakdown = allProducts.map((p: any) => {
      const stock = Number(p.stockQuantity ?? 0);
      const price = Number(p.purchasePrice ?? p.price ?? 0);
      const val = stock * price;

      totalStockValue += val;
      if (stock <= Number(p.alertQuantity || 5)) {
        lowStockCount++;
      }

      return {
        id: p.id,
        name: p.name,
        sku: p.sku || "N/A",
        category: p.categoryName || "General",
        stockQuantity: stock,
        unitPrice: price.toFixed(2),
        totalValuation: val.toFixed(2),
        isLowStock: stock <= Number(p.alertQuantity || 5),
      };
    });

    const locationList = await db
      .select()
      .from(warehouses)
      .where(eq(warehouses.tenantId, tenantId));

    const transfers = await db
      .select()
      .from(inventoryTransfers)
      .where(eq(inventoryTransfers.tenantId, tenantId))
      .orderBy(desc(inventoryTransfers.createdAt))
      .limit(10);

    const adjustments = await db
      .select()
      .from(inventoryAdjustments)
      .where(eq(inventoryAdjustments.tenantId, tenantId))
      .orderBy(desc(inventoryAdjustments.createdAt))
      .limit(10);

    const grns = await db
      .select()
      .from(goodsReceivedNotes)
      .where(eq(goodsReceivedNotes.tenantId, tenantId))
      .orderBy(desc(goodsReceivedNotes.createdAt))
      .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalSkus,
          totalStockValue: totalStockValue.toFixed(2),
          lowStockCount,
          totalLocations: locationList.length || 1,
        },
        products: productBreakdown,
        locations: locationList.map((loc: any) => ({
          id: loc.id,
          name: loc.name,
          code: loc.id.slice(0, 6),
          address: loc.location || "",
        })),
        recentMovements: {
          transfers: transfers.map((t) => ({
            id: t.id,
            number: t.transferNumber,
            from: t.fromWarehouseName,
            to: t.toWarehouseName,
            date: t.transferDate,
          })),
          adjustments: adjustments.map((a) => ({
            id: a.id,
            number: a.adjustmentNumber,
            location: a.warehouseName,
            reason: a.reason,
            date: a.adjustmentDate,
          })),
          grns: grns.map((g) => ({
            id: g.id,
            number: g.grnNumber,
            supplier: g.supplierId,
            date: g.receivedDate,
          })),
        },
      },
    });
  } catch (error: any) {
    console.error("GET Inventory Report Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
