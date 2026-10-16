import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payScales } from "@/lib/db/hr_schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const scales = await db
      .select()
      .from(payScales)
      .where(eq(payScales.tenantId, session.tenantId as string))
      .orderBy(desc(payScales.createdAt));

    return NextResponse.json(scales);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const basicSalary = parseFloat(body.basicSalary || body.basic_salary || 0);
    const housingAllowance = parseFloat(body.housingAllowance || body.housing_allowance || 0);
    const transportAllowance = parseFloat(body.transportAllowance || body.transport_allowance || 0);
    const medicalAllowance = parseFloat(body.medicalAllowance || body.medical_allowance || 0);
    const otherAllowances = parseFloat(body.otherAllowances || body.other_allowances || 0);
    const totalPackage = basicSalary + housingAllowance + transportAllowance + medicalAllowance + otherAllowances;

    const insertData = {
      tenantId: session.tenantId as string,
      gradeId: body.gradeId || body.grade_id || null,
      gradeCode: body.gradeCode || body.grade_code || 'G1',
      scaleName: body.scaleName || body.scale_name || 'Standard Scale',
      basicSalary,
      housingAllowance,
      transportAllowance,
      medicalAllowance,
      otherAllowances,
      totalPackage: body.totalPackage ? parseFloat(body.totalPackage) : totalPackage,
      incrementRate: parseFloat(body.incrementRate || body.increment_rate || 0),
      description: body.description || null,
    };

    const [newScale] = await db.insert(payScales).values(insertData).returning();

    return NextResponse.json(newScale, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
