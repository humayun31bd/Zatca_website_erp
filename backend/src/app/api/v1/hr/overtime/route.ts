import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { overtime, employees } from "@/lib/db/hr_schema";
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

    const conditions = [eq(overtime.tenantId, session.tenantId as string)];
    if (employeeId) {
      conditions.push(eq(overtime.employeeId, employeeId));
    }

    const rows = await db
      .select({
        id: overtime.id,
        employeeId: overtime.employeeId,
        date: overtime.date,
        hours: overtime.hours,
        status: overtime.status,
        reason: overtime.reason,
        firstName: employees.firstName,
        lastName: employees.lastName,
      })
      .from(overtime)
      .leftJoin(employees, eq(overtime.employeeId, employees.id))
      .where(and(...conditions))
      .orderBy(desc(overtime.createdAt));

    const formatted = rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      date: formatDate(r.date),
      hours: String(r.hours ?? "0"),
      status: r.status,
      reason: r.reason ?? "",
      firstName: r.firstName ?? "",
      lastName: r.lastName ?? "",
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("GET Overtime Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const hours = typeof body.hours === "number"
      ? body.hours
      : parseFloat(body.hours) || 0;

    const [inserted] = await db
      .insert(overtime)
      .values({
        tenantId: session.tenantId as string,
        employeeId: body.employeeId,
        date: body.date ? new Date(body.date) : new Date(),
        hours: hours,
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
      date: formatDate(inserted.date),
      hours: String(inserted.hours),
      status: inserted.status,
      reason: inserted.reason ?? "",
      firstName: emp?.firstName ?? "",
      lastName: emp?.lastName ?? "",
    };

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("POST Overtime Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
