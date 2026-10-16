import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/accounting_schema";
import { eq, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const [updatedAccount] = await db.update(accounts)
      .set({
        name: body.name,
        parentId: body.parentId,
        isActive: body.isActive,
        isTransaction: body.isTransaction,
        isCashNature: body.isCashNature,
        isBankNature: body.isBankNature,
        hasCostCenter: body.hasCostCenter !== undefined ? Boolean(body.hasCostCenter) : undefined,
        accountSubtype: body.accountSubtype,
        updatedAt: new Date(),
      })
      .where(and(eq(accounts.id, params.id), eq(accounts.tenantId, session.tenantId as string)))
      .returning();

    return NextResponse.json({ success: true, account: updatedAccount });
  } catch (error: any) {
    console.error("PUT Account Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId as string;

    // Check if account exists
    const [account] = await db.select().from(accounts)
      .where(and(eq(accounts.id, params.id), eq(accounts.tenantId, tenantId)));
      
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    // Check for child accounts
    const children = await db.select().from(accounts)
      .where(eq(accounts.parentId, params.id));
    
    if (children.length > 0) {
      return NextResponse.json({ 
        error: "This account has sub-accounts. You must delete all of its child accounts before you can delete this parent account." 
      }, { status: 400 });
    }

    // Check for journal entry lines
    const { journalEntryLines } = await import("@/lib/db/accounting_schema");
    const lines = await db.select().from(journalEntryLines)
      .where(eq(journalEntryLines.accountId, params.id))
      .limit(1);

    if (lines.length > 0) {
      return NextResponse.json({ 
        error: "This account cannot be deleted because it is currently used in one or more journal entries/vouchers." 
      }, { status: 400 });
    }

    await db.delete(accounts)
      .where(and(eq(accounts.id, params.id), eq(accounts.tenantId, tenantId)));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Account Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "http://localhost:5000",
      "Access-Control-Allow-Methods": "GET,DELETE,PATCH,POST,PUT,OPTIONS",
      "Access-Control-Allow-Headers": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-tenant-id",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}
