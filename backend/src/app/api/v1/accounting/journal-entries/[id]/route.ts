import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { journalEntries } from "@/lib/db/accounting_schema";
import { eq, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { status } = body;

    // Fetch existing entry
    const existingEntry = await db.query.journalEntries.findFirst({
      where: and(
        eq(journalEntries.id, params.id),
        eq(journalEntries.tenantId, session.tenantId as string)
      ),
    });

    if (!existingEntry) {
      return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
    }

    if (existingEntry.status === 'POSTED') {
      return NextResponse.json({ error: "Cannot modify an already posted/approved voucher." }, { status: 400 });
    }

    let updateData: any = { status };

    // If it's being approved, it acts as a final voucher.
    // At this point, the ledger balance is effectively updated because 'POSTED' entries 
    // are included in ledger balance calculations.
    if (status === 'POSTED' || status === 'APPROVED') {
      updateData.status = 'POSTED'; // Map APPROVED to POSTED for the schema
      updateData.updatedAt = new Date();
      // Potentially generate a sequential voucher number here if required, 
      // but entryNumber was already generated on DRAFT creation.
    }

    const [updatedEntry] = await db.update(journalEntries)
      .set(updateData)
      .where(eq(journalEntries.id, params.id))
      .returning();

    return NextResponse.json({ 
      success: true, 
      journalEntry: updatedEntry,
      message: updatedEntry.status === 'POSTED' ? "Voucher generated and ledger balance updated." : "Journal entry updated."
    });

  } catch (error: any) {
    console.error("PUT Journal Entry Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
