import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { overtime } from '@/lib/db/hr_schema';
import { eq, and } from 'drizzle-orm';
import { verifySession as verifyAuth } from '@/lib/auth/session';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    const updated = await db.update(overtime)
      .set({ status: body.status })
      .where(and(eq(overtime.id, id), eq(overtime.tenantId, auth.tenantId)))
      .returning();

    if (!updated.length) {
      return NextResponse.json({ error: 'Overtime record not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Failed to update overtime record:', error);
    return NextResponse.json({ error: 'Failed to update overtime record' }, { status: 500 });
  }
}
