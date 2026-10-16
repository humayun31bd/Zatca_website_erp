import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifySession } from '@/lib/auth/session';

export async function GET(req: Request) {
  try {
    const session = await verifySession(req as any);
    if (!session || !session.tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }
    const tenantId = session.tenantId as string;

    const allProducts = await db.select({
      id: products.id,
      name: products.name,
      barcode: products.barcode,
      brand: products.brandId,
      stockQuantity: products.stockQuantity,
      minStockLevel: products.minStockLevel,
    }).from(products).where(eq(products.tenantId, tenantId));
    
    return NextResponse.json(allProducts);
  } catch (error: any) {
    console.error('Error fetching stock:', error);
    return NextResponse.json({ error: 'Failed to fetch stock' }, { status: 500 });
  }
}
