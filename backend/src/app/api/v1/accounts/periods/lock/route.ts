import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { financialPeriods } from "@/lib/db/accounting_schema";
import { verifySession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const userId = session?.userId || req.headers.get("x-user-id") || "approver-user-1";
    const body = await req.json();

    const { periodId, isLocked = true } = body;

    if (!periodId) {
      return NextResponse.json({ error: "periodId is required" }, { status: 400 });
    }

    const [updatedPeriod] = await db
      .update(financialPeriods)
      .set({
        isLocked: Boolean(isLocked),
        lockedAt: isLocked ? new Date() : null,
        lockedBy: isLocked ? userId : null,
      })
      .where(eq(financialPeriods.id, periodId))
      .returning();

    return NextResponse.json({
      success: true,
      message: `Accounting Period '${updatedPeriod?.periodName}' is now ${isLocked ? "LOCKED" : "UNLOCKED"}.`,
      period: updatedPeriod,
    });
  } catch (error: any) {
    console.error("Lock Accounting Period Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
