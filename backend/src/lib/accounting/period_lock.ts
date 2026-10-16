import { db } from "@/lib/db";
import { financialPeriods } from "@/lib/db/accounting_schema";
import { eq, and, lte, gte } from "drizzle-orm";

export interface PeriodLockCheckResult {
  isLocked: boolean;
  periodName?: string;
  reason?: string;
}

export async function checkPeriodLock(
  tenantId: string,
  entryDate: Date
): Promise<PeriodLockCheckResult> {
  const targetDate = new Date(entryDate);

  const lockedPeriod = await db
    .select()
    .from(financialPeriods)
    .where(
      and(
        eq(financialPeriods.tenantId, tenantId),
        eq(financialPeriods.isLocked, true),
        lte(financialPeriods.fromDate, targetDate),
        gte(financialPeriods.toDate, targetDate)
      )
    )
    .limit(1);

  if (lockedPeriod && lockedPeriod.length > 0) {
    const period = lockedPeriod[0];
    return {
      isLocked: true,
      periodName: period.periodName,
      reason: `Accounting Period '${period.periodName}' is LOCKED for posting. Retroactive entries are not permitted.`,
    };
  }

  return { isLocked: false };
}

export async function enforcePeriodLock(tenantId: string, entryDate: Date): Promise<void> {
  const check = await checkPeriodLock(tenantId, entryDate);
  if (check.isLocked) {
    throw new Error(check.reason);
  }
}
