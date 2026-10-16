import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { units } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifySession } from '@/lib/auth/session';

export async function GET(req: Request) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const allUnits = await db.select().from(units).where(eq(units.tenantId, tenantId));
    return NextResponse.json(allUnits);
  } catch (error: any) {
    console.error('Error fetching units:', error);
    return NextResponse.json({ error: 'Failed to fetch units' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const body = await req.json();
    const { name, shortName, baseUnit } = body;

    if (!name || !shortName) {
      return NextResponse.json({ error: 'Name and shortName are required' }, { status: 400 });
    }

    const newUnit = await db.insert(units).values({
      tenantId,
      name,
      shortName,
      baseUnit: baseUnit ?? true,
    }).returning();

    return NextResponse.json(newUnit[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating unit:', error);
    return NextResponse.json({ error: 'Failed to create unit', details: error?.message || String(error) }, { status: 500 });
  }
}
