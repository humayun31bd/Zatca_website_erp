import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accounts, journalEntries, journalEntryLines } from "@/lib/db/accounting_schema";
import { eq, sql, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');

    // Base condition for ledger lines (only POSTED entries)
    const baseConditions = [
      eq(journalEntries.tenantId, session.tenantId as string),
      eq(journalEntries.status, 'POSTED')
    ];

    if (accountId) {
      baseConditions.push(eq(journalEntryLines.accountId, accountId));
    }

    // Query to get grouped balances by account
    const ledgerBalances = await db
      .select({
        accountId: journalEntryLines.accountId,
        accountCode: accounts.code,
        accountName: accounts.name,
        accountType: accounts.type,
        totalDebit: sql<number>`sum(${journalEntryLines.debit})`,
        totalCredit: sql<number>`sum(${journalEntryLines.credit})`,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .innerJoin(accounts, eq(journalEntryLines.accountId, accounts.id))
      .where(and(...baseConditions))
      .groupBy(
        journalEntryLines.accountId,
        accounts.code,
        accounts.name,
        accounts.type
      );

    // Calculate final balance depending on account type (Asset/Expense = Dr - Cr, Liability/Equity/Rev = Cr - Dr)
    const formattedBalances = ledgerBalances.map(b => {
      const debit = Number(b.totalDebit || 0);
      const credit = Number(b.totalCredit || 0);
      let balance = 0;
      
      if (['ASSET', 'EXPENSE'].includes(b.accountType)) {
        balance = debit - credit;
      } else {
        balance = credit - debit;
      }
      
      return {
        ...b,
        totalDebit: debit,
        totalCredit: credit,
        balance
      };
    });

    return NextResponse.json({ success: true, ledger: formattedBalances });

  } catch (error: any) {
    console.error("GET Ledger Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
