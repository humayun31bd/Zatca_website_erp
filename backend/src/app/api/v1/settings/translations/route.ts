import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tenantTranslations } from '@/lib/db/schema';
import { verifySession as getSession } from '@/lib/auth/session';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.tenantId) {
      return NextResponse.json({});
    }

    const translations = await db.select().from(tenantTranslations).where(eq(tenantTranslations.tenantId, session.tenantId));

    // Convert array to a key-value map for easy consumption on frontend
    const translationsMap: Record<string, { en: string, ar: string }> = {};
    for (const t of translations) {
      translationsMap[t.key] = { en: t.enValue, ar: t.arValue };
    }

    return NextResponse.json(translationsMap);
  } catch (error) {
    console.error('Failed to fetch translations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const UpdateTranslationSchema = z.object({
  key: z.string(),
  en: z.string(),
  ar: z.string()
});

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = UpdateTranslationSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { key, en, ar } = result.data;

    // Insert or update translation for the tenant
    const existing = await db.select().from(tenantTranslations)
      .where(and(eq(tenantTranslations.tenantId, session.tenantId), eq(tenantTranslations.key, key)))
      .limit(1);

    if (existing.length > 0) {
      await db.update(tenantTranslations)
        .set({ enValue: en, arValue: ar, updatedAt: new Date() })
        .where(eq(tenantTranslations.id, existing[0].id));
    } else {
      await db.insert(tenantTranslations).values({
        tenantId: session.tenantId,
        key: key,
        enValue: en,
        arValue: ar
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update translation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
