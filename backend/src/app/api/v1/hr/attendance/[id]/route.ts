import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attendance } from "@/lib/db/hr_schema";
import { eq, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const [updatedRecord] = await db.update(attendance)
      .set(body)
      .where(
        and(
          eq(attendance.id, params.id),
          eq(attendance.tenantId, session.tenantId as string)
        )
      )
      .returning();

    if (!updatedRecord) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, attendance: updatedRecord });
  } catch (error: any) {
    console.error("PUT Attendance Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
