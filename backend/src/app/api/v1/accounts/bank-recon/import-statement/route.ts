import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chequeLeaves } from "@/lib/db/accounting_schema";
import { verifySession } from "@/lib/auth/session";
import { eq, and, inArray } from "drizzle-orm";

interface StatementRow {
  date: string;
  reference: string; // Cheque number or reference
  description: string;
  amount: number;
  type: "DEBIT" | "CREDIT"; // DEBIT = Withdrawal/Paid Out, CREDIT = Deposit/Received
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || "tenant-grocery-01";

    const body = await req.json();
    const { bankAccountId, statementLines } = body as { bankAccountId: string; statementLines: StatementRow[] };

    if (!bankAccountId || !Array.isArray(statementLines) || statementLines.length === 0) {
      return NextResponse.json(
        { error: "Missing required parameters: bankAccountId and non-empty statementLines." },
        { status: 400 }
      );
    }

    // Fetch uncleared leaves for this bank account
    const unclearedLeaves = await db
      .select()
      .from(chequeLeaves)
      .where(
        and(
          eq(chequeLeaves.tenantId, tenantId),
          eq(chequeLeaves.bankAccountId, bankAccountId),
          inArray(chequeLeaves.status, ["ISSUED", "RECEIVED", "PRESENTED"])
        )
      );

    const matches: Array<{ statementRef: string; chequeNumber: string; amount: number; leafId: string }> = [];
    const unmatched: StatementRow[] = [];

    const nowIso = new Date().toISOString();

    await db.transaction(async (tx) => {
      for (const line of statementLines) {
        const lineRef = (line.reference || "").trim().toLowerCase();
        const lineAmount = Math.abs(line.amount);

        // Match by leaf number or amount
        const matchedLeaf = unclearedLeaves.find((leaf) => {
          const leafNo = leaf.leafNumber.toLowerCase();
          const leafAmt = leaf.amount || 0;

          // Match condition: exact leaf number in reference OR matching amount
          const matchesRef = lineRef.length >= 4 && (lineRef.includes(leafNo) || leafNo.includes(lineRef));
          const matchesAmt = Math.abs(leafAmt - lineAmount) < 0.01;

          return matchesRef || (matchesAmt && leaf.status === "PRESENTED");
        });

        if (matchedLeaf) {
          tx.update(chequeLeaves)
            .set({
              status: "CLEARED",
              clearedDate: new Date(line.date || nowIso),
              remarks: `Auto-reconciled via bank statement match (${line.description || "Statement import"})`,
            })
            .where(eq(chequeLeaves.id, matchedLeaf.id))
            .run();

          matches.push({
            statementRef: line.reference,
            chequeNumber: matchedLeaf.leafNumber,
            amount: matchedLeaf.amount || 0,
            leafId: matchedLeaf.id,
          });
        } else {
          unmatched.push(line);
        }
      }
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalImported: statementLines.length,
        autoMatchedCount: matches.length,
        unmatchedCount: unmatched.length,
      },
      matches,
      unmatched,
    });
  } catch (error: any) {
    console.error("POST Bank Statement Reconciliation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process bank statement" }, { status: 500 });
  }
}
