import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { journalEntries, journalEntryLines } from "@/lib/db/accounting_schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await db.query.journalEntries.findMany({
      where: eq(journalEntries.tenantId, session.tenantId as string),
      orderBy: [desc(journalEntries.entryDate), desc(journalEntries.createdAt)],
      with: {
        lines: true
      }
    });

    return NextResponse.json({ success: true, journalEntries: data });
  } catch (error: any) {
    console.error("GET Journal Entries Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { lines, ...entryData } = body;

    const result = await db.transaction(async (tx) => {
      // 1. Validate debit == credit
      const totalDebit = lines.reduce((sum: number, line: any) => sum + Number(line.debit || 0), 0);
      const totalCredit = lines.reduce((sum: number, line: any) => sum + Number(line.credit || 0), 0);
      
      // We use a small epsilon to avoid float matching issues, though we recommend using exact decimal libraries in production
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
         throw new Error("Total Debit must equal Total Credit.");
      }

      // 2. Generate entry number if not provided
      let entryNumber = entryData.entryNumber;
      if (!entryNumber) {
        entryNumber = `JE-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      }

      // 3. Create entry
      const [newEntry] = await tx.insert(journalEntries).values({
        ...entryData,
        entryNumber,
        entryDate: new Date(entryData.entryDate || Date.now()),
        tenantId: session.tenantId as string,
      }).returning();

      // 4. Create lines
      if (lines && lines.length > 0) {
        const lineValues = lines.map((line: any) => ({
          ...line,
          journalEntryId: newEntry.id,
        }));
        await tx.insert(journalEntryLines).values(lineValues);
      }

      return newEntry;
    });

    return NextResponse.json({ success: true, journalEntry: result });
  } catch (error: any) {
    console.error("POST Journal Entry Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
