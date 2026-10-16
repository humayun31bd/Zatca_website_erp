import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/accounting_schema";
import { eq, asc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session?.tenantId || "tenant-grocery-01";
    const data = await db
      .select()
      .from(accounts)
      .where(eq(accounts.tenantId, tenantId))
      .orderBy(asc(accounts.code));

    return NextResponse.json({ success: true, accounts: data });
  } catch (error: any) {
    console.error("GET Accounts Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const [newAccount] = await db.insert(accounts).values({
      ...body,
      tenantId: session.tenantId as string,
    }).returning();

    return NextResponse.json({ success: true, account: newAccount });
  } catch (error: any) {
    console.error("POST Account Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
