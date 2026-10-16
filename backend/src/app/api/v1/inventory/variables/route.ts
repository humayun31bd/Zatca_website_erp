import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { variationTemplates, variationValues } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const allTemplates = await db.select().from(variationTemplates).where(eq(variationTemplates.tenantId, tenantId));
    
    if (allTemplates.length === 0) {
        return NextResponse.json([]);
    }
    
    const templateIds = allTemplates.map(t => t.id);
    const allValues = await db.select().from(variationValues).where(inArray(variationValues.templateId, templateIds));

    const result = allTemplates.map(t => ({
        ...t,
        values: allValues.filter(v => v.templateId === t.id)
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching variables:', error);
    return NextResponse.json({ error: 'Failed to fetch variables' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const body = await req.json();
    const { name, values } = body; // values is array of strings

    if (!name || !values || !Array.isArray(values) || values.length === 0) {
      return NextResponse.json({ error: 'Name and at least one value are required' }, { status: 400 });
    }

    const newTemplate = await db.insert(variationTemplates).values({
      tenantId,
      name,
    }).returning();

    const templateId = newTemplate[0].id;

    const valuesToInsert = values.map((val: string) => ({
      tenantId,
      templateId,
      value: val
    }));

    const insertedValues = await db.insert(variationValues).values(valuesToInsert).returning();

    return NextResponse.json({
        ...newTemplate[0],
        values: insertedValues
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating variable:', error);
    return NextResponse.json({ error: 'Failed to create variable' }, { status: 500 });
  }
}
