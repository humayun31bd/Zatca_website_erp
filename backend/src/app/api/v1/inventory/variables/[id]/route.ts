import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { variationTemplates, variationValues } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const body = await req.json();
    const { name, values } = body;

    const updatedTemplate = await db.update(variationTemplates)
      .set({ name })
      .where(and(eq(variationTemplates.id, params.id), eq(variationTemplates.tenantId, tenantId)))
      .returning();

    if (updatedTemplate.length === 0) {
      return NextResponse.json({ error: 'Variable not found' }, { status: 404 });
    }

    // Replace values: delete all old, insert new
    await db.delete(variationValues).where(eq(variationValues.templateId, params.id));

    let insertedValues: any[] = [];
    if (values && Array.isArray(values) && values.length > 0) {
        const valuesToInsert = values.map((val: string) => ({
            tenantId,
            templateId: params.id,
            value: val
        }));
        insertedValues = await db.insert(variationValues).values(valuesToInsert).returning();
    }

    return NextResponse.json({
        ...updatedTemplate[0],
        values: insertedValues
    });
  } catch (error: any) {
    console.error('Error updating variable:', error);
    return NextResponse.json({ error: 'Failed to update variable' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const deletedTemplate = await db.delete(variationTemplates)
      .where(and(eq(variationTemplates.id, params.id), eq(variationTemplates.tenantId, tenantId)))
      .returning();

    if (deletedTemplate.length === 0) {
      return NextResponse.json({ error: 'Variable not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting variable:', error);
    return NextResponse.json({ error: 'Failed to delete variable' }, { status: 500 });
  }
}
