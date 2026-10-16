import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leaveRequests, employees } from '@/lib/db/hr_schema';
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

    let conditions = [eq(leaveRequests.tenantId, auth.tenantId)];
    if (employeeId) {
      conditions.push(eq(leaveRequests.employeeId, employeeId));
    }

    const data = await db.select({
      id: leaveRequests.id,
      employeeId: leaveRequests.employeeId,
      leaveType: leaveRequests.leaveType,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      durationDays: leaveRequests.durationDays,
      status: leaveRequests.status,
      reason: leaveRequests.reason,
      createdAt: leaveRequests.createdAt,
      firstName: employees.firstName,
      lastName: employees.lastName,
    })
    .from(leaveRequests)
    .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
    .where(and(...conditions))
    .orderBy(leaveRequests.createdAt);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch leave requests:', error);
    return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // In a real scenario, calculate durationDays properly (excluding weekends if necessary)
    const start = new Date(body.start_date);
    const end = new Date(body.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const newRequest = await db.insert(leaveRequests).values({
      tenantId: auth.tenantId,
      employeeId: body.employee_id,
      leaveType: body.leave_type,
      startDate: start,
      endDate: end,
      durationDays: Number(durationDays),
      status: 'PENDING',
      reason: body.reason,
    }).returning();

    return NextResponse.json(newRequest[0]);
  } catch (error) {
    console.error('Failed to create leave request:', error);
    return NextResponse.json({ error: 'Failed to create leave request' }, { status: 500 });
  }
}
