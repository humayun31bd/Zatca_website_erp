import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loans, employees } from "@/lib/db/hr_schema";
import { eq, desc, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const employeeId = req.nextUrl.searchParams.get("employeeId");

    const conditions = [eq(loans.tenantId, session.tenantId as string)];
    if (employeeId) {
      conditions.push(eq(loans.employeeId, employeeId));
    }

    const rows = await db
      .select({
        id: loans.id,
        employeeId: loans.employeeId,
        amount: loans.amount,
        monthlyInstallment: loans.monthlyInstallment,
        remainingAmount: loans.remainingAmount,
        status: loans.status,
        reason: loans.reason,
        firstName: employees.firstName,
        lastName: employees.lastName,
      })
      .from(loans)
      .leftJoin(employees, eq(loans.employeeId, employees.id))
      .where(and(...conditions))
      .orderBy(desc(loans.createdAt));

    const formatted = rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      amount: String(r.amount ?? "0"),
      monthlyInstallment: String(r.monthlyInstallment ?? "0"),
      remainingAmount: String(r.remainingAmount ?? "0"),
      status: r.status,
      reason: r.reason ?? "",
      firstName: r.firstName ?? "",
      lastName: r.lastName ?? "",
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("GET Loans Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const amount = typeof body.amount === "number"
      ? body.amount
      : parseFloat(body.amount) || 0;

    const installment = typeof body.monthlyInstallment === "number"
      ? body.monthlyInstallment
      : parseFloat(body.monthlyInstallment) || 0;

    const remaining = body.remainingAmount !== undefined
      ? (typeof body.remainingAmount === "number"
          ? body.remainingAmount
          : parseFloat(body.remainingAmount) || 0)
      : amount;

    const [inserted] = await db
      .insert(loans)
      .values({
        tenantId: session.tenantId as string,
        employeeId: body.employeeId,
        amount: amount,
        monthlyInstallment: installment,
        remainingAmount: remaining,
        status: body.status || "PENDING",
        reason: body.reason || null,
      })
      .returning();

    // Fetch employee names
    const [emp] = await db
      .select({ firstName: employees.firstName, lastName: employees.lastName })
      .from(employees)
      .where(eq(employees.id, inserted.employeeId))
      .limit(1);

    const formatted = {
      id: inserted.id,
      employeeId: inserted.employeeId,
      amount: String(inserted.amount),
      monthlyInstallment: String(inserted.monthlyInstallment),
      remainingAmount: String(inserted.remainingAmount),
      status: inserted.status,
      reason: inserted.reason ?? "",
      firstName: emp?.firstName ?? "",
      lastName: emp?.lastName ?? "",
    };

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("POST Loans Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
