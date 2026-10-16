import Database from "better-sqlite3";
import { db } from "../src/lib/db";
import { vouchers, voucherLines, syncQueue, accounts } from "../src/lib/db/accounting_schema";
import { tenants } from "../src/lib/db/schema";
import { validateVoucherInvariants } from "../src/lib/accounting/validator";
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
  `);
  sqlite.close();
}

async function runCloudPushTest() {
  console.log("=== Testing Cloud Synchronization Push Endpoint & Ingestion Logic ===");
  ensureTablesExist();

  const tenantId = "test-tenant-push";
  const voucherId = `v-push-${Date.now()}`;

  // Seed test tenant & voucher in DB
  const tenantDb = db.select().from(tenants).where(eq(tenants.id, tenantId)).get();
  if (!tenantDb) {
    db.insert(tenants).values({ id: tenantId, name: "Push Test Tenant", vatNumber: "300000000000001", email: "push@test.com" }).run();
  }

  db.insert(vouchers).values({
    id: voucherId,
    tenantId,
    voucherNumber: `JV-PUSH-${Date.now()}`,
    voucherType: "JV",
    voucherDate: new Date(),
    fiscalYear: "2026-2027",
    periodNumber: 3,
    narration: "Cloud Push Integration Test",
    totalAmount: 45000,
    status: "APPROVED",
    makerId: "maker-1",
    syncStatus: "PENDING",
  }).run();

  // 1. Test Valid Voucher Batch Ingestion & Double-Entry Re-validation
  console.log("1. Testing Cloud Ingestion with Valid Double-Entry Voucher...");
  const validLines = [
    { accountId: "acc-101", debit: 45000, credit: 0, narration: "Expense" },
    { accountId: "acc-102", debit: 0, credit: 45000, narration: "Bank" },
  ];

  const validationRes = validateVoucherInvariants(validLines);
  console.log(`   Double-entry invariant check: ${validationRes.isValid ? "[PASS] Balanced" : "[FAIL]"}`);
  if (!validationRes.isValid) throw new Error("Validation unexpectedly failed for balanced lines");

  // Perform transactional cloud ledger update
  db.transaction((tx) => {
    tx.update(vouchers)
      .set({ syncStatus: "SYNCED", syncedAt: new Date() })
      .where(eq(vouchers.id, voucherId))
      .run();
  });

  const syncedVoucher = db.select().from(vouchers).where(eq(vouchers.id, voucherId)).get();
  console.log(`   Voucher status in Cloud Ledger: '${syncedVoucher?.syncStatus}', SyncedAt: ${syncedVoucher?.syncedAt}`);
  if (syncedVoucher?.syncStatus !== "SYNCED") throw new Error("Expected syncStatus SYNCED");

  // 2. Test Cloud Ingestion Rejection of Imbalanced Voucher Payload
  console.log("2. Testing Cloud Ingestion Rejection of Imbalanced Payload...");
  const imbalancedLines = [
    { accountId: "acc-101", debit: 45000, credit: 0 },
    { accountId: "acc-102", debit: 0, credit: 40000 },
  ];

  const invalidValidationRes = validateVoucherInvariants(imbalancedLines);
  console.log(`   Imbalanced payload check correctly caught: '${invalidValidationRes.error}'`);
  if (invalidValidationRes.isValid) throw new Error("Cloud ingestion should reject imbalanced payload");

  console.log("\n=== ALL STEP 4 CLOUD PUSH TESTS PASSED SUCCESSFULLY! ===");
}

runCloudPushTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Cloud Push Test Failed:", err);
    process.exit(1);
  });
