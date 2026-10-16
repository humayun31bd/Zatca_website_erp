import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accounts, journalEntries, journalEntryLines } from "@/lib/db/accounting_schema";
import { eq, sql, and, asc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const accountId = searchParams.get('accountId'); // Optional filter by specific account

    // Fetch detailed journal lines
    const queryConditions = [
      eq(journalEntries.tenantId, session.tenantId as string),
      eq(journalEntries.status, 'POSTED')
    ];

    if (accountId) {
      queryConditions.push(eq(journalEntryLines.accountId, accountId));
    }

    const detailedLines = await db
      .select({
        lineId: journalEntryLines.id,
        entryDate: journalEntries.entryDate,
        accountName: accounts.name,
        accountType: accounts.type,
        voucherNo: journalEntries.referenceId, // Or journalEntries.entryNumber if exists
        description: journalEntryLines.description,
        debit: journalEntryLines.debit,
        credit: journalEntryLines.credit,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .innerJoin(accounts, eq(journalEntryLines.accountId, accounts.id))
      .where(and(...queryConditions))
      .orderBy(asc(journalEntries.entryDate), asc(journalEntryLines.createdAt));

    // Calculate running balance per account
    const runningBalances: Record<string, number> = {};
    
    const formattedData = detailedLines.map(line => {
      const debit = Number(line.debit || 0);
      const credit = Number(line.credit || 0);
      
      const accName = line.accountName || 'Unknown';
      if (!runningBalances[accName]) runningBalances[accName] = 0;
      
      let change = 0;
      if (['ASSET', 'EXPENSE'].includes(line.accountType)) {
        change = debit - credit;
      } else {
        change = credit - debit;
      }
      
      runningBalances[accName] += change;

      return {
        tranDate: line.entryDate,
        particulars: line.accountName,
        voucherNo: line.voucherNo,
        description: line.description,
        debit: debit,
        credit: credit,
        balance: runningBalances[accName],
      };
    });

    return NextResponse.json({ success: true, data: formattedData });

  } catch (error: any) {
    console.error("GET Detailed Ledger Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
