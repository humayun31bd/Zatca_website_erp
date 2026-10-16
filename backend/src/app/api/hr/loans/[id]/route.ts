import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { loans } from '@/lib/db/hr_schema';
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

    const updated = await db.update(loans)
      .set({ status: body.status })
      .where(and(eq(loans.id, id), eq(loans.tenantId, auth.tenantId)))
      .returning();

    if (!updated.length) {
      return NextResponse.json({ error: 'Loan record not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Failed to update loan record:', error);
    return NextResponse.json({ error: 'Failed to update loan record' }, { status: 500 });
  }
}
