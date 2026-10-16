import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/hr_schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

function parseDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    // Handle DD/MM/YYYY or DD-MM-YYYY format
    const ddmmyyyy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(trimmed);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1;
      const year = parseInt(ddmmyyyy[3], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function parseNumber(val: any, defaultVal = 0): number {
  if (val === null || val === undefined || val === '') return defaultVal;
  const n = parseFloat(val);
  return isNaN(n) ? defaultVal : n;
}

function stringifyJson(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val;
  try {
    return JSON.stringify(val);
  } catch (_) {
    return null;
  }
}

function mapEmployeeInput(body: any, tenantId: string) {
  return {
    tenantId: tenantId,
    firstName: body.firstName || body.first_name || '',
    lastName: body.lastName || body.last_name || '',
    fatherName: body.fatherName || body.father_name || null,
    motherName: body.motherName || body.mother_name || null,
    address: body.address || null,
    email: body.email || null,
    phone: body.phone || null,
    departmentName: body.departmentName || body.department_name || null,
    designationName: body.designationName || body.designation_name || null,
    managerId: body.managerId || body.manager_id || null,
    managerName: body.managerName || body.manager_name || null,
    jobResponsibility: body.jobResponsibility || body.job_responsibility || null,
    workingHours: body.workingHours || body.working_hours || null,
    offDay: body.offDay || body.off_day || null,
    shiftInfo: body.shiftInfo || body.shift_info || null,
    yearlyBenefits: body.yearlyBenefits || body.yearly_benefits || null,
    nationalId: body.nationalId || body.national_id || null,
    iqamaExpiryDate: parseDate(body.iqamaExpiryDate || body.iqama_expiry_date),
    passportNumber: body.passportNumber || body.passport_number || null,
    passportExpiryDate: parseDate(body.passportExpiryDate || body.passport_expiry_date),
    gosiNumber: body.gosiNumber || body.gosi_number || null,
    joiningDate: parseDate(body.joiningDate || body.joining_date),
    basicSalary: parseNumber(body.basicSalary || body.basic_salary, 0),
    payGrade: body.payGrade || body.pay_grade || null,
    payScale: body.payScale || body.pay_scale || null,
    housingAllowance: parseNumber(body.housingAllowance || body.housing_allowance, 0),
    transportAllowance: parseNumber(body.transportAllowance || body.transport_allowance, 0),
    otherAllowance: parseNumber(body.otherAllowance || body.other_allowance, 0),
    profilePicture: body.profilePicture || body.profile_picture || null,
    experiences: stringifyJson(body.experiences),
    skills: stringifyJson(body.skills),
    educations: stringifyJson(body.educations),
    documents: stringifyJson(body.documents),
    paymentMethod: body.paymentMethod || body.payment_method || 'BANK',
    status: body.status || 'ACTIVE',
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await db
      .select()
      .from(employees)
      .where(eq(employees.tenantId, session.tenantId as string))
      .orderBy(desc(employees.createdAt));

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET Employees Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const insertData = mapEmployeeInput(body, session.tenantId as string);

    if (!insertData.firstName || !insertData.lastName) {
      return NextResponse.json({ error: "First name and last name are required" }, { status: 400 });
    }

    const [newEmployee] = await db.insert(employees).values(insertData).returning();

    return NextResponse.json(newEmployee, { status: 201 });
  } catch (error: any) {
    console.error("POST Employee Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
