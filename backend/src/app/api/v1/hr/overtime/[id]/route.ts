import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { overtime, employees } from "@/lib/db/hr_schema";
import { eq, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

function formatDate(date: any): string {
  if (!date) return "";
  if (date instanceof Date) {
    return date.toISOString().split("T")[0];
  }
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? String(date) : parsed.toISOString().split("T")[0];
}

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
    if (body.date !== undefined) updateData.date = new Date(body.date);
    if (body.hours !== undefined) {
      updateData.hours = typeof body.hours === "number"
        ? body.hours
        : parseFloat(body.hours) || 0;
    }

    const [updated] = await db
      .update(overtime)
      .set(updateData)
      .where(
        and(
          eq(overtime.id, id),
          eq(overtime.tenantId, session.tenantId as string)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Overtime record not found" }, { status: 404 });
    }

    const [emp] = await db
      .select({ firstName: employees.firstName, lastName: employees.lastName })
      .from(employees)
      .where(eq(employees.id, updated.employeeId))
      .limit(1);

    const formatted = {
      id: updated.id,
      employeeId: updated.employeeId,
      date: formatDate(updated.date),
      hours: String(updated.hours),
      status: updated.status,
      reason: updated.reason ?? "",
      firstName: emp?.firstName ?? "",
      lastName: emp?.lastName ?? "",
    };

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("PUT Overtime Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
