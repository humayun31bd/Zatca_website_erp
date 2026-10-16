import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { journalEntries, journalEntryLines, accounts } from "@/lib/db/accounting_schema";
import { eq, and, lte } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId as string;
    const searchParams = req.nextUrl.searchParams;
    const asOfDateStr = searchParams.get('asOfDate'); // Balance sheet is "as of" a date, not a range.
    
    // Default to today if no date provided
    const asOfDate = asOfDateStr ? new Date(asOfDateStr) : new Date();

    const lines = await db.select({
      accountId: accounts.id,
      accountCode: accounts.code,
      accountName: accounts.name,
      accountType: accounts.type,
      debit: journalEntryLines.debit,
      credit: journalEntryLines.credit,
    })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .innerJoin(accounts, eq(journalEntryLines.accountId, accounts.id))
    .where(
      and(
        eq(journalEntries.tenantId, tenantId),
        eq(journalEntries.status, 'POSTED'),
        lte(journalEntries.entryDate, asOfDate),
      )
    );

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    const assets: any[] = [];
    const liabilities: any[] = [];
    const equity: any[] = [];

    const accountTotals: Record<string, { code: string, name: string, type: string, debit: number, credit: number }> = {};

    lines.forEach(line => {
      if (!accountTotals[line.accountId]) {
        accountTotals[line.accountId] = { code: line.accountCode, name: line.accountName, type: line.accountType, debit: 0, credit: 0 };
      }
      accountTotals[line.accountId].debit += Number();
      accountTotals[line.accountId].credit += Number();
    });

    Object.values(accountTotals).forEach(acc => {
      if (acc.type === 'ASSET') {
        const net = acc.debit - acc.credit;
        totalAssets += net;
        assets.push({ code: acc.code, name: acc.name, balance: net });
      } else if (acc.type === 'LIABILITY') {
        const net = acc.credit - acc.debit;
        totalLiabilities += net;
        liabilities.push({ code: acc.code, name: acc.name, balance: net });
      } else if (acc.type === 'EQUITY') {
        const net = acc.credit - acc.debit;
        totalEquity += net;
        equity.push({ code: acc.code, name: acc.name, balance: net });
      }
    });

    // Calculate current period Net Income to roll into Retained Earnings
    let netIncome = 0;
    Object.values(accountTotals).forEach(acc => {
      if (acc.type === 'REVENUE') {
        netIncome += (acc.credit - acc.debit);
      } else if (acc.type === 'EXPENSE') {
        netIncome -= (acc.debit - acc.credit);
      }
    });
    
    // Add net income to equity totals
    totalEquity += netIncome;
    equity.push({ code: 'RETAINED_EARNINGS', name: 'Current Period Net Income', balance: netIncome });

    return NextResponse.json({
      success: true,
      data: {
        assets: assets.sort((a, b) => a.code.localeCompare(b.code)),
        liabilities: liabilities.sort((a, b) => a.code.localeCompare(b.code)),
        equity: equity.sort((a, b) => a.code.localeCompare(b.code)),
        totalAssets,
        totalLiabilities,
        totalEquity,
        isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01 // Accounting equation: Assets = Liabilities + Equity
      }
    });
  } catch (error: any) {
    console.error("GET Balance Sheet Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
