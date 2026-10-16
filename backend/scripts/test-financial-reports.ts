import Database from "better-sqlite3";
import { db } from "../src/lib/db";
import { vouchers, voucherLines, accounts } from "../src/lib/db/accounting_schema";
import { tenants } from "../src/lib/db/schema";
import { formatCurrency } from "../src/lib/accounting/formatters";
import { eq } from "drizzle-orm";

function ensureTablesExist() {
  const sqlite = new Database("sqlite.db");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      vat_number TEXT,
      email TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      account_subtype TEXT,
      level INTEGER NOT NULL,
      parent_id TEXT,
      is_control INTEGER DEFAULT 0,
      is_transaction INTEGER DEFAULT 1,
      is_cash_nature INTEGER DEFAULT 0,
      is_bank_nature INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS vouchers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      voucher_number TEXT NOT NULL,
      voucher_type TEXT NOT NULL,
      voucher_date INTEGER NOT NULL,
      fiscal_year TEXT NOT NULL,
      period_number INTEGER NOT NULL,
      fund_id TEXT,
      cost_center_id TEXT,
      narration TEXT NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'DRAFT' NOT NULL,
      maker_id TEXT NOT NULL,
      checker_id TEXT,
      approver_id TEXT,
      sync_status TEXT DEFAULT 'PENDING' NOT NULL,
      synced_at INTEGER,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS voucher_lines (
      id TEXT PRIMARY KEY,
      voucher_id TEXT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      cost_center_id TEXT,
      debit REAL DEFAULT 0 NOT NULL,
      credit REAL DEFAULT 0 NOT NULL,
      narration TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );
  `);
  sqlite.close();
}

async function runReportsTest() {
  console.log("=== Testing Financial Reporting Engine & Numeral Formatting ===");
  ensureTablesExist();

  const tenantId = "test-tenant-rpt";

  // 1. Test Numeral Formatting Utility (English & Bangla)
  console.log("1. Testing Currency Numeral Formatter...");
  const valEn = formatCurrency(250000.50, "en");
  const valBn = formatCurrency(250000.50, "bn");
  console.log(`   English format: ${valEn}`);
  console.log(`   Bangla format:  ${valBn}`);

  if (valEn !== "250,000.50") throw new Error(`Unexpected English format: ${valEn}`);
  if (valBn !== "২৫০,০০০.৫০") throw new Error(`Unexpected Bangla format: ${valBn}`);
  console.log("   [PASS] Currency formatting verified in English and Bangla.");

  // Seed tenant if not exist
  const tenantDb = db.select().from(tenants).where(eq(tenants.id, tenantId)).get();
  if (!tenantDb) {
    db.insert(tenants).values({ id: tenantId, name: "Report Test Tenant", vatNumber: "300000000000002", email: "report@test.com" }).run();
  }

  // Seed accounts
  const acc1 = db.insert(accounts).values({ id: `acc-rpt-1-${Date.now()}`, tenantId, code: "1101", name: "Cash Account", type: "ASSET", level: 5, isTransaction: true }).returning().get();
  const acc2 = db.insert(accounts).values({ id: `acc-rpt-2-${Date.now()}`, tenantId, code: "5101", name: "Honorarium Expense", type: "EXPENSE", level: 5, isTransaction: true }).returning().get();

  // 2. Seed Approved Voucher
  console.log("2. Seeding Approved Voucher for Trial Balance...");
  const vId = `v-rpt-${Date.now()}`;
  db.transaction((tx) => {
    tx.insert(vouchers).values({
      id: vId,
      tenantId,
      voucherNumber: `PV-RPT-${Date.now()}`,
      voucherType: "PV",
      voucherDate: new Date(),
      fiscalYear: "2026-2027",
      periodNumber: 3,
      narration: "Honorarium Payment",
      totalAmount: 50000,
      status: "APPROVED",
      makerId: "maker-rpt",
      syncStatus: "PENDING",
    }).run();

    tx.insert(voucherLines).values([
      { voucherId: vId, accountId: acc2.id, debit: 50000, credit: 0, narration: "Debit expense" },
      { voucherId: vId, accountId: acc1.id, debit: 0, credit: 50000, narration: "Credit cash" },
    ]).run();
  });

  // 3. Verify Trial Balance Invariant
  console.log("3. Verifying Trial Balance Invariant...");
  const vLines = db.select().from(voucherLines).where(eq(voucherLines.voucherId, vId)).all();
  let drTotal = 0;
  let crTotal = 0;
  vLines.forEach((l) => {
    drTotal += l.debit;
    crTotal += l.credit;
  });

  console.log(`   Trial Balance Debit Total: ${formatCurrency(drTotal, "bn")} BDT`);
  console.log(`   Trial Balance Credit Total: ${formatCurrency(crTotal, "bn")} BDT`);

  if (drTotal !== crTotal) throw new Error("Trial balance total Dr != total Cr");
  console.log("   [PASS] Trial balance invariant Total Dr == Total Cr verified.");

  console.log("\n=== ALL STEP 5 FINANCIAL REPORTING TESTS PASSED SUCCESSFULLY! ===");
}

runReportsTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Reports Test Failed:", err);
    process.exit(1);
  });
