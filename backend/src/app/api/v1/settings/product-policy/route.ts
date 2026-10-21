import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tenantSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifySession } from '@/lib/auth/session';

export async function GET(req: Request) {
  try {
    const session = await verifySession(req);
    if (!session || !session.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [settings] = await db.select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, session.tenantId));

    if (!settings) {
      return NextResponse.json({ businessType: 'Retail', productPolicy: {} });
    }

    return NextResponse.json({
      businessType: settings.businessType,
      productPolicy: settings.productPolicy,
    });
  } catch (error) {
    console.error('Failed to get product policy:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await verifySession(req);
    if (!session || !session.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { businessType, productPolicy } = body;

    if (!productPolicy || typeof productPolicy !== 'object') {
      return NextResponse.json({ error: 'productPolicy is required' }, { status: 400 });
    }

    const [existing] = await db.select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, session.tenantId));

    if (existing) {
      const current = (existing.productPolicy && typeof existing.productPolicy === 'object')
        ? existing.productPolicy as Record<string, unknown>
        : {};
      const merged = { ...current, ...productPolicy };
      const [updated] = await db.update(tenantSettings)
        .set({
          productPolicy: merged,
          updatedAt: new Date(),
        })
        .where(eq(tenantSettings.tenantId, session.tenantId))
        .returning();
      return NextResponse.json({ success: true, settings: updated });
    } else {
      const [inserted] = await db.insert(tenantSettings)
        .values({
          tenantId: session.tenantId,
          businessType: businessType || 'Retail',
          productPolicy,
        })
        .returning();
      return NextResponse.json({ success: true, settings: inserted });
    }
  } catch (error) {
    console.error('Failed to update product policy:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
