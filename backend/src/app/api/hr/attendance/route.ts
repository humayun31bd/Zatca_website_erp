import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { attendance } from '@/lib/db/hr_schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { verifySession as verifyAuth } from '@/lib/auth/session';

export async function GET(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let conditions = [eq(attendance.tenantId, auth.tenantId)];

    if (employeeId) {
      conditions.push(eq(attendance.employeeId, employeeId));
    }
    
    if (startDate) {
      conditions.push(gte(attendance.date, new Date(startDate)));
    }
    
    if (endDate) {
      conditions.push(lte(attendance.date, new Date(endDate)));
    }

    const data = await db.select().from(attendance).where(and(...conditions));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch attendance:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const newRecord = await db.insert(attendance).values({
      ...body,
      tenantId: auth.tenantId,
      date: new Date(body.date),
      checkIn: body.check_in ? new Date(body.check_in) : null,
      checkOut: body.check_out ? new Date(body.check_out) : null,
    }).returning();

    return NextResponse.json(newRecord[0]);
  } catch (error) {
    console.error('Failed to record attendance:', error);
    return NextResponse.json({ error: 'Failed to record attendance' }, { status: 500 });
  }
}
