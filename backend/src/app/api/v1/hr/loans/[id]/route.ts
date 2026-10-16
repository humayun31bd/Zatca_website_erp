import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loans, employees } from "@/lib/db/hr_schema";
import { eq, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;
    const body = await req.json();

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.status !== undefined) updateData.status = body.status;
    if (body.reason !== undefined) updateData.reason = body.reason;
    if (body.amount !== undefined) {
      updateData.amount = typeof body.amount === "number"
        ? body.amount
        : parseFloat(body.amount) || 0;
    }
    if (body.monthlyInstallment !== undefined) {
      updateData.monthlyInstallment = typeof body.monthlyInstallment === "number"
        ? body.monthlyInstallment
        : parseFloat(body.monthlyInstallment) || 0;
    }
    if (body.remainingAmount !== undefined) {
      updateData.remainingAmount = typeof body.remainingAmount === "number"
        ? body.remainingAmount
        : parseFloat(body.remainingAmount) || 0;
    }

    const [updated] = await db
      .update(loans)
      .set(updateData)
      .where(
        and(
          eq(loans.id, id),
          eq(loans.tenantId, session.tenantId as string)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Loan record not found" }, { status: 404 });
    }

    const [emp] = await db
      .select({ firstName: employees.firstName, lastName: employees.lastName })
      .from(employees)
      .where(eq(employees.id, updated.employeeId))
      .limit(1);

    const formatted = {
      id: updated.id,
      employeeId: updated.employeeId,
      amount: String(updated.amount),
      monthlyInstallment: String(updated.monthlyInstallment),
      remainingAmount: String(updated.remainingAmount),
      status: updated.status,
      reason: updated.reason ?? "",
      firstName: emp?.firstName ?? "",
      lastName: emp?.lastName ?? "",
    };

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("PUT Loan Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
