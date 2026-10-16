import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/accounting_schema";
import { eq, and, or } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = (session?.tenantId as string) || "tenant-grocery-01";
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type'); // 'CASH', 'BANK', or 'ALL' (meaning either cash or bank)

    let condition;
    if (type === 'CASH') {
      condition = eq(accounts.isCashNature, true);
    } else if (type === 'BANK') {
      condition = eq(accounts.isBankNature, true);
    } else {
      condition = or(eq(accounts.isCashNature, true), eq(accounts.isBankNature, true));
    }

    const data = await db.select()
      .from(accounts)
      .where(and(eq(accounts.tenantId, tenantId), condition))
      .orderBy(accounts.code);

    return NextResponse.json({ success: true, accounts: data });
  } catch (error: any) {
    console.error("GET Cash/Bank Accounts Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
