import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payroll, employees, attendance, overtime, loans } from "@/lib/db/hr_schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const month = parseInt(searchParams.get("month") || `${new Date().getMonth() + 1}`, 10);
    const year = parseInt(searchParams.get("year") || `${new Date().getFullYear()}`, 10);
    const dept = searchParams.get("department");
    const status = searchParams.get("status");

    const conditions = [
      eq(payroll.tenantId, session.tenantId as string),
      eq(payroll.month, month),
      eq(payroll.year, year),
    ];

    if (dept && dept !== 'ALL') {
      conditions.push(eq(payroll.departmentName, dept));
    }
    if (status && status !== 'ALL') {
      conditions.push(eq(payroll.status, status));
    }

    const records = await db
      .select({
        id: payroll.id,
        tenantId: payroll.tenantId,
        employeeId: payroll.employeeId,
        month: payroll.month,
        year: payroll.year,
        basicSalary: payroll.basicSalary,
        housingAllowance: payroll.housingAllowance,
        transportAllowance: payroll.transportAllowance,
        otherAllowance: payroll.otherAllowance,
        allowances: payroll.allowances,
        overtimeHours: payroll.overtimeHours,
        overtimePay: payroll.overtimePay,
        presentDays: payroll.presentDays,
        absentDays: payroll.absentDays,
        lateDays: payroll.lateDays,
        finesPenalties: payroll.finesPenalties,
        loanDeduction: payroll.loanDeduction,
        gosiDeduction: payroll.gosiDeduction,
        deductions: payroll.deductions,
        netSalary: payroll.netSalary,
        startDate: payroll.startDate,
        endDate: payroll.endDate,
        paymentDate: payroll.paymentDate,
        paymentMethod: payroll.paymentMethod,
        status: payroll.status,
        departmentName: payroll.departmentName,
        createdAt: payroll.createdAt,
        updatedAt: payroll.updatedAt,
        // Joined Employee Fields
        firstName: employees.firstName,
        lastName: employees.lastName,
        email: employees.email,
        phone: employees.phone,
        designationName: employees.designationName,
        nationalId: employees.nationalId,
        gosiNumber: employees.gosiNumber,
        bankIban: employees.address, // fallback placeholder
      })
      .from(payroll)
      .leftJoin(employees, eq(payroll.employeeId, employees.id))
      .where(and(...conditions))
      .orderBy(desc(payroll.createdAt));

    return NextResponse.json(records);
  } catch (error: any) {
    console.error("GET Payroll Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const month = parseInt(body.month || `${new Date().getMonth() + 1}`, 10);
    const year = parseInt(body.year || `${new Date().getFullYear()}`, 10);
    const targetDepartment = body.departmentName || body.department || null;
    const startDateStr = body.startDate || null;
    const endDateStr = body.endDate || null;

    let periodStart: Date;
    let periodEnd: Date;
    if (startDateStr && endDateStr) {
      periodStart = new Date(startDateStr);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(endDateStr);
      periodEnd.setHours(23, 59, 59, 999);
    } else {
      periodStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
      periodEnd = new Date(year, month, 0, 23, 59, 59, 999);
    }

    const finalStartDate = startDateStr || `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const finalEndDate = endDateStr || `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

    // Fetch active employees
    const empConditions = [
      eq(employees.tenantId, session.tenantId as string),
      eq(employees.status, 'ACTIVE'),
    ];
    if (targetDepartment && targetDepartment !== 'ALL') {
      empConditions.push(eq(employees.departmentName, targetDepartment));
    }

    const activeEmployees = await db
      .select()
      .from(employees)
      .where(and(...empConditions));

    if (activeEmployees.length === 0) {
      return NextResponse.json({ message: "No active employees found to generate payroll" }, { status: 200 });
    }

    const generatedRecords = [];

    for (const emp of activeEmployees) {
      const basic = emp.basicSalary || 0;
      const housing = emp.housingAllowance || 0;
      const transport = emp.transportAllowance || 0;
      const other = emp.otherAllowance || 0;

      // 1. Calculate Overtime for the period
      const empOvertimes = await db
        .select()
        .from(overtime)
        .where(
          and(
            eq(overtime.tenantId, session.tenantId as string),
            eq(overtime.employeeId, emp.id),
            eq(overtime.status, 'APPROVED')
          )
        );

      let totalOtHours = 0;
      for (const ot of empOvertimes) {
        if (ot.date) {
          const d = new Date(ot.date);
          if (d >= periodStart && d <= periodEnd) {
            totalOtHours += ot.hours;
          }
        }
      }
      // OT hourly rate = (Basic / 30 / 8) * 1.5
      const hourlyRate = (basic > 0) ? (basic / 240) * 1.5 : 0;
      const overtimePay = Math.round(totalOtHours * hourlyRate * 100) / 100;

      // 2. Attendance Summary for the period
      const empAttendance = await db
        .select()
        .from(attendance)
        .where(
          and(
            eq(attendance.tenantId, session.tenantId as string),
            eq(attendance.employeeId, emp.id)
          )
        );

      let presentDays = 0;
      let absentDays = 0;
      let lateDays = 0;
      for (const att of empAttendance) {
        if (att.date) {
          const d = new Date(att.date);
          if (d >= periodStart && d <= periodEnd) {
            if (att.status === 'PRESENT') presentDays++;
            else if (att.status === 'ABSENT') absentDays++;
            else if (att.status === 'LATE') lateDays++;
          }
        }
      }

      // Default working days based on date cycle if no attendance entries
      const cycleDays = Math.max(1, Math.round((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));
      if (presentDays === 0 && absentDays === 0) {
        presentDays = Math.min(30, cycleDays);
      }

      // Absenteeism deduction = (Basic / 30) * absentDays
      const absentDeduction = Math.round(((basic / 30) * absentDays) * 100) / 100;

      // 3. Active Loans Monthly Installment
      const empLoans = await db
        .select()
        .from(loans)
        .where(
          and(
            eq(loans.tenantId, session.tenantId as string),
            eq(loans.employeeId, emp.id),
            eq(loans.status, 'APPROVED')
          )
        );

      let loanDeduction = 0;
      for (const loan of empLoans) {
        if (loan.remainingAmount > 0) {
          loanDeduction += Math.min(loan.monthlyInstallment, loan.remainingAmount);
        }
      }

      // 4. GOSI Contribution calculation (9.75% of basic + housing)
      const gosiBase = basic + housing;
      const gosiDeduction = emp.nationalId ? Math.round((gosiBase * 0.0975) * 100) / 100 : 0;

      // 5. Total Allowances & Deductions
      const totalAllowances = housing + transport + other + overtimePay;
      const finesPenalties = 0; // Default or manual override
      const totalDeductions = loanDeduction + gosiDeduction + absentDeduction + finesPenalties;
      const netSalary = Math.max(0, Math.round((basic + totalAllowances - totalDeductions) * 100) / 100);

      // Check if existing record exists
      const [existing] = await db
        .select()
        .from(payroll)
        .where(
          and(
            eq(payroll.tenantId, session.tenantId as string),
            eq(payroll.employeeId, emp.id),
            eq(payroll.month, month),
            eq(payroll.year, year)
          )
        );

      if (existing) {
        const [updated] = await db
          .update(payroll)
          .set({
            basicSalary: basic,
            housingAllowance: housing,
            transportAllowance: transport,
            otherAllowance: other,
            allowances: totalAllowances,
            overtimeHours: totalOtHours,
            overtimePay: overtimePay,
            presentDays: presentDays,
            absentDays: absentDays,
            lateDays: lateDays,
            finesPenalties: finesPenalties,
            loanDeduction: loanDeduction,
            gosiDeduction: gosiDeduction,
            deductions: totalDeductions,
            netSalary: netSalary,
            startDate: finalStartDate,
            endDate: finalEndDate,
            departmentName: emp.departmentName || 'General',
            paymentMethod: emp.paymentMethod || 'BANK',
            updatedAt: new Date(),
          })
          .where(eq(payroll.id, existing.id))
          .returning();
        generatedRecords.push(updated);
      } else {
        const [inserted] = await db
          .insert(payroll)
          .values({
            tenantId: session.tenantId as string,
            employeeId: emp.id,
            month: month,
            year: year,
            basicSalary: basic,
            housingAllowance: housing,
            transportAllowance: transport,
            otherAllowance: other,
            allowances: totalAllowances,
            overtimeHours: totalOtHours,
            overtimePay: overtimePay,
            presentDays: presentDays,
            absentDays: absentDays,
            lateDays: lateDays,
            finesPenalties: finesPenalties,
            loanDeduction: loanDeduction,
            gosiDeduction: gosiDeduction,
            deductions: totalDeductions,
            netSalary: netSalary,
            startDate: finalStartDate,
            endDate: finalEndDate,
            departmentName: emp.departmentName || 'General',
            paymentMethod: emp.paymentMethod || 'BANK',
            status: 'DRAFT',
          })
          .returning();
        generatedRecords.push(inserted);
      }
    }

    return NextResponse.json({
      message: `Successfully generated ${generatedRecords.length} payroll records for ${month}/${year}`,
      count: generatedRecords.length,
      records: generatedRecords,
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST Payroll Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
