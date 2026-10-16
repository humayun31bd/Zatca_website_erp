// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cashBookEntries } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { z } from "zod";

const CashBookEntrySchema = z.object({
  type: z.enum(['IN', 'OUT']),
  amount: z.union([z.string(), z.number()]).transform((val) => Number(val)),
  category: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  referenceId: z.string().optional().nullable(),
  entryDate: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantEntries = await db
      .select()
      .from(cashBookEntries)
      .where(eq(cashBookEntries.tenantId, session.tenantId as string))
      .orderBy(desc(cashBookEntries.entryDate));

    return NextResponse.json(tenantEntries);
  } catch (error: any) {
    console.error("GET Cash Book error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parseResult = CashBookEntrySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid payload", details: parseResult.error.format() }, { status: 400 });
    }

    const newEntry = await db.insert(cashBookEntries).values({
      tenantId: session.tenantId as string,
      type: parseResult.data.type,
      amount: parseResult.data.amount,
      category: parseResult.data.category,
      description: parseResult.data.description,
      referenceId: parseResult.data.referenceId,
      entryDate: parseResult.data.entryDate ? new Date(parseResult.data.entryDate) : new Date(),
    }).returning();

    return NextResponse.json(newEntry[0], { status: 201 });
  } catch (error: any) {
    console.error("POST Cash Book error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
