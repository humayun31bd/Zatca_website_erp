import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { overtime, employees } from '@/lib/db/hr_schema';
import { eq, and } from 'drizzle-orm';
import { verifySession as verifyAuth } from '@/lib/auth/session';

export async function GET(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    let conditions = [eq(overtime.tenantId, auth.tenantId)];
    if (employeeId) {
      conditions.push(eq(overtime.employeeId, employeeId));
    }

    const data = await db.select({
      id: overtime.id,
      employeeId: overtime.employeeId,
      date: overtime.date,
      hours: overtime.hours,
      status: overtime.status,
      reason: overtime.reason,
      createdAt: overtime.createdAt,
      firstName: employees.firstName,
      lastName: employees.lastName,
    })
    .from(overtime)
    .innerJoin(employees, eq(overtime.employeeId, employees.id))
    .where(and(...conditions))
    .orderBy(overtime.date);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch overtime:', error);
    return NextResponse.json({ error: 'Failed to fetch overtime' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const hours = parseFloat(body.hours);
    
    if (hours > 2) {
      return NextResponse.json({ error: 'Overtime limit exceeded. Max 2 hours per day.' }, { status: 400 });
    }

    const newRequest = await db.insert(overtime).values({
      tenantId: auth.tenantId,
      employeeId: body.employee_id,
      date: new Date(body.date),
      hours: Number(hours),
      status: 'PENDING',
      reason: body.reason,
    }).returning();

    return NextResponse.json(newRequest[0]);
  } catch (error) {
    console.error('Failed to log overtime:', error);
    return NextResponse.json({ error: 'Failed to log overtime' }, { status: 500 });
  }
}
