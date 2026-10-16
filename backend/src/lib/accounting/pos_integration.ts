import { db } from "@/lib/db";
import { accounts, vouchers, voucherLines, syncQueue } from "@/lib/db/accounting_schema";
import { validateVoucherInvariants } from "@/lib/accounting/validator";
import { generateVoucherNumber } from "@/lib/accounting/voucher_number_generator";
import { eq, and } from "drizzle-orm";

export interface PosInvoiceGlInput {
  tenantId: string;
  invoiceId: string;
  invoiceNumber: string;
  issueDate?: Date | string;
  paymentMethod?: 'CASH' | 'BANK' | 'CARD' | 'CREDIT' | string;
  subtotalAmount: number;
  vatAmount?: number;
  totalAmount: number;
  cogsAmount?: number;
  branchId?: string;
  costCenterId?: string;
  makerId?: string;
}

export async function generatePosInvoiceGlVoucher(input: PosInvoiceGlInput) {
  const {
    tenantId,
    invoiceId,
    invoiceNumber,
    issueDate = new Date(),
    paymentMethod = 'CASH',
    subtotalAmount,
    vatAmount = 0,
    totalAmount,
    cogsAmount = 0,
    branchId,
    costCenterId,
    makerId = 'pos-system-maker',
  } = input;

  const dateObj = new Date(issueDate);
  const method = paymentMethod.toUpperCase();

  // 1. Fetch Tenant Chart of Accounts
  let tenantAccounts = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.tenantId, tenantId), eq(accounts.isTransaction, true)));

  if (tenantAccounts.length === 0) {
    tenantAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.isTransaction, true));
  }

  // Fallback selector helper
  const findAccount = (subtype?: string, type?: string, codePrefix?: string) => {
    if (codePrefix) {
      const match = tenantAccounts.find((a) => a.code.startsWith(codePrefix));
      if (match) return match;
    }
    if (subtype) {
      const match = tenantAccounts.find((a) => a.accountSubtype === subtype);
      if (match) return match;
    }
    if (type) {
      const match = tenantAccounts.find((a) => a.type === type);
      if (match) return match;
    }
    return tenantAccounts[0];
  };

  // Resolve Accounts
  let debitAccount: any;
  if (method === 'CASH') {
    debitAccount = findAccount('CASH', 'ASSET', '1.10.01');
  } else if (method === 'BANK' || method === 'CARD') {
    debitAccount = findAccount('BANK', 'ASSET', '1.10.02');
  } else {
    debitAccount = findAccount('RECEIVABLES', 'ASSET', '1.20.02');
  }

  const revenueAccount = findAccount(undefined, 'REVENUE', '4.10.01');
  const vatAccount = findAccount(undefined, 'LIABILITY', '2.10.03');

  if (!debitAccount || !revenueAccount) {
    throw new Error('Required Chart of Accounts not found for GL voucher generation');
  }

  // Build Voucher Lines
  const lines: any[] = [];

  // Debit: Cash/Bank/AR Account (Total Amount including VAT)
  lines.push({
    accountId: debitAccount.id,
    branchId: branchId || null,
    costCenterId: costCenterId || null,
    debit: totalAmount,
    credit: 0,
    narration: `POS Collection via ${method} for Invoice #${invoiceNumber}`,
  });

  // Credit: Sales Revenue Account (Subtotal Amount)
  lines.push({
    accountId: revenueAccount.id,
    branchId: branchId || null,
    costCenterId: costCenterId || null,
    debit: 0,
    credit: subtotalAmount,
    narration: `POS Retail Grocery Sales Revenue for Invoice #${invoiceNumber}`,
  });

  // Credit: VAT Payable Account (if VAT exists)
  if (vatAmount > 0 && vatAccount) {
    lines.push({
      accountId: vatAccount.id,
      branchId: branchId || null,
      costCenterId: costCenterId || null,
      debit: 0,
      credit: vatAmount,
      narration: `Output VAT collected on Invoice #${invoiceNumber}`,
    });
  }

  // Additional Inventory COGS consumption lines if COGS provided
  if (cogsAmount > 0) {
    const cogsAccount = findAccount(undefined, 'EXPENSE', '5.10.01');
    const stockAccount = findAccount('INVENTORY', 'ASSET', '1.20.01');
    if (cogsAccount && stockAccount) {
      lines.push({
        accountId: cogsAccount.id,
        branchId: branchId || null,
        costCenterId: costCenterId || null,
        debit: cogsAmount,
        credit: 0,
        narration: `COGS Inventory Consumption for Invoice #${invoiceNumber}`,
      });
      lines.push({
        accountId: stockAccount.id,
        branchId: branchId || null,
        costCenterId: costCenterId || null,
        debit: 0,
        credit: cogsAmount,
        narration: `Inventory Stock Reduction for Invoice #${invoiceNumber}`,
      });
    }
  }

  // Validate Double-Entry Balance Invariant
  const validation = validateVoucherInvariants(lines);
  if (!validation.isValid) {
    throw new Error(`POS GL Voucher Invariant validation failed: ${validation.error}`);
  }

  const voucherType = method === 'CREDIT' ? 'JV' : 'RV';
  const { voucherNumber } = await generateVoucherNumber({
    tenantId,
    voucherType,
    date: dateObj,
  });

  let createdVoucher: any = null;

  db.transaction((tx) => {
    const [v] = tx
      .insert(vouchers)
      .values({
        tenantId,
        voucherNumber,
        voucherType,
        voucherDate: dateObj,
        fiscalYear: "2026-2027",
        periodNumber: dateObj.getMonth() + 1,
        costCenterId: costCenterId || null,
        narration: `Automated POS GL Voucher for Invoice #${invoiceNumber} (${method})`,
        totalAmount: validation.totalDebit,
        status: "APPROVED",
        makerId,
        checkerId: "pos-auto-checker",
        approverId: "pos-auto-approver",
        syncStatus: "PENDING",
      })
      .returning()
      .all();

    tx.insert(voucherLines).values(
      lines.map((l) => ({
        voucherId: v.id,
        accountId: l.accountId,
        branchId: l.branchId,
        costCenterId: l.costCenterId,
        debit: l.debit,
        credit: l.credit,
        narration: l.narration,
      }))
    ).run();

    tx.insert(syncQueue)
      .values({
        tenantId,
        entityType: "VOUCHER",
        entityId: v.id,
        action: "INSERT",
        payload: JSON.stringify({ voucher: v, lines }),
        status: "PENDING",
      })
      .run();

    createdVoucher = v;
  });

  return createdVoucher;
}
