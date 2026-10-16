// @ts-nocheck
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payroll, employees, attendance, loans } from '@/lib/db/hr_schema';
import { eq, and } from 'drizzle-orm';
import { verifySession as verifyAuth } from '@/lib/auth/session';

export async function GET(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    let conditions = [eq(payroll.tenantId, auth.tenantId)];

    if (month) conditions.push(eq(payroll.month, parseInt(month)));
    if (year) conditions.push(eq(payroll.year, parseInt(year)));

    const data = await db.select({
      id: payroll.id,
      employeeId: payroll.employeeId,
      month: payroll.month,
      year: payroll.year,
      basicSalary: payroll.basicSalary,
      allowances: payroll.allowances,
      deductions: payroll.deductions,
      netSalary: payroll.netSalary,
      status: payroll.status,
      firstName: employees.firstName,
      lastName: employees.lastName,
    })
    .from(payroll)
    .innerJoin(employees, eq(payroll.employeeId, employees.id))
    .where(and(...conditions));
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch payroll:', error);
    return NextResponse.json({ error: 'Failed to fetch payroll' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { month, year } = body;

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 });
    }

    // Get all active employees
    const activeEmployees = await db.select().from(employees).where(
      and(
        eq(employees.tenantId, auth.tenantId),
        eq(employees.status, 'ACTIVE')
      )
    );

    const generatedSlips = [];

    // Simple payroll generation logic
    for (const emp of activeEmployees) {
      const basic = Number(emp.basicSalary || 0);
      
      // Calculate absences for the month
      // This is a naive implementation; assuming basic is monthly, dividing by 30 for daily rate
      const dailyRate = basic / 30;
      let absenceDeductions = 0;
      
      // Retrieve attendance for the specific month/year
      const empAttendance = await db.select().from(attendance).where(
        and(
          eq(attendance.tenantId, auth.tenantId),
          eq(attendance.employeeId, emp.id)
        )
      );

      const absences = empAttendance.filter(a => 
        a.date.getMonth() + 1 === month && 
        a.date.getFullYear() === year && 
        a.status === 'ABSENT'
      ).length;

      absenceDeductions = absences * dailyRate;

      // Active loans calculation
      const empLoans = await db.select().from(loans).where(
        and(
          eq(loans.tenantId, auth.tenantId),
          eq(loans.employeeId, emp.id),
          eq(loans.status, 'ACTIVE')
        )
      );

      let loanDeductions = 0;
      for (const loan of empLoans) {
        let installment = parseFloat(loan.monthlyInstallment || '0');
        let remaining = parseFloat(loan.remainingAmount || '0');
        
        if (remaining > 0) {
          const deduction = remaining >= installment ? installment : remaining;
          loanDeductions += deduction;
          
          const newRemaining = remaining - deduction;
          const newStatus = newRemaining <= 0 ? 'COMPLETED' : 'ACTIVE';
          
          await db.update(loans)
            .set({ remainingAmount: newRemaining, status: newStatus })
            .where(eq(loans.id, loan.id));
        }
      }

      const totalDeductions = absenceDeductions + loanDeductions;
      const net = basic - totalDeductions;

      try {
        const slip = await db.insert(payroll).values({
          tenantId: auth.tenantId,
          employeeId: emp.id,
          month: month,
          year: year,
          basicSalary: basic,
          deductions: totalDeductions,
          allowances: 0,
          netSalary: Number(net),
          paymentMethod: emp.paymentMethod,
          status: 'DRAFT',
        }).returning();
        
        generatedSlips.push(slip[0]);
      } catch (e: any) {
        // Skip if already generated (unique constraint error)
        if (e.code !== '23505') throw e; 
      }
    }

    return NextResponse.json({ message: 'Payroll generated', count: generatedSlips.length });
  } catch (error) {
    console.error('Failed to generate payroll:', error);
    return NextResponse.json({ error: 'Failed to generate payroll' }, { status: 500 });
  }
}
