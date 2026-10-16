import { db } from "@/lib/db";
import { vouchers, voucherEntryPolicies } from "@/lib/db/accounting_schema";
import { eq, and, gte, lte, count } from "drizzle-orm";

export interface GenerateVoucherNumberParams {
  tenantId: string;
  voucherType: string; // 'PV' | 'RV' | 'CV' | 'JV'
  date?: Date | string;
  tx?: any;
}

export async function generateVoucherNumber({
  tenantId,
  voucherType,
  date,
  tx,
}: GenerateVoucherNumberParams): Promise<{ voucherNumber: string; sequenceNumber: number; formula: string }> {
  const dateObj = date ? new Date(date) : new Date();
  const dbClient = tx || db;

  // 1. Fetch Tenant Policy
  let policy: any = null;
  try {
    policy = await dbClient
      .select()
      .from(voucherEntryPolicies)
      .where(eq(voucherEntryPolicies.tenantId, tenantId))
      .get();
  } catch (e) {
    policy = null;
  }

  const formula = policy?.numberingFormula || '{TYPE}-{YYYY}-{MM}-{DD}-{SEQ}';
  const resetPeriod = policy?.resetPeriod || 'YEARLY';
  const seqPadding = Number(policy?.seqPadding) || 6;

  // Resolve Type Code
  const normType = (voucherType || 'JV').toUpperCase();
  let typeCode = normType;
  if (normType === 'PV') typeCode = policy?.pvCode || 'PV';
  else if (normType === 'RV') typeCode = policy?.rvCode || 'RV';
  else if (normType === 'CV') typeCode = policy?.cvCode || 'CV';
  else if (normType === 'JV') typeCode = policy?.jvCode || 'JV';

  // 2. Calculate Date Boundaries for Reset Sequence
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  const day = dateObj.getDate();

  if (resetPeriod === 'DAILY') {
    startDate = new Date(year, month, day, 0, 0, 0, 0);
    endDate = new Date(year, month, day, 23, 59, 59, 999);
  } else if (resetPeriod === 'MONTHLY') {
    startDate = new Date(year, month, 1, 0, 0, 0, 0);
    endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
  } else if (resetPeriod === 'QUARTERLY') {
    const qMonth = Math.floor(month / 3) * 3;
    startDate = new Date(year, qMonth, 1, 0, 0, 0, 0);
    endDate = new Date(year, qMonth + 3, 0, 23, 59, 59, 999);
  } else if (resetPeriod === 'YEARLY') {
    startDate = new Date(year, 0, 1, 0, 0, 0, 0);
    endDate = new Date(year, 11, 31, 23, 59, 59, 999);
  } else {
    // 'NEVER'
    startDate = null;
    endDate = null;
  }

  // 3. Count matching vouchers in the reset window
  const conditions = [
    eq(vouchers.tenantId, tenantId),
    eq(vouchers.voucherType, normType),
  ];

  if (startDate && endDate) {
    conditions.push(gte(vouchers.voucherDate, startDate));
    conditions.push(lte(vouchers.voucherDate, endDate));
  }

  let seqNum = 1;
  try {
    const res = await dbClient
      .select({ val: count() })
      .from(vouchers)
      .where(and(...conditions))
      .get();

    seqNum = (res?.val || 0) + 1;
  } catch (e) {
    console.error("Sequence count query warning:", e);
    seqNum = 1;
  }

  // 4. Format Sequence with padding
  const seqFormatted = String(seqNum).padStart(seqPadding, '0');

  // 5. Apply Formula Variables
  const YYYY = String(year);
  const YY = String(year).slice(-2);
  const MM = String(month + 1).padStart(2, '0');
  const DD = String(day).padStart(2, '0');

  const voucherNumber = formula
    .replace('{TYPE}', typeCode)
    .replace('{YYYY}', YYYY)
    .replace('{YY}', YY)
    .replace('{MM}', MM)
    .replace('{DD}', DD)
    .replace('{SEQ}', seqFormatted);

  return { voucherNumber, sequenceNumber: seqNum, formula };
}
