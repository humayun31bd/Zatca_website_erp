import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leaveRequests, employees } from "@/lib/db/hr_schema";
import { eq, desc, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

function formatDate(date: any): string {
  if (!date) return "";
  if (date instanceof Date) {
    return date.toISOString().split("T")[0];
  }
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? String(date) : parsed.toISOString().split("T")[0];
}

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const employeeId = req.nextUrl.searchParams.get("employeeId");

    const conditions = [eq(leaveRequests.tenantId, session.tenantId as string)];
    if (employeeId) {
      conditions.push(eq(leaveRequests.employeeId, employeeId));
    }

    const rows = await db
      .select({
        id: leaveRequests.id,
        employeeId: leaveRequests.employeeId,
        leaveType: leaveRequests.leaveType,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        durationDays: leaveRequests.durationDays,
        status: leaveRequests.status,
        reason: leaveRequests.reason,
        firstName: employees.firstName,
        lastName: employees.lastName,
      })
      .from(leaveRequests)
      .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .where(and(...conditions))
      .orderBy(desc(leaveRequests.createdAt));

    const formatted = rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      leaveType: r.leaveType,
      startDate: formatDate(r.startDate),
      endDate: formatDate(r.endDate),
      durationDays: String(r.durationDays ?? "1"),
      status: r.status,
      reason: r.reason ?? "",
      firstName: r.firstName ?? "",
      lastName: r.lastName ?? "",
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("GET Leaves Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const durationDays = typeof body.durationDays === "number"
      ? body.durationDays
      : parseFloat(body.durationDays) || 1;

    const [inserted] = await db
      .insert(leaveRequests)
      .values({
        tenantId: session.tenantId as string,
        employeeId: body.employeeId,
        leaveType: body.leaveType || "Annual",
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        endDate: body.endDate ? new Date(body.endDate) : new Date(),
        durationDays: durationDays,
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
      leaveType: inserted.leaveType,
      startDate: formatDate(inserted.startDate),
      endDate: formatDate(inserted.endDate),
      durationDays: String(inserted.durationDays),
      status: inserted.status,
      reason: inserted.reason ?? "",
      firstName: emp?.firstName ?? "",
      lastName: emp?.lastName ?? "",
    };

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("POST Leaves Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
