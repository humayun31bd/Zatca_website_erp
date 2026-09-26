import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { counters, branches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await db
      .select({
        id: counters.id,
        name: counters.name,
        branchId: counters.branchId,
        branchName: branches.name,
        isActive: counters.isActive,
      })
      .from(counters)
      .innerJoin(branches, eq(counters.branchId, branches.id))
      .where(eq(counters.tenantId, session.tenantId as string));

    return NextResponse.json({ success: true, counters: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
