import { db } from "@/lib/db";
import {
  accounts,
  financialYears,
  journalEntries,
  journalEntryLines,
} from "@/lib/db/accounting_schema";
import { eq, and, sql, inArray } from "drizzle-orm";

export interface ProfitLossParams {
  tenantId: string;
  startDate?: string | Date;
  endDate?: string | Date;
  financialYearId?: string;
  compareFinancialYearId?: string;
}

function toTimestamp(val: any): number {
  if (!val) return 0;
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'number') {
    return val < 10000000000 ? val * 1000 : val;
  }
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

export async function generateProfitAndLossReport({
  tenantId,
  startDate,
  endDate,
  financialYearId,
  compareFinancialYearId,
}: ProfitLossParams) {
  const round = (num: number) => Math.round(num * 100) / 100;

  // 1. Resolve Date Range
  let fromTs: number = 0;
  let toTs: number = Date.now();
  let periodLabel = "Custom Date Range";

  if (financialYearId) {
    const [fy] = await db
      .select()
      .from(financialYears)
      .where(and(eq(financialYears.id, financialYearId), eq(financialYears.tenantId, tenantId)))
      .limit(1);

    if (fy) {
      fromTs = toTimestamp(fy.fromDate);
      toTs = toTimestamp(fy.toDate);
      periodLabel = fy.name;
    }
  } else {
    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      fromTs = s.getTime();
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999); // Full day inclusive
      toTs = e.getTime();
    }
  }

  // 2. Fetch P&L Accounts (REVENUE and EXPENSE)
  const pnlAccounts = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.tenantId, tenantId),
        sql`${accounts.type} IN ('REVENUE', 'EXPENSE')`
      )
    )
    .orderBy(accounts.code);

  if (pnlAccounts.length === 0) {
    return {
      status: 'NO_PNL_ACCOUNTS',
      message: 'No Revenue or Expense accounts found for this tenant.',
      period: { from: new Date(fromTs), to: new Date(toTs), label: periodLabel },
      operatingRevenue: [],
      costOfGoodsSold: [],
      operatingExpenses: [],
      nonOperatingRevenue: [],
      nonOperatingExpenses: [],
      summary: {
        totalRevenue: 0,
        totalCogs: 0,
        grossProfit: 0,
        grossProfitMargin: 0,
        totalOpex: 0,
        operatingProfit: 0,
        netIncome: 0,
      },
    };
  }

  // 3. Fetch Posted Journal Lines within Period
  // CRITICAL: Exclude 'YEAR_END_CLOSE' entries so closed years still show historical operational P&L
  const journalMovements = await db
    .select({
      accountId: journalEntryLines.accountId,
      debit: journalEntryLines.debit,
      credit: journalEntryLines.credit,
      entryDate: journalEntries.entryDate,
      referenceType: journalEntries.referenceType,
    })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .where(
      and(
        eq(journalEntries.tenantId, tenantId),
        eq(journalEntries.status, 'POSTED'),
        sql`${journalEntries.referenceType} != 'YEAR_END_CLOSE'`
      )
    );

  // Filter in memory with robust timestamp comparison
  const periodMovements = journalMovements.filter((m) => {
    const entryTs = toTimestamp(m.entryDate);
    if (fromTs > 0 && entryTs < fromTs) return false;
    if (toTs > 0 && entryTs > toTs) return false;
    return true;
  });

  // Build movement aggregation by accountId
  const accMovementMap = new Map<string, { debit: number; credit: number }>();
  for (const m of periodMovements) {
    const cur = accMovementMap.get(m.accountId) || { debit: 0, credit: 0 };
    cur.debit += m.debit;
    cur.credit += m.credit;
    accMovementMap.set(m.accountId, cur);
  }

  // 4. Categorize accounts into standard Multi-Step P&L structure
  const operatingRevenueRows: any[] = [];
  const cogsRows: any[] = [];
  const opexRows: any[] = [];
  const nonOperatingRevenueRows: any[] = [];
  const nonOperatingExpenseRows: any[] = [];

  let totalRevenue = 0;
  let totalCogs = 0;
  let totalOpex = 0;
  let totalOtherIncome = 0;
  let totalOtherExpense = 0;

  for (const acc of pnlAccounts) {
    const mov = accMovementMap.get(acc.id) || { debit: 0, credit: 0 };
    let netAmount = 0;

    if (acc.type === 'REVENUE') {
      // Normal Credit Balance: Credit - Debit (Debits represent discounts/returns)
      netAmount = round(mov.credit - mov.debit);
    } else if (acc.type === 'EXPENSE') {
      // Normal Debit Balance: Debit - Credit (Credits represent refunds/rebates)
      netAmount = round(mov.debit - mov.credit);
    }

    const item = {
      accountId: acc.id,
      code: acc.code,
      name: acc.name,
      type: acc.type,
      accountSubtype: acc.accountSubtype,
      level: acc.level,
      isControl: acc.isControl,
      amount: netAmount,
    };

    // Classification based on account code prefixes and subtypes
    if (acc.type === 'REVENUE') {
      if (acc.code.startsWith('4.30') || acc.accountSubtype === 'OTHER_INCOME') {
        nonOperatingRevenueRows.push(item);
        totalOtherIncome += netAmount;
      } else {
        operatingRevenueRows.push(item);
        totalRevenue += netAmount;
      }
    } else if (acc.type === 'EXPENSE') {
      if (acc.code.startsWith('5.10') || acc.accountSubtype === 'COGS') {
        cogsRows.push(item);
        totalCogs += netAmount;
      } else if (acc.code.startsWith('5.30') || acc.accountSubtype === 'OTHER_EXPENSE') {
        nonOperatingExpenseRows.push(item);
        totalOtherExpense += netAmount;
      } else {
        opexRows.push(item);
        totalOpex += netAmount;
      }
    }
  }

  // 5. Calculate Standard Multi-Step P&L Metrics
  totalRevenue = round(totalRevenue);
  totalCogs = round(totalCogs);
  const grossProfit = round(totalRevenue - totalCogs);
  const grossProfitMargin = totalRevenue > 0 ? round((grossProfit / totalRevenue) * 100) : 0;

  totalOpex = round(totalOpex);
  const operatingProfit = round(grossProfit - totalOpex);

  totalOtherIncome = round(totalOtherIncome);
  totalOtherExpense = round(totalOtherExpense);
  const netIncome = round(operatingProfit + totalOtherIncome - totalOtherExpense);

  return {
    status: 'SUCCESS',
    period: {
      from: new Date(fromTs),
      to: new Date(toTs),
      label: periodLabel,
    },
    operatingRevenue: operatingRevenueRows,
    costOfGoodsSold: cogsRows,
    operatingExpenses: opexRows,
    nonOperatingRevenue: nonOperatingRevenueRows,
    nonOperatingExpenses: nonOperatingExpenseRows,
    summary: {
      totalRevenue,
      totalCogs,
      grossProfit,
      grossProfitMargin,
      totalOpex,
      operatingProfit,
      totalOtherIncome,
      totalOtherExpense,
      netIncome,
    },
  };
}
