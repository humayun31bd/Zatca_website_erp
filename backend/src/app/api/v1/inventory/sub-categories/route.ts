import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subCategories } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifySession } from '@/lib/auth/session';

export async function GET(req: Request) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');

    let allSubCategories;
    if (categoryId) {
      allSubCategories = await db.select().from(subCategories).where(and(eq(subCategories.tenantId, tenantId), eq(subCategories.categoryId, categoryId)));
    } else {
      allSubCategories = await db.select().from(subCategories).where(eq(subCategories.tenantId, tenantId));
    }
    return NextResponse.json(allSubCategories);
  } catch (error: any) {
    console.error('Error fetching sub-categories:', error);
    return NextResponse.json({ error: 'Failed to fetch sub-categories' }, { status: 500 });
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
    const { name, description, categoryId } = body;

    if (!name || !categoryId) {
      return NextResponse.json({ error: 'Name and categoryId are required' }, { status: 400 });
    }

    const newSubCategory = await db.insert(subCategories).values({
      tenantId,
      categoryId,
      name,
      description,
    }).returning();

    return NextResponse.json(newSubCategory[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating sub-category:', error);
    return NextResponse.json({ error: 'Failed to create sub-category' }, { status: 500 });
  }
}
