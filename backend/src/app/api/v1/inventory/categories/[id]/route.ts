import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifySession } from '@/lib/auth/session';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const body = await req.json();
    const { name, description } = body;

    const updatedCategory = await db.update(categories)
      .set({ name, description })
      .where(and(eq(categories.id, params.id), eq(categories.tenantId, tenantId)))
      .returning();

    if (updatedCategory.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(updatedCategory[0]);
  } catch (error: any) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const deletedCategory = await db.delete(categories)
      .where(and(eq(categories.id, params.id), eq(categories.tenantId, tenantId)))
      .returning();

    if (deletedCategory.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
