import { db } from "@/lib/db";
import {
  accounts,
  financialYears,
  fiscalYearOpeningBalances,
  journalEntries,
  journalEntryLines,
} from "@/lib/db/accounting_schema";
import { eq, and, sql } from "drizzle-orm";

export interface OpeningBalanceLineInput {
  accountId: string;
  debit: number;
  credit: number;
}

export interface SetOpeningBalancesParams {
  tenantId: string;
  financialYearId: string;
  lines: OpeningBalanceLineInput[];
  entryDate?: Date;
  isGenesis?: boolean;
}

/**
 * Sets or updates the Opening Balance Sheet for a financial year.
 * Preserves the Genesis year balance sheet and enforces strict double-entry balance.
 */
export async function setFiscalYearOpeningBalances({
  tenantId,
  financialYearId,
  lines,
  entryDate = new Date(),
  isGenesis = false,
}: SetOpeningBalancesParams) {
  // 1. Verify Financial Year status
  const [fy] = await db
    .select()
    .from(financialYears)
    .where(and(eq(financialYears.id, financialYearId), eq(financialYears.tenantId, tenantId)))
    .limit(1);

  if (!fy) {
    throw new Error(`Financial Year ${financialYearId} not found.`);
  }

  if (fy.isClosed) {
    throw new Error(`Financial Year '${fy.name}' is CLOSED. Opening balances cannot be modified.`);
  }

  // 2. Validate Double-Entry Invariant (Total Debits == Total Credits)
  const round = (num: number) => Math.round(num * 100) / 100;
  const totalDebit = round(lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0));
  const totalCredit = round(lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0));

  if (Math.abs(totalDebit - totalCredit) > 0.05) {
    throw new Error(
      `Opening Balance Sheet is unbalanced! Total Debits: ${totalDebit}, Total Credits: ${totalCredit}. Discrepancy: ${round(totalDebit - totalCredit)}`
    );
  }

  return await db.transaction(async (tx) => {
    // 3. Check if Genesis year: If no previous year exists or isGenesis is explicitly true
    const previousYears = await tx
      .select({ id: financialYears.id })
      .from(financialYears)
      .where(and(eq(financialYears.tenantId, tenantId), sql`${financialYears.fromDate} < ${fy.fromDate}`))
      .limit(1);

    const actualIsGenesis = isGenesis || previousYears.length === 0;

    // 4. Upsert/Update the Opening Balance Snapshots
    for (const line of lines) {
      const dr = round(Number(line.debit) || 0);
      const cr = round(Number(line.credit) || 0);
      const net = round(dr - cr);

      const [existing] = await tx
        .select()
        .from(fiscalYearOpeningBalances)
        .where(
          and(
            eq(fiscalYearOpeningBalances.tenantId, tenantId),
            eq(fiscalYearOpeningBalances.financialYearId, financialYearId),
            eq(fiscalYearOpeningBalances.accountId, line.accountId)
          )
        )
        .limit(1);

      if (existing) {
        await tx
          .update(fiscalYearOpeningBalances)
          .set({
            openingDebit: dr,
            openingCredit: cr,
            openingNet: net,
            isGenesis: actualIsGenesis,
            updatedAt: new Date(),
          })
          .where(eq(fiscalYearOpeningBalances.id, existing.id));
      } else {
        await tx.insert(fiscalYearOpeningBalances).values({
          tenantId,
          financialYearId,
          accountId: line.accountId,
          openingDebit: dr,
          openingCredit: cr,
          openingNet: net,
          isGenesis: actualIsGenesis,
        });
      }
    }

    // 5. Post or Update the Official Opening Journal Entry (JE)
    const existingJEs = await tx
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.tenantId, tenantId),
          eq(journalEntries.referenceType, 'OPENING_BALANCE'),
          eq(journalEntries.referenceId, financialYearId)
        )
      )
      .limit(1);

    let jeId = existingJEs[0]?.id;

    if (!jeId) {
      const entryNumber = actualIsGenesis
        ? `JE-GENESIS-OB-${fy.name}`
        : `JE-OB-${fy.name}`;

      const [newJE] = await tx
        .insert(journalEntries)
        .values({
          tenantId,
          entryNumber,
          referenceType: 'OPENING_BALANCE',
          referenceId: financialYearId,
          entryDate: fy.fromDate || entryDate,
          description: actualIsGenesis
            ? `Genesis Inaugural Opening Balance Sheet for ${fy.name}`
            : `Opening Balance Sheet Roll-Forward for ${fy.name}`,
          status: 'POSTED',
        })
        .returning();
      jeId = newJE.id;
    } else {
      // Clear old lines to rewrite with fresh inputs
      await tx.delete(journalEntryLines).where(eq(journalEntryLines.journalEntryId, jeId));
    }

    // Insert journal lines for accounts with non-zero balances
    const activeLines = lines.filter((l) => (l.debit || 0) > 0 || (l.credit || 0) > 0);
    if (activeLines.length > 0) {
      await tx.insert(journalEntryLines).values(
        activeLines.map((l) => ({
          journalEntryId: jeId,
          accountId: l.accountId,
          debit: round(Number(l.debit) || 0),
          credit: round(Number(l.credit) || 0),
          description: `Opening Balance for ${fy.name}`,
        }))
      );
    }

    return {
      success: true,
      financialYearName: fy.name,
      isGenesis: actualIsGenesis,
      totalDebit,
      totalCredit,
      journalEntryId: jeId,
      recordCount: lines.length,
    };
  });
}

/**
 * Retrieves the Opening Balance Sheet for a given financial year.
 */
export async function getFiscalYearOpeningBalances(tenantId: string, financialYearId: string) {
  const [fy] = await db
    .select()
    .from(financialYears)
    .where(and(eq(financialYears.id, financialYearId), eq(financialYears.tenantId, tenantId)))
    .limit(1);

  if (!fy) {
    throw new Error(`Financial Year ${financialYearId} not found.`);
  }

  // Fetch all accounts
  const allAccounts = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.tenantId, tenantId), eq(accounts.isActive, true)))
    .orderBy(accounts.code);

  // Fetch stored opening balances
  const storedOBs = await db
    .select()
    .from(fiscalYearOpeningBalances)
    .where(
      and(
        eq(fiscalYearOpeningBalances.tenantId, tenantId),
        eq(fiscalYearOpeningBalances.financialYearId, financialYearId)
      )
    );

  const obMap = new Map(storedOBs.map((o) => [o.accountId, o]));

  let totalDebit = 0;
  let totalCredit = 0;
  let isGenesis = false;

  const rows = allAccounts.map((acc) => {
    const ob = obMap.get(acc.id);
    const debit = ob ? ob.openingDebit : 0;
    const credit = ob ? ob.openingCredit : 0;
    if (ob?.isGenesis) isGenesis = true;

    totalDebit += debit;
    totalCredit += credit;

    return {
      accountId: acc.id,
      code: acc.code,
      name: acc.name,
      type: acc.type,
      accountSubtype: acc.accountSubtype,
      level: acc.level,
      isTransaction: acc.isTransaction,
      openingDebit: debit,
      openingCredit: credit,
      openingNet: debit - credit,
    };
  });

  return {
    financialYear: fy,
    isGenesis,
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    isBalanced: Math.abs(totalDebit - totalCredit) <= 0.05,
    balances: rows,
  };
}
