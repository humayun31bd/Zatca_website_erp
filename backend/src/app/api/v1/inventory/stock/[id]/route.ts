import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifySession } from '@/lib/auth/session';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req as any);
    if (!session || !session.tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }
    const tenantId = session.tenantId as string;

    const body = await req.json();
    const { stockQuantity, minStockLevel } = body;

    const updatedProduct = await db.update(products)
      .set({ 
        ...(stockQuantity !== undefined && { stockQuantity: parseInt(stockQuantity, 10) }),
        ...(minStockLevel !== undefined && { minStockLevel: parseInt(minStockLevel, 10) }),
      })
      .where(and(eq(products.id, params.id), eq(products.tenantId, tenantId)))
      .returning();

    if (updatedProduct.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(updatedProduct[0]);
  } catch (error: any) {
    console.error('Error updating stock:', error);
    return NextResponse.json({ error: 'Failed to update stock' }, { status: 500 });
  }
}
