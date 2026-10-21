import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { brands } from '@/lib/db/product_schema';
import { eq, and } from 'drizzle-orm';
import { verifySession } from '@/lib/auth/session';

function mapBrand(row: { id: string; tenantId?: string; brandName: string }) {
  return { id: row.id, name: row.brandName, brandName: row.brandName };
}

export async function GET(req: Request) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    let rows = await db.select().from(brands).where(eq(brands.tenantId, tenantId));
    if (rows.length === 0) {
      const defaults = ['Almarai', 'Apple', 'Samsung', 'Nike', 'Nestle', 'Unilever', 'P&G', 'Pepsi', 'Coca-Cola', 'LG'];
      for (const brandName of defaults) {
        try {
          await db.insert(brands).values({ tenantId, brandName });
        } catch {
          continue;
        }
      }
      rows = await db.select().from(brands).where(eq(brands.tenantId, tenantId));
    }
    return NextResponse.json(rows.map(mapBrand));
  } catch (error: unknown) {
    console.error('Error fetching brands:', error);
    return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 });
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
    const name = String(body.name || body.brandName || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Brand name is required' }, { status: 400 });
    }

    const existing = await db.select().from(brands).where(
      and(eq(brands.tenantId, tenantId), eq(brands.brandName, name))
    );
    if (existing.length > 0) {
      return NextResponse.json(mapBrand(existing[0]));
    }

    const created = await db.insert(brands).values({
      tenantId,
      brandName: name
    }).returning();

    return NextResponse.json(mapBrand(created[0]), { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating brand:', error);
    return NextResponse.json({ error: 'Failed to create brand' }, { status: 500 });
  }
}
