import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cashBookEntries } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Using raw SQL to aggregate IN and OUT amounts
    const summary = await db
      .select({
        type: cashBookEntries.type,
        total: sql<number>`sum(${cashBookEntries.amount})`,
      })
      .from(cashBookEntries)
      .where(eq(cashBookEntries.tenantId, session.tenantId as string))
      .groupBy(cashBookEntries.type);

    let totalIn = 0;
    let totalOut = 0;

    summary.forEach((s) => {
      if (s.type === 'IN') totalIn = Number(s.total);
      if (s.type === 'OUT') totalOut = Number(s.total);
    });

    const closingBalance = totalIn - totalOut;

    return NextResponse.json({
      totalIn,
      totalOut,
      closingBalance,
    });
  } catch (error: any) {
    console.error("GET Cash Summary error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
