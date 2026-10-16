import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { units } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const body = await req.json();
    const { name, shortName, baseUnit } = body;

    const updatedUnit = await db.update(units)
      .set({ name, shortName, baseUnit })
      .where(and(eq(units.id, params.id), eq(units.tenantId, tenantId)))
      .returning();

    if (updatedUnit.length === 0) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    return NextResponse.json(updatedUnit[0]);
  } catch (error: any) {
    console.error('Error updating unit:', error);
    return NextResponse.json({ error: 'Failed to update unit' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const deletedUnit = await db.delete(units)
      .where(and(eq(units.id, params.id), eq(units.tenantId, tenantId)))
      .returning();

    if (deletedUnit.length === 0) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting unit:', error);
    return NextResponse.json({ error: 'Failed to delete unit' }, { status: 500 });
  }
}
