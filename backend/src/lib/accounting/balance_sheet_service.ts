import { db } from "@/lib/db";
import {
  accounts,
  financialYears,
  fiscalYearOpeningBalances,
  journalEntries,
  journalEntryLines,
} from "@/lib/db/accounting_schema";
import { eq, and, sql, inArray } from "drizzle-orm";

export interface ComparativeBalanceSheetParams {
  tenantId: string;
  yearIds?: string[];
  asOfDate?: Date;
}

function toTimestamp(val: any): number {
  if (!val) return 0;
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'number') {
    // If Unix timestamp in seconds (10 digits), convert to milliseconds
    return val < 10000000000 ? val * 1000 : val;
  }
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

export async function getComparativeBalanceSheet({
  tenantId,
  yearIds,
  asOfDate = new Date(),
}: ComparativeBalanceSheetParams) {
  const round = (num: number) => Math.round(num * 100) / 100;
  const asOfTs = toTimestamp(asOfDate);

  // 1. Fetch Target Financial Years in Chronological Order
  const allYears = await db
    .select()
    .from(financialYears)
    .where(eq(financialYears.tenantId, tenantId))
    .orderBy(financialYears.fromDate);

  if (allYears.length === 0) {
    return {
      status: 'NO_FINANCIAL_YEARS',
      message: 'No financial years configured for this tenant.',
      years: [],
      assets: [],
      liabilities: [],
      equity: [],
      totalsByYear: {},
    };
  }

  const selectedYears = yearIds && yearIds.length > 0
    ? allYears.filter((y) => yearIds.includes(y.id))
    : allYears;

  if (selectedYears.length === 0) {
    return {
      status: 'INVALID_YEAR_FILTER',
      message: 'None of the requested financial year IDs match this tenant.',
      years: [],
      assets: [],
      liabilities: [],
      equity: [],
      totalsByYear: {},
    };
  }

  const targetYearIds = selectedYears.map((y) => y.id);

  // 2. Fetch all Accounts for this tenant
  const allAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.tenantId, tenantId))
    .orderBy(accounts.code);

  if (allAccounts.length === 0) {
    return {
      status: 'NO_CHART_OF_ACCOUNTS',
      message: 'No Chart of Accounts found for this tenant.',
      years: [],
      assets: [],
      liabilities: [],
      equity: [],
      totalsByYear: {},
    };
  }

  const permanentAccounts = allAccounts.filter((a) =>
    ['ASSET', 'LIABILITY', 'EQUITY'].includes(a.type)
  );

  const pnlAccounts = allAccounts.filter((a) =>
    ['REVENUE', 'EXPENSE'].includes(a.type)
  );

  // 3. Fetch Stored Opening Balances
  const allOBs = await db
    .select()
    .from(fiscalYearOpeningBalances)
    .where(
      and(
        eq(fiscalYearOpeningBalances.tenantId, tenantId),
        inArray(fiscalYearOpeningBalances.financialYearId, targetYearIds)
      )
    );

  // 4. Fetch Posted Journal Movements
  const yearMovements = await db
    .select({
      journalEntryId: journalEntries.id,
      referenceType: journalEntries.referenceType,
      entryDate: journalEntries.entryDate,
      accountId: journalEntryLines.accountId,
      debit: journalEntryLines.debit,
      credit: journalEntryLines.credit,
    })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .where(
      and(
        eq(journalEntries.tenantId, tenantId),
        eq(journalEntries.status, 'POSTED')
      )
    );

  // Year Column Metadata
  const yearColumns = selectedYears.map((y) => ({
    id: y.id,
    name: y.name,
    fromDate: y.fromDate,
    toDate: y.toDate,
    isClosed: y.isClosed,
    isActive: y.isActive,
  }));

  const assetRows: any[] = [];
  const liabilityRows: any[] = [];
  const equityRows: any[] = [];

  const totalsByYear: Record<string, {
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    totalLiabilitiesAndEquity: number;
    currentPeriodNetIncome: number;
    discrepancy: number;
    isBalanced: boolean;
  }> = {};

  const currentPeriodNetIncomeByYear: Record<string, number> = {};

  // Initialize totals
  for (const y of selectedYears) {
    totalsByYear[y.id] = {
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      totalLiabilitiesAndEquity: 0,
      currentPeriodNetIncome: 0,
      discrepancy: 0,
      isBalanced: false,
    };
    currentPeriodNetIncomeByYear[y.id] = 0;
  }

  // 5. Calculate Current Period P&L Net Income for each year
  // (In open years, P&L is unclosed; adding Net Income to Equity guarantees the Balance Sheet equation balances)
  for (const yr of selectedYears) {
    const fromTs = toTimestamp(yr.fromDate);
    const toTs = yr.isClosed ? toTimestamp(yr.toDate) : asOfTs;

    let periodRevenue = 0;
    let periodExpense = 0;

    for (const pnlAcc of pnlAccounts) {
      const movs = yearMovements.filter((m) => {
        if (m.accountId !== pnlAcc.id) return false;
        // Skip Year-End Close closing entries if inspecting raw P&L
        if (m.referenceType === 'YEAR_END_CLOSE') return false;
        const entryTs = toTimestamp(m.entryDate);
        return entryTs >= fromTs && entryTs <= toTs;
      });

      const totalDr = movs.reduce((sum, m) => sum + m.debit, 0);
      const totalCr = movs.reduce((sum, m) => sum + m.credit, 0);

      if (pnlAcc.type === 'REVENUE') {
        periodRevenue += (totalCr - totalDr);
      } else if (pnlAcc.type === 'EXPENSE') {
        periodExpense += (totalDr - totalCr);
      }
    }

    // In a closed year, Net Income was already moved to Retained Earnings
    // In an open year, Net Income belongs under Equity as Current Period Profit/(Loss)
    const netIncome = yr.isClosed ? 0 : round(periodRevenue - periodExpense);
    currentPeriodNetIncomeByYear[yr.id] = netIncome;
    totalsByYear[yr.id].currentPeriodNetIncome = netIncome;
  }

  // 6. Calculate Balances for Permanent Accounts (Assets, Liabilities, Equity)
  for (const acc of permanentAccounts) {
    const balancesByYear: Record<string, number> = {};

    for (const yr of selectedYears) {
      const fromTs = toTimestamp(yr.fromDate);
      const toTs = yr.isClosed ? toTimestamp(yr.toDate) : asOfTs;

      const ob = allOBs.find((o) => o.financialYearId === yr.id && o.accountId === acc.id);
      const obDebit = ob ? ob.openingDebit : 0;
      const obCredit = ob ? ob.openingCredit : 0;

      const movs = yearMovements.filter((m) => {
        if (m.accountId !== acc.id) return false;
        const entryTs = toTimestamp(m.entryDate);
        return entryTs >= fromTs && entryTs <= toTs;
      });

      const periodDebit = movs.reduce((sum, m) => sum + m.debit, 0);
      const periodCredit = movs.reduce((sum, m) => sum + m.credit, 0);

      const cumulativeDebit = obDebit + periodDebit;
      const cumulativeCredit = obCredit + periodCredit;

      let netBalance = 0;
      if (acc.type === 'ASSET') {
        // Normal Debit balance: Debit - Credit
        netBalance = round(cumulativeDebit - cumulativeCredit);
        totalsByYear[yr.id].totalAssets = round(totalsByYear[yr.id].totalAssets + netBalance);
      } else if (acc.type === 'LIABILITY') {
        // Normal Credit balance: Credit - Debit
        netBalance = round(cumulativeCredit - cumulativeDebit);
        totalsByYear[yr.id].totalLiabilities = round(totalsByYear[yr.id].totalLiabilities + netBalance);
      } else if (acc.type === 'EQUITY') {
        // Normal Credit balance: Credit - Debit
        netBalance = round(cumulativeCredit - cumulativeDebit);
        totalsByYear[yr.id].totalEquity = round(totalsByYear[yr.id].totalEquity + netBalance);
      }

      balancesByYear[yr.id] = netBalance;
    }

    const row = {
      id: acc.id,
      code: acc.code,
      name: acc.name,
      type: acc.type,
      accountSubtype: acc.accountSubtype,
      level: acc.level,
      isControl: acc.isControl,
      balancesByYear,
    };

    if (acc.type === 'ASSET') assetRows.push(row);
    else if (acc.type === 'LIABILITY') liabilityRows.push(row);
    else if (acc.type === 'EQUITY') equityRows.push(row);
  }

  // 7. Inject Current Period Net Income under Equity (Standard Accounting Invariant)
  equityRows.push({
    id: 'virtual_current_period_net_income',
    code: '3.99.99.999',
    name: 'Current Period Net Income / (Loss) YTD',
    type: 'EQUITY',
    accountSubtype: 'CURRENT_EARNINGS',
    level: 5,
    isControl: false,
    balancesByYear: currentPeriodNetIncomeByYear,
  });

  // 8. Finalize Totals and Validate Balance Sheet Invariant: Assets === Liabilities + Equity
  for (const yr of selectedYears) {
    const t = totalsByYear[yr.id];
    // Add current period net income into total equity for unclosed years
    t.totalEquity = round(t.totalEquity + t.currentPeriodNetIncome);
    t.totalLiabilitiesAndEquity = round(t.totalLiabilities + t.totalEquity);
    
    t.discrepancy = round(t.totalAssets - t.totalLiabilitiesAndEquity);
    t.isBalanced = Math.abs(t.discrepancy) <= 0.05;
  }

  return {
    status: 'SUCCESS',
    asOfDate,
    years: yearColumns,
    assets: assetRows,
    liabilities: liabilityRows,
    equity: equityRows,
    totalsByYear,
  };
}
