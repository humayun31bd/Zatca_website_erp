import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payGrades } from "@/lib/db/hr_schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const grades = await db
      .select()
      .from(payGrades)
      .where(eq(payGrades.tenantId, session.tenantId as string))
      .orderBy(desc(payGrades.createdAt));

    return NextResponse.json(grades);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const insertData = {
      tenantId: session.tenantId as string,
      gradeCode: body.gradeCode || body.grade_code || 'G1',
      gradeName: body.gradeName || body.grade_name || 'General Grade',
      minSalary: parseFloat(body.minSalary || body.min_salary || 0),
      maxSalary: parseFloat(body.maxSalary || body.max_salary || 0),
      housingAllowancePercent: parseFloat(body.housingAllowancePercent || body.housing_allowance_percent || 25),
      transportAllowancePercent: parseFloat(body.transportAllowancePercent || body.transport_allowance_percent || 10),
      description: body.description || null,
    };

    const [newGrade] = await db.insert(payGrades).values(insertData).returning();

    return NextResponse.json(newGrade, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
