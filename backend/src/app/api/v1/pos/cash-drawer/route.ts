import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cashDrawerTransactions } from "@/lib/db/pos_schema";
import { tenants } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// Dummy tenant ID since there's no auth yet
const DUMMY_TENANT_ID = "00000000-0000-0000-0000-000000000001";

export async function GET(req: Request) {
  try {
    const transactions = await db.query.cashDrawerTransactions.findMany({
      where: eq(cashDrawerTransactions.tenantId, DUMMY_TENANT_ID),
      orderBy: [desc(cashDrawerTransactions.createdAt)],
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Error fetching cash drawer transactions:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, amount, reason } = body;

    if (!['PAY_IN', 'PAY_OUT'].includes(type) || !amount || !reason) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, DUMMY_TENANT_ID),
    });

    if (!tenant) {
        return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const newTransaction = await db
      .insert(cashDrawerTransactions)
      .values({
        tenantId: DUMMY_TENANT_ID,
        type,
        amount: Number(amount),
        reason,
      })
      .returning();

    return NextResponse.json(newTransaction[0], { status: 201 });
  } catch (error) {
    console.error("Error creating cash drawer transaction:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
