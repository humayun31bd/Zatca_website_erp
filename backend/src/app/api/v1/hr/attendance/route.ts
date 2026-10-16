import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attendance } from "@/lib/db/hr_schema";
import { eq, desc, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const employeeId = req.nextUrl.searchParams.get("employeeId");

    const conditions = [eq(attendance.tenantId, session.tenantId as string)];
    if (employeeId) {
      conditions.push(eq(attendance.employeeId, employeeId));
    }

    const data = await db
      .select()
      .from(attendance)
      .where(and(...conditions))
      .orderBy(desc(attendance.date));

    return NextResponse.json({ success: true, attendance: data });
  } catch (error: any) {
    console.error("GET Attendance Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const [newRecord] = await db.insert(attendance).values({
      ...body,
      tenantId: session.tenantId as string,
      date: body.date ? new Date(body.date) : new Date(),
    }).returning();

    return NextResponse.json({ success: true, attendance: newRecord });
  } catch (error: any) {
    console.error("POST Attendance Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
