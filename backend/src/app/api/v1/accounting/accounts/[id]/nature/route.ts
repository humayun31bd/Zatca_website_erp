import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/accounting_schema";
import { eq, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId as string;
    const { isCashNature, isBankNature } = await req.json();

    const [updated] = await db.update(accounts)
      .set({
        isCashNature: isCashNature ?? false,
        isBankNature: isBankNature ?? false,
        updatedAt: new Date()
      })
      .where(and(eq(accounts.id, params.id), eq(accounts.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, account: updated });
  } catch (error: any) {
    console.error("PUT Account Nature Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
