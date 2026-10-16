import { db } from "@/lib/db";
import {
  accounts,
  journalEntries,
  journalEntryLines,
  financialYears,
  financialPeriods,
  fiscalYearOpeningBalances,
  yearEndClosingAudit,
} from "@/lib/db/accounting_schema";
import { eq, and, sql } from "drizzle-orm";

export interface ExecuteYearEndCloseParams {
  tenantId: string;
  closingYearId: string;
  nextYearId: string;
  retainedEarningsAccountId: string;
  closedByUserId: string;
}

/**
 * Executes Fiscal Year-End Closing & Multi-Year Roll-Forward.
 * 1. Closes P&L (Revenue & Expenses) into Retained Earnings.
 * 2. Rolls forward permanent accounts into next year's opening balances.
 * 3. Permanently locks the closed year and its periods.
 * 4. Preserves all historical records without mutation.
 */
export async function executeYearEndClose({
  tenantId,
  closingYearId,
  nextYearId,
  retainedEarningsAccountId,
  closedByUserId,
}: ExecuteYearEndCloseParams) {
  return await db.transaction(async (tx) => {
    // 1. Validate Closing Year
    const [closingYear] = await tx
      .select()
      .from(financialYears)
      .where(and(eq(financialYears.id, closingYearId), eq(financialYears.tenantId, tenantId)))
      .limit(1);

    if (!closingYear) {
      throw new Error(`Financial Year ${closingYearId} not found.`);
    }

    if (closingYear.isClosed) {
      throw new Error(`Financial Year '${closingYear.name}' is ALREADY CLOSED.`);
    }

    // 2. Validate Next Year (Destination for Roll-Forward)
    const [nextYear] = await tx
      .select()
      .from(financialYears)
      .where(and(eq(financialYears.id, nextYearId), eq(financialYears.tenantId, tenantId)))
      .limit(1);

    if (!nextYear) {
      throw new Error(`Next Financial Year ${nextYearId} not found. Please create the next financial year first.`);
    }

    // 3. Validate Retained Earnings Account
    const [retainedAccount] = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, retainedEarningsAccountId), eq(accounts.tenantId, tenantId)))
      .limit(1);

    if (!retainedAccount || retainedAccount.type !== 'EQUITY') {
      throw new Error("Invalid Retained Earnings Account. Must be an active EQUITY account.");
    }

    // 4. Fetch all active accounts
    const allAccounts = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.tenantId, tenantId), eq(accounts.isActive, true)));

    // 5. Fetch Opening Balances of the Closing Year
    const currentOBs = await tx
      .select()
      .from(fiscalYearOpeningBalances)
      .where(
        and(
          eq(fiscalYearOpeningBalances.tenantId, tenantId),
          eq(fiscalYearOpeningBalances.financialYearId, closingYearId)
        )
      );

    const obMap = new Map(currentOBs.map((o) => [o.accountId, o]));

    // 6. Aggregate all movements in the closing financial year
    const movements = await tx
      .select({
        accountId: journalEntryLines.accountId,
        totalDebit: sql<number>`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
        totalCredit: sql<number>`COALESCE(SUM(${journalEntryLines.credit}), 0)`,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(journalEntries.tenantId, tenantId),
          eq(journalEntries.status, 'POSTED'),
          sql`${journalEntries.entryDate} >= ${closingYear.fromDate}`,
          sql`${journalEntries.entryDate} <= ${closingYear.toDate}`
        )
      )
      .groupBy(journalEntryLines.accountId);

    const movementMap = new Map(movements.map((m) => [m.accountId, m]));

    const round = (num: number) => Math.round(num * 100) / 100;

    let totalRevenue = 0;
    let totalExpense = 0;
    const closingPermanentBalances: Array<{
      accountId: string;
      endingDebit: number;
      endingCredit: number;
    }> = [];

    const pnlClosingLines: Array<{
      accountId: string;
      debit: number;
      credit: number;
      description: string;
    }> = [];

    // 7. Calculate P&L Net Income and Ending Permanent Balances
    for (const acc of allAccounts) {
      const ob = obMap.get(acc.id) || { openingDebit: 0, openingCredit: 0 };
      const mov = movementMap.get(acc.id) || { totalDebit: 0, totalCredit: 0 };

      const netDebit = round(ob.openingDebit + mov.totalDebit);
      const netCredit = round(ob.openingCredit + mov.totalCredit);

      if (acc.type === 'REVENUE') {
        const netRev = round(netCredit - netDebit);
        totalRevenue += netRev;
        if (netRev !== 0) {
          // Debit revenue to zero it out
          pnlClosingLines.push({
            accountId: acc.id,
            debit: netRev > 0 ? netRev : 0,
            credit: netRev < 0 ? Math.abs(netRev) : 0,
            description: `Year-end zeroing of revenue account ${acc.code} ${acc.name}`,
          });
        }
      } else if (acc.type === 'EXPENSE') {
        const netExp = round(netDebit - netCredit);
        totalExpense += netExp;
        if (netExp !== 0) {
          // Credit expense to zero it out
          pnlClosingLines.push({
            accountId: acc.id,
            debit: netExp < 0 ? Math.abs(netExp) : 0,
            credit: netExp > 0 ? netExp : 0,
            description: `Year-end zeroing of expense account ${acc.code} ${acc.name}`,
          });
        }
      } else {
        // Permanent Account: ASSET, LIABILITY, EQUITY
        closingPermanentBalances.push({
          accountId: acc.id,
          endingDebit: netDebit,
          endingCredit: netCredit,
        });
      }
    }

    const netIncome = round(totalRevenue - totalExpense);

    // 8. Add Retained Earnings balancing line in P&L Closing Journal Entry
    if (netIncome !== 0) {
      pnlClosingLines.push({
        accountId: retainedEarningsAccountId,
        debit: netIncome < 0 ? Math.abs(netIncome) : 0,
        credit: netIncome > 0 ? netIncome : 0,
        description: `Net Income (${netIncome >= 0 ? 'Profit' : 'Loss'}) transferred to Retained Earnings for ${closingYear.name}`,
      });
    }

    // 9. Post the Year-End Closing Journal Entry
    let closingJEId: string | null = null;
    if (pnlClosingLines.length > 0) {
      const [je] = await tx
        .insert(journalEntries)
        .values({
          tenantId,
          entryNumber: `JE-CLOSE-${closingYear.name}`,
          referenceType: 'YEAR_END_CLOSE',
          referenceId: closingYearId,
          entryDate: closingYear.toDate,
          description: `Year-End Close & Retained Earnings Transfer for ${closingYear.name}`,
          status: 'POSTED',
        })
        .returning();

      await tx.insert(journalEntryLines).values(
        pnlClosingLines.map((l) => ({
          journalEntryId: je.id,
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
          description: l.description,
        }))
      );
      closingJEId = je.id;
    }

    // 10. Roll-Forward: Seed the Next Year's Opening Balances
    for (const item of closingPermanentBalances) {
      let finalDr = item.endingDebit;
      let finalCr = item.endingCredit;

      // Adjust Retained Earnings to include this year's Net Income
      if (item.accountId === retainedEarningsAccountId) {
        if (netIncome > 0) finalCr = round(finalCr + netIncome);
        else finalDr = round(finalDr + Math.abs(netIncome));
      }

      const net = round(finalDr - finalCr);

      // Check if opening balance row already exists in next year
      const [existingNextOB] = await tx
        .select()
        .from(fiscalYearOpeningBalances)
        .where(
          and(
            eq(fiscalYearOpeningBalances.tenantId, tenantId),
            eq(fiscalYearOpeningBalances.financialYearId, nextYearId),
            eq(fiscalYearOpeningBalances.accountId, item.accountId)
          )
        )
        .limit(1);

      if (existingNextOB) {
        await tx
          .update(fiscalYearOpeningBalances)
          .set({
            openingDebit: finalDr,
            openingCredit: finalCr,
            openingNet: net,
            isGenesis: false,
            updatedAt: new Date(),
          })
          .where(eq(fiscalYearOpeningBalances.id, existingNextOB.id));
      } else {
        await tx.insert(fiscalYearOpeningBalances).values({
          tenantId,
          financialYearId: nextYearId,
          accountId: item.accountId,
          openingDebit: finalDr,
          openingCredit: finalCr,
          openingNet: net,
          isGenesis: false,
        });
      }
    }

    // 11. Lock the Closing Financial Year & its Financial Periods Permanently
    await tx
      .update(financialYears)
      .set({
        isClosed: true,
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(financialYears.id, closingYearId));

    await tx
      .update(financialPeriods)
      .set({
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: closedByUserId,
      })
      .where(eq(financialPeriods.financialYearId, closingYearId));

    // Activate the next financial year
    await tx
      .update(financialYears)
      .set({
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(financialYears.id, nextYearId));

    // 12. Write to Year-End Closing Audit Log
    await tx.insert(yearEndClosingAudit).values({
      tenantId,
      financialYearId: closingYearId,
      closingJournalEntryId: closingJEId || 'NO_PNL_MOVEMENTS',
      netIncomeAmount: netIncome,
      closedByUserId,
    });

    return {
      success: true,
      closingYear: closingYear.name,
      nextYear: nextYear.name,
      netIncome,
      totalRevenue,
      totalExpense,
      closingJournalEntryId: closingJEId,
    };
  });
}
