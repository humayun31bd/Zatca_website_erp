import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payroll } from "@/lib/db/hr_schema";
import { eq, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { month, year, department, action } = body;

    const conditions = [
      eq(payroll.tenantId, session.tenantId as string),
      eq(payroll.month, parseInt(month, 10)),
      eq(payroll.year, parseInt(year, 10)),
    ];

    if (department && department !== 'ALL') {
      conditions.push(eq(payroll.departmentName, department));
    }

    if (action === 'APPROVE_ALL') {
      conditions.push(eq(payroll.status, 'DRAFT'));
      await db
        .update(payroll)
        .set({ status: 'APPROVED', updatedAt: new Date() })
        .where(and(...conditions));
      return NextResponse.json({ success: true, message: "All eligible draft payroll records approved" });
    }

    if (action === 'MARK_ALL_PAID') {
      conditions.push(eq(payroll.status, 'APPROVED'));
      await db
        .update(payroll)
        .set({ status: 'PAID', paymentDate: new Date(), updatedAt: new Date() })
        .where(and(...conditions));
      return NextResponse.json({ success: true, message: "All approved payroll records marked as paid" });
    }

    if (action === 'DELETE_ALL_DRAFTS') {
      conditions.push(eq(payroll.status, 'DRAFT'));
      await db
        .delete(payroll)
        .where(and(...conditions));
      return NextResponse.json({ success: true, message: "Draft records deleted successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST Payroll Batch Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
