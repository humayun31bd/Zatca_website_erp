import { db } from "@/lib/db";
import {
  accounts,
  financialYears,
  fiscalYearOpeningBalances,
  journalEntries,
  journalEntryLines,
} from "@/lib/db/accounting_schema";
import { eq, and, sql } from "drizzle-orm";

export interface TrialBalanceParams {
  tenantId: string;
  startDate?: string | Date;
  endDate?: string | Date;
  level?: number; // Optional filter by COA level (e.g. 5 for posting accounts, or all)
  hideZeroBalances?: boolean;
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

export interface SixColumnTrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: string;
  level: number;
  isControl: boolean;
  // 1. Opening Balance Columns
  openingDebit: number;
  openingCredit: number;
  // 2. Transactional Movement Columns
  transactionDebit: number;
  transactionCredit: number;
  // 3. Closing Balance Columns
  closingDebit: number;
  closingCredit: number;
}

export async function generateSixColumnTrialBalance({
  tenantId,
  startDate,
  endDate,
  level,
  hideZeroBalances = false,
}: TrialBalanceParams) {
  const round = (num: number) => Math.round(num * 100) / 100;

  // 1. Parse Arbitrary Date Range
  const now = new Date();
  let fromTs: number;
  let toTs: number;

  if (startDate) {
    const s = new Date(startDate);
    s.setHours(0, 0, 0, 0);
    fromTs = s.getTime();
  } else {
    // Default to start of current calendar year
    fromTs = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0).getTime();
  }

  if (endDate) {
    const e = new Date(endDate);
    e.setHours(23, 59, 59, 999); // Full day inclusive
    toTs = e.getTime();
  } else {
    toTs = now.getTime();
  }

  if (fromTs > toTs) {
    throw new Error(`Invalid date range: startDate (${new Date(fromTs).toISOString()}) cannot be after endDate (${new Date(toTs).toISOString()}).`);
  }

  // 2. Fetch Chart of Accounts
  let accQuery = db
    .select()
    .from(accounts)
    .where(and(eq(accounts.tenantId, tenantId), eq(accounts.isActive, true)))
    .orderBy(accounts.code);

  const allAccounts = await accQuery;
  const filteredAccounts = level ? allAccounts.filter((a) => a.level === level) : allAccounts;

  if (filteredAccounts.length === 0) {
    return {
      status: 'EMPTY',
      message: 'No accounts found matching criteria.',
      dateRange: { fromDate: new Date(fromTs), toDate: new Date(toTs) },
      columns: ['Opening Debit', 'Opening Credit', 'Transaction Debit', 'Transaction Credit', 'Closing Debit', 'Closing Credit'],
      rows: [],
      totals: {
        openingDebit: 0,
        openingCredit: 0,
        transactionDebit: 0,
        transactionCredit: 0,
        closingDebit: 0,
        closingCredit: 0,
      },
      invariants: {
        openingBalanced: true,
        transactionsBalanced: true,
        closingBalanced: true,
      },
    };
  }

  // 3. Find Relevant Financial Year covering startDate (if any)
  const allYears = await db
    .select()
    .from(financialYears)
    .where(eq(financialYears.tenantId, tenantId))
    .orderBy(financialYears.fromDate);

  const coveringFY = allYears.find((y) => {
    const yFrom = toTimestamp(y.fromDate);
    const yTo = toTimestamp(y.toDate);
    return fromTs >= yFrom && fromTs <= yTo;
  });

  // 4. Fetch Base Opening Balances for covering Financial Year
  let baseOBMap = new Map<string, { debit: number; credit: number }>();
  let baseFromTs = 0;

  if (coveringFY) {
    baseFromTs = toTimestamp(coveringFY.fromDate);
    const obs = await db
      .select()
      .from(fiscalYearOpeningBalances)
      .where(
        and(
          eq(fiscalYearOpeningBalances.tenantId, tenantId),
          eq(fiscalYearOpeningBalances.financialYearId, coveringFY.id)
        )
      );

    for (const ob of obs) {
      baseOBMap.set(ob.accountId, {
        debit: ob.openingDebit,
        credit: ob.openingCredit,
      });
    }
  }

  // 5. Fetch ALL Posted Journal Entries up to endDate
  // Exclude 'YEAR_END_CLOSE' entries from operational transaction totals
  const allMovements = await db
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

  // 6. Aggregate Movements: Pre-Period (for Opening Balance) & In-Period (for Transactional Balance)
  const prePeriodMap = new Map<string, { debit: number; credit: number }>();
  const inPeriodMap = new Map<string, { debit: number; credit: number }>();

  for (const m of allMovements) {
    const entryTs = toTimestamp(m.entryDate);

    // Pre-period movement (from base financial year start date up to fromTs - 1)
    if (entryTs >= baseFromTs && entryTs < fromTs) {
      const cur = prePeriodMap.get(m.accountId) || { debit: 0, credit: 0 };
      cur.debit += m.debit;
      cur.credit += m.credit;
      prePeriodMap.set(m.accountId, cur);
    }
    // In-period movement (between fromTs and toTs inclusive)
    else if (entryTs >= fromTs && entryTs <= toTs) {
      const cur = inPeriodMap.get(m.accountId) || { debit: 0, credit: 0 };
      cur.debit += m.debit;
      cur.credit += m.credit;
      inPeriodMap.set(m.accountId, cur);
    }
  }

  // 7. Calculate 6 Columns for each Account
  const rows: SixColumnTrialBalanceRow[] = [];

  let grandTotalOpeningDebit = 0;
  let grandTotalOpeningCredit = 0;
  let grandTotalTxDebit = 0;
  let grandTotalTxCredit = 0;
  let grandTotalClosingDebit = 0;
  let grandTotalClosingCredit = 0;

  for (const acc of filteredAccounts) {
    const baseOB = baseOBMap.get(acc.id) || { debit: 0, credit: 0 };
    const preMov = prePeriodMap.get(acc.id) || { debit: 0, credit: 0 };
    const inMov = inPeriodMap.get(acc.id) || { debit: 0, credit: 0 };

    // --- COLUMN 1 & 2: OPENING BALANCE AS OF startDate ---
    // Net opening position = (Annual Opening + Pre-Period Movements)
    const cumulativePreDebit = baseOB.debit + preMov.debit;
    const cumulativePreCredit = baseOB.credit + preMov.credit;
    const netOpening = round(cumulativePreDebit - cumulativePreCredit);

    let openingDebit = 0;
    let openingCredit = 0;
    if (netOpening > 0) {
      openingDebit = netOpening;
    } else if (netOpening < 0) {
      openingCredit = Math.abs(netOpening);
    }

    // --- COLUMN 3 & 4: TRANSACTIONAL MOVEMENTS (startDate to endDate) ---
    const transactionDebit = round(inMov.debit);
    const transactionCredit = round(inMov.credit);

    // --- COLUMN 5 & 6: CLOSING BALANCE AS OF endDate ---
    // Net Closing = Opening Net + (Period Debits - Period Credits)
    const netClosing = round(netOpening + (transactionDebit - transactionCredit));

    let closingDebit = 0;
    let closingCredit = 0;
    if (netClosing > 0) {
      closingDebit = netClosing;
    } else if (netClosing < 0) {
      closingCredit = Math.abs(netClosing);
    }

    // Skip row if user requested hiding zero balances and all 6 columns are 0
    const isZero =
      openingDebit === 0 &&
      openingCredit === 0 &&
      transactionDebit === 0 &&
      transactionCredit === 0 &&
      closingDebit === 0 &&
      closingCredit === 0;

    if (hideZeroBalances && isZero) {
      continue;
    }

    rows.push({
      accountId: acc.id,
      code: acc.code,
      name: acc.name,
      type: acc.type,
      level: acc.level,
      isControl: acc.isControl,
      openingDebit,
      openingCredit,
      transactionDebit,
      transactionCredit,
      closingDebit,
      closingCredit,
    });

    // Accumulate grand totals
    grandTotalOpeningDebit = round(grandTotalOpeningDebit + openingDebit);
    grandTotalOpeningCredit = round(grandTotalOpeningCredit + openingCredit);
    grandTotalTxDebit = round(grandTotalTxDebit + transactionDebit);
    grandTotalTxCredit = round(grandTotalTxCredit + transactionCredit);
    grandTotalClosingDebit = round(grandTotalClosingDebit + closingDebit);
    grandTotalClosingCredit = round(grandTotalClosingCredit + closingCredit);
  }

  // 8. Invariant Verifications (Double-Entry Equation Assertions)
  const openingBalanced = Math.abs(grandTotalOpeningDebit - grandTotalOpeningCredit) <= 0.05;
  const transactionsBalanced = Math.abs(grandTotalTxDebit - grandTotalTxCredit) <= 0.05;
  const closingBalanced = Math.abs(grandTotalClosingDebit - grandTotalClosingCredit) <= 0.05;

  return {
    status: 'SUCCESS',
    dateRange: {
      fromDate: new Date(fromTs),
      toDate: new Date(toTs),
      label: `From ${new Date(fromTs).toISOString().split('T')[0]} to ${new Date(toTs).toISOString().split('T')[0]}`,
      coveringFinancialYear: coveringFY ? coveringFY.name : 'All Inception History',
    },
    columns: [
      { key: 'openingDebit', label: 'Opening Debit' },
      { key: 'openingCredit', label: 'Opening Credit' },
      { key: 'transactionDebit', label: 'Transaction Debit' },
      { key: 'transactionCredit', label: 'Transaction Credit' },
      { key: 'closingDebit', label: 'Closing Debit' },
      { key: 'closingCredit', label: 'Closing Credit' },
    ],
    rows,
    totals: {
      openingDebit: grandTotalOpeningDebit,
      openingCredit: grandTotalOpeningCredit,
      openingDifference: round(grandTotalOpeningDebit - grandTotalOpeningCredit),

      transactionDebit: grandTotalTxDebit,
      transactionCredit: grandTotalTxCredit,
      transactionDifference: round(grandTotalTxDebit - grandTotalTxCredit),

      closingDebit: grandTotalClosingDebit,
      closingCredit: grandTotalClosingCredit,
      closingDifference: round(grandTotalClosingDebit - grandTotalClosingCredit),
    },
    invariants: {
      openingBalanced,
      transactionsBalanced,
      closingBalanced,
      allBalanced: openingBalanced && transactionsBalanced && closingBalanced,
    },
  };
}
