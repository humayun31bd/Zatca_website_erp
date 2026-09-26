import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices, invoiceLineItems, products } from '@/lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { verifySession } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifySession(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantId } = auth;
    
    // Parse date filters (optional)
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    
    // Total Revenue
    const revenueResult = await db.select({
      totalRevenue: sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)`.mapWith(Number)
    })
    .from(invoices)
    .where(and(
      eq(invoices.tenantId, tenantId),
      // Add date filters if provided...
      // ...
    ));

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    // Top Selling Products (Inventory Report / Revenue Report)
    const topProducts = await db.select({
      productId: products.id,
      name: products.name,
      totalQuantitySold: sql<number>`SUM(${invoiceLineItems.quantity})`.mapWith(Number),
      totalRevenue: sql<number>`SUM(${invoiceLineItems.lineTotal})`.mapWith(Number),
    })
    .from(invoiceLineItems)
    .innerJoin(invoices, eq(invoiceLineItems.invoiceId, invoices.id))
    .innerJoin(products, eq(invoiceLineItems.productId, products.id))
    .where(eq(invoices.tenantId, tenantId))
    .groupBy(products.id, products.name)
    .orderBy(desc(sql`SUM(${invoiceLineItems.quantity})`))
    .limit(10);

    // Low Stock Products
    const lowStock = await db.select({
      id: products.id,
      name: products.name,
      stockQuantity: products.stockQuantity,
      minStockLevel: products.minStockLevel,
    })
    .from(products)
    .where(and(
      eq(products.tenantId, tenantId),
      sql`${products.stockQuantity} <= ${products.minStockLevel}`
    ))
    .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        topProducts,
        lowStock,
      }
    });

  } catch (error) {
    console.error('POS Dashboard Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
