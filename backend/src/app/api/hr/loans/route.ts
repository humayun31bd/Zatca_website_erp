import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { loans, employees } from '@/lib/db/hr_schema';
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

    let conditions = [eq(loans.tenantId, auth.tenantId)];
    if (employeeId) {
      conditions.push(eq(loans.employeeId, employeeId));
    }

    const data = await db.select({
      id: loans.id,
      employeeId: loans.employeeId,
      amount: loans.amount,
      monthlyInstallment: loans.monthlyInstallment,
      remainingAmount: loans.remainingAmount,
      status: loans.status,
      reason: loans.reason,
      createdAt: loans.createdAt,
      firstName: employees.firstName,
      lastName: employees.lastName,
    })
    .from(loans)
    .innerJoin(employees, eq(loans.employeeId, employees.id))
    .where(and(...conditions))
    .orderBy(loans.createdAt);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch loans:', error);
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const amount = parseFloat(body.amount);
    const monthlyInstallment = parseFloat(body.monthly_installment);
    
    if (amount <= 0 || monthlyInstallment <= 0) {
      return NextResponse.json({ error: 'Amount and installment must be greater than zero.' }, { status: 400 });
    }

    const newRequest = await db.insert(loans).values({
      tenantId: auth.tenantId,
      employeeId: body.employee_id,
      amount: Number(amount),
      monthlyInstallment: Number(monthlyInstallment),
      remainingAmount: Number(amount),
      status: 'PENDING',
      reason: body.reason,
    }).returning();

    return NextResponse.json(newRequest[0]);
  } catch (error) {
    console.error('Failed to request loan:', error);
    return NextResponse.json({ error: 'Failed to request loan' }, { status: 500 });
  }
}
