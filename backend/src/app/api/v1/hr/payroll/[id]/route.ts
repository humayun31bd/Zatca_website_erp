import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payroll } from "@/lib/db/hr_schema";
import { eq, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const updateFields: any = {
      updatedAt: new Date(),
    };

    if (body.status !== undefined) {
      updateFields.status = body.status;
      if (body.status === 'PAID') {
        updateFields.paymentDate = new Date();
      }
    }
    if (body.finesPenalties !== undefined) {
      updateFields.finesPenalties = parseFloat(body.finesPenalties) || 0;
    }
    if (body.overtimePay !== undefined) {
      updateFields.overtimePay = parseFloat(body.overtimePay) || 0;
    }
    if (body.netSalary !== undefined) {
      updateFields.netSalary = parseFloat(body.netSalary) || 0;
    }

    const [updated] = await db
      .update(payroll)
      .set(updateFields)
      .where(
        and(
          eq(payroll.id, params.id),
          eq(payroll.tenantId, session.tenantId as string)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Payroll record not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT Payroll Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await db
      .delete(payroll)
      .where(
        and(
          eq(payroll.id, params.id),
          eq(payroll.tenantId, session.tenantId as string)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Payroll Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
