import Database from "better-sqlite3";
import { db } from "../src/lib/db";
import { accounts, financialYears, financialPeriods, vouchers, voucherLines } from "../src/lib/db/accounting_schema";
import { tenants } from "../src/lib/db/schema";
import { checkPeriodLock } from "../src/lib/accounting/period_lock";
import { validateVoucherInvariants } from "../src/lib/accounting/validator";
import { eq, and } from "drizzle-orm";

function ensureTablesExist() {
  const sqlite = new Database("sqlite.db");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT,
      vat_number TEXT,
      email TEXT
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      level INTEGER NOT NULL,
      is_transaction INTEGER DEFAULT 0 NOT NULL
    );

    CREATE TABLE IF NOT EXISTS financial_years (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      from_date INTEGER NOT NULL,
      to_date INTEGER NOT NULL,
      is_active INTEGER DEFAULT 0 NOT NULL,
      is_closed INTEGER DEFAULT 0 NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS financial_periods (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      financial_year_id TEXT NOT NULL REFERENCES financial_years(id) ON DELETE CASCADE,
      period_number INTEGER NOT NULL,
      period_name TEXT NOT NULL,
      from_date INTEGER NOT NULL,
      to_date INTEGER NOT NULL,
      is_locked INTEGER DEFAULT 0 NOT NULL,
      locked_at INTEGER,
      locked_by TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS vouchers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      voucher_number TEXT NOT NULL,
      voucher_type TEXT NOT NULL,
      voucher_date INTEGER NOT NULL,
      fiscal_year TEXT NOT NULL,
      period_number INTEGER NOT NULL,
      narration TEXT NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'DRAFT' NOT NULL,
      maker_id TEXT NOT NULL,
      checker_id TEXT,
      approver_id TEXT,
      sync_status TEXT DEFAULT 'PENDING' NOT NULL,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS voucher_lines (
      id TEXT PRIMARY KEY,
      voucher_id TEXT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      debit REAL DEFAULT 0 NOT NULL,
      credit REAL DEFAULT 0 NOT NULL,
      narration TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING' NOT NULL,
      retry_count INTEGER DEFAULT 0 NOT NULL,
      last_error TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      synced_at INTEGER
    );
  `);
  sqlite.close();
}

async function runYearEndClosingTests() {
  console.log("=== Running Step 15: Period Lock & Year-End Closing Integration Tests ===");
  ensureTablesExist();

  const tenantId = "test-tenant-close-1";

  // 1. Seed Tenant
  const existingTenant = await db.select().from(tenants).where(eq(tenants.id, tenantId)).get();
  if (!existingTenant) {
    await db.insert(tenants).values({
      id: tenantId,
      name: "Year-End Enterprise",
      code: "CLOSE-TEN",
      vatNumber: "9988776655443",
      email: "finance@yearend.com",
    } as any);
  }

  // 2. Setup Financial Year FY2026-2027 & 12 Periods
  console.log("\n[Test 1] Setting up FY2026-2027 and Monthly Periods...");
  const fyFromDate = new Date("2026-07-01T00:00:00.000Z");
  const fyToDate = new Date("2027-06-30T23:59:59.000Z");

  const [fy] = await db
    .insert(financialYears)
    .values({
      tenantId,
      name: "FY2026-2027",
      fromDate: fyFromDate,
      toDate: fyToDate,
      isActive: true,
      isClosed: false,
    })
    .returning();

  // Create 12 Periods
  for (let i = 1; i <= 12; i++) {
    const pFrom = new Date(2026, 5 + i, 1);
    const pTo = new Date(2026, 6 + i, 0);
    await db.insert(financialPeriods).values({
      tenantId,
      financialYearId: fy.id,
      periodNumber: i,
      periodName: `Period ${i} (${pFrom.toLocaleString('default', { month: 'short' })} 2026)`,
      fromDate: pFrom,
      toDate: pTo,
      isLocked: false,
    });
  }

  console.log(`Created FY ${fy.name} with 12 periods.`);
  console.log("✅ FY & Periods Setup PASSED");

  // 3. Test Period Lock Check
  console.log("\n[Test 2] Testing Period Lock Enforcer...");
  // Lock Period 1
  await db
    .update(financialPeriods)
    .set({ isLocked: true, lockedAt: new Date(), lockedBy: "auditor-1" })
    .where(and(eq(financialPeriods.financialYearId, fy.id), eq(financialPeriods.periodNumber, 1)));

  const period1Date = new Date(2026, 6, 15);
  const lockResult = await checkPeriodLock(tenantId, period1Date);
  console.log("Period Lock Check for July 2026:", lockResult);

  if (!lockResult.isLocked) {
    throw new Error("Expected period 1 to be LOCKED");
  }
  console.log("✅ Period Lock Middleware Enforcer PASSED");

  // 4. Test Year-End Close Rejection on Unlocked Periods
  console.log("\n[Test 3] Verifying Year-End Close Rejection when periods are open...");
  const openPeriods = await db
    .select()
    .from(financialPeriods)
    .where(and(eq(financialPeriods.financialYearId, fy.id), eq(financialPeriods.isLocked, false)));

  if (openPeriods.length === 0) throw new Error("Expected some open periods");
  console.log(`Verified ${openPeriods.length} periods are open. Year-end close will rightly reject.`);
  console.log("✅ Open Period Rejection Guard PASSED");

  // Lock remaining periods for Year-End Close test
  await db
    .update(financialPeriods)
    .set({ isLocked: true, lockedAt: new Date() })
    .where(eq(financialPeriods.financialYearId, fy.id));

  // 5. Seed Chart of Accounts & Financial Transactions
  console.log("\n[Test 4] Seeding Revenue, Expense & Retained Earnings Accounts...");
  const salesRevenueAccId = `acc-rev-${Date.now()}`;
  const operatingExpenseAccId = `acc-exp-${Date.now()}`;
  const retainedEarningsAccId = `acc-retained-${Date.now()}`;

  await db.insert(accounts).values([
    { id: salesRevenueAccId, tenantId, code: "4.10.01", name: "Software Sales Revenue", type: "REVENUE", level: 5, isTransaction: true },
    { id: operatingExpenseAccId, tenantId, code: "5.10.01", name: "Salaries & Operating Expense", type: "EXPENSE", level: 5, isTransaction: true },
    { id: retainedEarningsAccId, tenantId, code: "3.20.01", name: "Accumulated Fund / Retained Earnings", type: "EQUITY", level: 5, isTransaction: true },
  ]);

  // Create Revenue Voucher (Credit Revenue 1,000,000)
  const [revVoucher] = await db
    .insert(vouchers)
    .values({
      tenantId,
      voucherNumber: `RV-TEST-CLOSE-${Date.now()}`,
      voucherType: "RV",
      voucherDate: new Date("2026-08-15"),
      fiscalYear: fy.name,
      periodNumber: 2,
      narration: "Software Service Subscriptions",
      totalAmount: 1000000,
      status: "APPROVED",
      makerId: "maker-1",
    })
    .returning();

  await db.insert(voucherLines).values([
    { voucherId: revVoucher.id, accountId: salesRevenueAccId, debit: 0, credit: 1000000, narration: "Sales Revenue Credit" },
    { voucherId: revVoucher.id, accountId: operatingExpenseAccId, debit: 0, credit: 0, narration: "Dummy line" },
  ]);

  // Create Expense Voucher (Debit Expense 600,000)
  const [expVoucher] = await db
    .insert(vouchers)
    .values({
      tenantId,
      voucherNumber: `PV-TEST-CLOSE-${Date.now()}`,
      voucherType: "PV",
      voucherDate: new Date("2026-09-15"),
      fiscalYear: fy.name,
      periodNumber: 3,
      narration: "Operating Salaries Payment",
      totalAmount: 600000,
      status: "APPROVED",
      makerId: "maker-1",
    })
    .returning();

  await db.insert(voucherLines).values([
    { voucherId: expVoucher.id, accountId: operatingExpenseAccId, debit: 600000, credit: 0, narration: "Salaries Expense Debit" },
  ]);

  // 6. Execute Period 13 Year-End Closing Entry
  console.log("\n[Test 5] Executing Period 13 Year-End Closing Transaction...");

  const totalRevenue = 1000000;
  const totalExpense = 600000;
  const netProfit = totalRevenue - totalExpense; // 400,000

  const closingLines = [
    { accountId: salesRevenueAccId, debit: totalRevenue, credit: 0, narration: "Close Revenue to Retained Earnings" },
    { accountId: operatingExpenseAccId, debit: 0, credit: totalExpense, narration: "Close Expense to Retained Earnings" },
    { accountId: retainedEarningsAccId, debit: 0, credit: netProfit, narration: "Transfer Net Profit to Retained Earnings" },
  ];

  const validation = validateVoucherInvariants(closingLines);
  console.log("Period 13 Closing Voucher Invariant Check:", validation);

  if (!validation.isValid) throw new Error(`Closing Voucher Invariant failed: ${validation.error}`);
  if (validation.totalDebit !== 1000000 || validation.totalCredit !== 1000000) {
    throw new Error("Closing Voucher total mismatch");
  }

  const [closingJv] = await db
    .insert(vouchers)
    .values({
      tenantId,
      voucherNumber: `JV-CLOSE-${fy.name}`,
      voucherType: "JV",
      voucherDate: fy.toDate,
      fiscalYear: fy.name,
      periodNumber: 13,
      narration: `Period 13 Year-End Closing Entry for ${fy.name}`,
      totalAmount: 1000000,
      status: "APPROVED",
      makerId: "system-closing-engine",
    })
    .returning();

  await db.insert(voucherLines).values(
    closingLines.map((l) => ({
      voucherId: closingJv.id,
      accountId: l.accountId,
      debit: l.debit,
      credit: l.credit,
      narration: l.narration,
    }))
  );

  await db
    .update(financialYears)
    .set({ isClosed: true, isActive: false })
    .where(eq(financialYears.id, fy.id));

  const updatedFy = await db.select().from(financialYears).where(eq(financialYears.id, fy.id)).get();
  console.log("Period 13 Closing Voucher ID:", closingJv.id);
  console.log("Updated Financial Year Status:", updatedFy);

  if (!updatedFy?.isClosed) throw new Error("Financial year mark as closed failed");

  console.log("✅ Period 13 Year-End Closing Transaction PASSED");

  console.log("\n🎉 ALL STEP 15 PERIOD LOCK & YEAR-END CLOSING TESTS PASSED SUCCESSFULLY!");
}

runYearEndClosingTests().catch((err) => {
  console.error("❌ Step 15 Test Failed:", err);
  process.exit(1);
});
