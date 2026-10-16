import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subCategories } from '@/lib/db/schema';
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
    const { name, description, categoryId } = body;

    const updatedSubCategory = await db.update(subCategories)
      .set({ name, description, categoryId })
      .where(and(eq(subCategories.id, params.id), eq(subCategories.tenantId, tenantId)))
      .returning();

    if (updatedSubCategory.length === 0) {
      return NextResponse.json({ error: 'Sub-category not found' }, { status: 404 });
    }

    return NextResponse.json(updatedSubCategory[0]);
  } catch (error: any) {
    console.error('Error updating sub-category:', error);
    return NextResponse.json({ error: 'Failed to update sub-category' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const deletedSubCategory = await db.delete(subCategories)
      .where(and(eq(subCategories.id, params.id), eq(subCategories.tenantId, tenantId)))
      .returning();

    if (deletedSubCategory.length === 0) {
      return NextResponse.json({ error: 'Sub-category not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting sub-category:', error);
    return NextResponse.json({ error: 'Failed to delete sub-category' }, { status: 500 });
  }
}
