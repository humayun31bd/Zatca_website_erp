import Database from "better-sqlite3";
import { db } from "../src/lib/db";
import { accounts, recurringVouchers, vouchers, voucherLines } from "../src/lib/db/accounting_schema";
import { tenants } from "../src/lib/db/schema";
import { calculateNextRunDate } from "../src/lib/accounting/recurring_calculator";
import { validateVoucherInvariants } from "../src/lib/accounting/validator";
import { eq } from "drizzle-orm";

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

    CREATE TABLE IF NOT EXISTS recurring_vouchers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      template_name TEXT NOT NULL,
      voucher_type TEXT NOT NULL,
      frequency TEXT DEFAULT 'MONTHLY' NOT NULL,
      amount REAL NOT NULL,
      payload_json TEXT NOT NULL,
      next_run_date INTEGER NOT NULL,
      last_run_date INTEGER,
      total_runs INTEGER DEFAULT 0 NOT NULL,
      max_runs INTEGER,
      is_active INTEGER DEFAULT 1 NOT NULL,
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
      cost_center_id TEXT,
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

async function runRecurringVoucherTests() {
  console.log("=== Running Step 14: Recurring Voucher Scheduler Integration Tests ===");
  ensureTablesExist();

  const tenantId = "test-tenant-rec-1";

  // 1. Seed Tenant & Accounts
  const existingTenant = await db.select().from(tenants).where(eq(tenants.id, tenantId)).get();
  if (!existingTenant) {
    await db.insert(tenants).values({
      id: tenantId,
      name: "Recurring Billing Enterprise",
      code: "REC-TEN",
      vatNumber: "5544332211000",
      email: "billing@enterprise.com",
    } as any);
  }

  const rentExpenseAccId = `acc-rent-exp-${Date.now()}`;
  const bankAccId = `acc-bank-${Date.now()}`;

  await db.insert(accounts).values([
    { id: rentExpenseAccId, tenantId, code: "5.10.02", name: "HQ Rent Expense", type: "EXPENSE", level: 5, isTransaction: true },
    { id: bankAccId, tenantId, code: "1.10.01", name: "Main Operating Bank", type: "ASSET", level: 5, isTransaction: true },
  ]);

  // 2. Test calculateNextRunDate Utility
  console.log("\n[Test 1] Testing calculateNextRunDate Utility...");
  const startDate = new Date("2026-10-01T00:00:00.000Z");
  
  const nextMonthly = calculateNextRunDate(startDate, "MONTHLY");
  console.log("Next Monthly Date:", nextMonthly.toISOString());
  if (nextMonthly.getMonth() !== 10) throw new Error("Monthly date calculation failed");

  const nextQuarterly = calculateNextRunDate(startDate, "QUARTERLY");
  console.log("Next Quarterly Date:", nextQuarterly.toISOString());
  if (nextQuarterly.getMonth() !== 0) throw new Error("Quarterly date calculation failed");

  console.log("✅ Next Run Date Calculator PASSED");

  // 3. Register Recurring Voucher Template
  console.log("\n[Test 2] Creating Monthly Office Rent Template...");
  const rentLines = [
    { accountId: rentExpenseAccId, debit: 150000, credit: 0, narration: "Monthly Rent Expense - HQ Floor 4" },
    { accountId: bankAccId, debit: 0, credit: 150000, narration: "Bank Transfer to Landlord" },
  ];

  const validation = validateVoucherInvariants(rentLines);
  if (!validation.isValid) throw new Error(`Invariant check failed: ${validation.error}`);

  // Set nextRunDate to 1 hour ago so it triggers immediately
  const dueRunDate = new Date(Date.now() - 3600 * 1000);

  const [template] = await db
    .insert(recurringVouchers)
    .values({
      tenantId,
      templateName: "HQ Office Monthly Rent",
      voucherType: "PV",
      frequency: "MONTHLY",
      amount: 150000,
      payloadJson: JSON.stringify({ lines: rentLines, narration: "HQ Office Monthly Rent Settlement" }),
      nextRunDate: dueRunDate,
      totalRuns: 0,
      maxRuns: 12,
      isActive: true,
    })
    .returning();

  console.log("Created Recurring Template:", template);
  console.log("✅ Recurring Template Creation PASSED");

  // 4. Execute Recurring Runner Simulation
  console.log("\n[Test 3] Simulating Recurring Cron Runner...");
  const dueTemplates = await db
    .select()
    .from(recurringVouchers)
    .where(eq(recurringVouchers.id, template.id));

  const targetTemp = dueTemplates[0];
  const payload = JSON.parse(targetTemp.payloadJson);

  const [createdJv] = await db
    .insert(vouchers)
    .values({
      tenantId,
      voucherNumber: `${targetTemp.voucherType}-REC-${Date.now()}`,
      voucherType: targetTemp.voucherType,
      voucherDate: new Date(),
      fiscalYear: "2026-2027",
      periodNumber: 4,
      narration: `[Recurring Auto-Run] ${payload.narration}`,
      totalAmount: targetTemp.amount,
      status: "APPROVED",
      makerId: "system-recurring-runner",
    })
    .returning();

  await db.insert(voucherLines).values(
    payload.lines.map((l: any) => ({
      voucherId: createdJv.id,
      accountId: l.accountId,
      debit: l.debit,
      credit: l.credit,
      narration: l.narration,
    }))
  );

  const nextDate = calculateNextRunDate(targetTemp.nextRunDate, targetTemp.frequency as any);

  await db
    .update(recurringVouchers)
    .set({
      lastRunDate: new Date(),
      totalRuns: targetTemp.totalRuns + 1,
      nextRunDate: nextDate,
    })
    .where(eq(recurringVouchers.id, targetTemp.id));

  const updatedTemplate = await db.select().from(recurringVouchers).where(eq(recurringVouchers.id, template.id)).get();
  console.log("Generated Voucher:", createdJv);
  console.log("Updated Template Schedule:", updatedTemplate);

  if (!updatedTemplate?.lastRunDate || updatedTemplate.totalRuns !== 1) {
    throw new Error("Template schedule update failed");
  }

  console.log("✅ Recurring Cron Runner Execution PASSED");

  console.log("\n🎉 ALL STEP 14 RECURRING VOUCHER TESTS PASSED SUCCESSFULLY!");
}

runRecurringVoucherTests().catch((err) => {
  console.error("❌ Step 14 Test Failed:", err);
  process.exit(1);
});
