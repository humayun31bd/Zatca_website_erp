import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices, invoiceLineItems, products } from '@/lib/db/schema';
import { eq, and, sql, desc, gte, lte } from 'drizzle-orm';
import { verifySession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifySession(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantId } = auth;
    
    // Parse date filters (optional)
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const invoiceConditions: any[] = [eq(invoices.tenantId, tenantId)];
    if (startDateParam) {
      invoiceConditions.push(gte(invoices.issueDatetime, new Date(startDateParam)));
    }
    if (endDateParam) {
      const e = new Date(endDateParam);
      e.setHours(23, 59, 59, 999);
      invoiceConditions.push(lte(invoices.issueDatetime, e));
    }
    
    // 1. Overall Revenue & Orders
    const statsResult = await db.select({
      totalRevenue: sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)`.mapWith(Number),
      totalOrders: sql<number>`COUNT(${invoices.id})`.mapWith(Number),
      totalVat: sql<number>`COALESCE(SUM(${invoices.totalVatAmount}), 0)`.mapWith(Number),
      totalDiscount: sql<number>`COALESCE(SUM(${invoices.discountAmount}), 0)`.mapWith(Number),
    })
    .from(invoices)
    .where(and(...invoiceConditions));

    const totalRevenue = statsResult[0]?.totalRevenue || 0;
    const totalOrders = statsResult[0]?.totalOrders || 0;
    const totalVat = statsResult[0]?.totalVat || 0;
    const totalDiscount = statsResult[0]?.totalDiscount || 0;
    const averageTicketSize = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // 2. Today's Revenue
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayResult = await db.select({
      todayRevenue: sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)`.mapWith(Number),
      todayOrders: sql<number>`COUNT(${invoices.id})`.mapWith(Number),
    })
    .from(invoices)
    .where(and(eq(invoices.tenantId, tenantId), gte(invoices.issueDatetime, startOfToday)));

    const todayRevenue = todayResult[0]?.todayRevenue || 0;
    const todayOrders = todayResult[0]?.todayOrders || 0;

    // 3. Top Selling Products (Flutter Revenue Report)
    const topProducts = await db.select({
      productId: products.id,
      name: sql<string>`COALESCE(${products.productName}, ${products.name}, 'Item')`.mapWith(String),
      totalQuantitySold: sql<number>`COALESCE(SUM(${invoiceLineItems.quantity}), 0)`.mapWith(Number),
      totalRevenue: sql<number>`COALESCE(SUM(${invoiceLineItems.lineTotal}), 0)`.mapWith(Number),
    })
    .from(invoiceLineItems)
    .innerJoin(invoices, eq(invoiceLineItems.invoiceId, invoices.id))
    .innerJoin(products, eq(invoiceLineItems.productId, products.id))
    .where(and(eq(invoices.tenantId, tenantId), ...invoiceConditions))
    .groupBy(products.id, products.productName, products.name)
    .orderBy(desc(sql`SUM(${invoiceLineItems.quantity})`))
    .limit(10);

    // 4. Low Stock Products (Flutter Inventory Report)
    const lowStock = await db.select({
      id: products.id,
      name: sql<string>`COALESCE(${products.productName}, ${products.name}, 'Item')`.mapWith(String),
      sku: sql<string>`COALESCE(${products.barcode}, ${products.sku}, 'N/A')`.mapWith(String),
      stockQuantity: sql<number>`COALESCE(${products.stockQuantity}, ${products.stockInHand}, 0)`.mapWith(Number),
      minStockLevel: sql<number>`COALESCE(${products.minStockLevel}, 5)`.mapWith(Number),
      price: sql<number>`COALESCE(${products.baseSellingPrice}, ${products.price}, 0)`.mapWith(Number),
    })
    .from(products)
    .where(and(
      eq(products.tenantId, tenantId),
      sql`COALESCE(${products.stockQuantity}, ${products.stockInHand}, 0) <= COALESCE(${products.minStockLevel}, 5)`
    ))
    .orderBy(products.stockQuantity)
    .limit(10);

    // 5. Recent POS Invoices
    const recentTransactions = await db.select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      buyerName: invoices.buyerName,
      totalAmount: invoices.totalAmount,
      zatcaStatus: invoices.zatcaStatus,
      paymentStatus: invoices.paymentStatus,
      paymentMethod: invoices.paymentMethod,
      issueDatetime: invoices.issueDatetime,
      deliveryType: invoices.deliveryType,
    })
    .from(invoices)
    .where(eq(invoices.tenantId, tenantId))
    .orderBy(desc(invoices.issueDatetime))
    .limit(6);

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders,
        totalVat: Math.round(totalVat * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        averageTicketSize: Math.round(averageTicketSize * 100) / 100,
        todayRevenue: Math.round(todayRevenue * 100) / 100,
        todayOrders,
        topProducts,
        lowStock,
        recentTransactions,
      }
    });

  } catch (error: any) {
    console.error('POS Dashboard Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
