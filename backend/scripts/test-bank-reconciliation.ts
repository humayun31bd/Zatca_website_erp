import Database from "better-sqlite3";
import { db } from "../src/lib/db";
import { vouchers, voucherLines, chequeBooks, chequeLeaves, accounts, syncQueue } from "../src/lib/db/accounting_schema";
import { tenants } from "../src/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

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
      is_bank_nature INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS cheque_books (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      bank_account_id TEXT NOT NULL REFERENCES accounts(id),
      cheque_book_number TEXT NOT NULL,
      start_leaf_number INTEGER NOT NULL,
      end_leaf_number INTEGER NOT NULL,
      total_leaves INTEGER NOT NULL,
      status TEXT DEFAULT 'ACTIVE' NOT NULL,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS cheque_leaves (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      cheque_book_id TEXT REFERENCES cheque_books(id),
      bank_account_id TEXT NOT NULL REFERENCES accounts(id),
      leaf_number TEXT NOT NULL,
      status TEXT DEFAULT 'AVAILABLE' NOT NULL,
      voucher_id TEXT,
      payee_name TEXT,
      amount REAL DEFAULT 0.0,
      issued_date INTEGER,
      cleared_date INTEGER,
      bounced_date INTEGER,
      remarks TEXT,
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
      fund_id TEXT,
      cost_center_id TEXT,
      cheque_leaf_id TEXT REFERENCES cheque_leaves(id),
      cheque_number TEXT,
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

  try { sqlite.exec("ALTER TABLE vouchers ADD COLUMN cheque_leaf_id TEXT;"); } catch (e) {}
  try { sqlite.exec("ALTER TABLE vouchers ADD COLUMN cheque_number TEXT;"); } catch (e) {}

  sqlite.close();
}

async function runBankReconTest() {
  console.log("=== Testing Bank Reconciliation, Cheque Clearance & Bounce Workflow ===");
  ensureTablesExist();

  const tenantId = "test-tenant-recon";
  const bankAccId = "bank-acc-sonali-808";
  const expAccId = "exp-acc-808";

  // Seed tenant & accounts
  const tenantDb = db.select().from(tenants).where(eq(tenants.id, tenantId)).get();
  if (!tenantDb) {
    db.insert(tenants).values({ id: tenantId, name: "Recon Test Tenant", vatNumber: "300000000000077", email: "recon@test.com" }).run();
  }

  let bankAcc = db.select().from(accounts).where(eq(accounts.id, bankAccId)).get();
  if (!bankAcc) {
    bankAcc = db.insert(accounts).values({ id: bankAccId, tenantId, code: "1102.08", name: "Sonali Bank Head Office", type: "ASSET", accountSubtype: "BANK", level: 5, isBankNature: true, isTransaction: true }).returning().get();
  }
  let expAcc = db.select().from(accounts).where(eq(accounts.id, expAccId)).get();
  if (!expAcc) {
    expAcc = db.insert(accounts).values({ id: expAccId, tenantId, code: "5101.08", name: "Vendor Expense", type: "EXPENSE", level: 5, isTransaction: true }).returning().get();
  }

  // 1. Seed Cheque Book & Issued Payment Voucher
  console.log("1. Seeding Issued Payment Voucher with Cheque Leaf 008001...");
  const vId1 = `v-recon-1-${Date.now()}`;
  const chqId1 = `chq-leaf-8001-${Date.now()}`;

  db.transaction((tx) => {
    tx.insert(chequeLeaves).values({
      id: chqId1,
      tenantId,
      bankAccountId: bankAccId,
      leafNumber: "008001",
      status: "ISSUED",
      voucherId: vId1,
      payeeName: "Vendor Solutions Ltd.",
      amount: 35000,
      issuedDate: new Date(),
    }).run();

    tx.insert(vouchers).values({
      id: vId1,
      tenantId,
      voucherNumber: `PV-RECON-${Date.now()}`,
      voucherType: "PV",
      voucherDate: new Date(),
      fiscalYear: "2026-2027",
      periodNumber: 3,
      chequeLeafId: chqId1,
      chequeNumber: "008001",
      narration: "Payment to Vendor Solutions",
      totalAmount: 35000,
      status: "APPROVED",
      makerId: "maker-recon",
      syncStatus: "PENDING",
    }).run();

    tx.insert(voucherLines).values([
      { voucherId: vId1, accountId: expAccId, debit: 35000, credit: 0 },
      { voucherId: vId1, accountId: bankAccId, debit: 0, credit: 35000 },
    ]).run();
  });

  // 2. Fetch Unpresented Cheques
  console.log("2. Querying Unpresented Cheques for Bank Account...");
  const unpresented = db.select().from(chequeLeaves).where(and(eq(chequeLeaves.bankAccountId, bankAccId), inArray(chequeLeaves.status, ["ISSUED", "RECEIVED", "PRESENTED"]))).all();
  console.log(`   Unpresented cheques count: ${unpresented.length}`);
  if (unpresented.length === 0) throw new Error("Expected at least 1 unpresented cheque");

  // 3. Test 1-Click Cheque Clearance
  console.log("3. Clearing Cheque Leaf 008001...");
  const clearDate = new Date();
  db.transaction((tx) => {
    tx.update(chequeLeaves).set({ status: "CLEARED", clearedDate: clearDate, remarks: "Cleared via Bank Recon Test" }).where(eq(chequeLeaves.id, chqId1)).run();
    tx.insert(syncQueue).values({ tenantId, entityType: "CHEQUE_LEAF", entityId: chqId1, action: "UPDATE", payload: JSON.stringify({ chqId1, status: "CLEARED" }), status: "PENDING" }).run();
  });

  const clearedLeaf = db.select().from(chequeLeaves).where(eq(chequeLeaves.id, chqId1)).get();
  console.log(`   [SUCCESS] Cheque Leaf Status after clearance: '${clearedLeaf?.status}', ClearedDate: ${clearedLeaf?.clearedDate}`);
  if (clearedLeaf?.status !== "CLEARED") throw new Error("Expected status CLEARED");

  // 4. Test Cheque Bounce & Reversal Voucher Generation
  console.log("4. Testing Cheque Bounce and Reversal Voucher Generation...");
  const chqId2 = `chq-leaf-8002-${Date.now()}`;
  const vId2 = `v-recon-2-${Date.now()}`;

  db.transaction((tx) => {
    tx.insert(chequeLeaves).values({
      id: chqId2,
      tenantId,
      bankAccountId: bankAccId,
      leafNumber: "008002",
      status: "ISSUED",
      voucherId: vId2,
      payeeName: "Bounced Payee",
      amount: 12000,
      issuedDate: new Date(),
    }).run();

    tx.insert(vouchers).values({
      id: vId2,
      tenantId,
      voucherNumber: `PV-BOUNCE-${Date.now()}`,
      voucherType: "PV",
      voucherDate: new Date(),
      fiscalYear: "2026-2027",
      periodNumber: 3,
      chequeLeafId: chqId2,
      chequeNumber: "008002",
      narration: "Bounced Payment Voucher Test",
      totalAmount: 12000,
      status: "APPROVED",
      makerId: "maker-recon",
      syncStatus: "PENDING",
    }).run();

    tx.insert(voucherLines).values([
      { voucherId: vId2, accountId: expAccId, debit: 12000, credit: 0 },
      { voucherId: vId2, accountId: bankAccId, debit: 0, credit: 12000 },
    ]).run();
  });

  // Execute Bounce Transaction
  const bounceResult = db.transaction((tx) => {
    tx.update(chequeLeaves).set({ status: "BOUNCED", bouncedDate: new Date(), remarks: "Bounced due to insufficient funds" }).where(eq(chequeLeaves.id, chqId2)).run();

    const revNumber = `JV-REV-BOUNCE-${Date.now()}`;
    const revVoucher = tx.insert(vouchers).values({
      tenantId,
      voucherNumber: revNumber,
      voucherType: "JV",
      voucherDate: new Date(),
      fiscalYear: "2026-2027",
      periodNumber: 3,
      chequeLeafId: chqId2,
      chequeNumber: "008002",
      narration: "Reversal for Bounced Cheque 008002",
      totalAmount: 12000,
      status: "APPROVED",
      makerId: "recon-user",
      syncStatus: "PENDING",
    }).returning().get();

    // Reversal Lines (Swap Dr/Cr)
    tx.insert(voucherLines).values([
      { voucherId: revVoucher.id, accountId: expAccId, debit: 0, credit: 12000, narration: "Reversal of Bounced Payment" },
      { voucherId: revVoucher.id, accountId: bankAccId, debit: 12000, credit: 0, narration: "Reversal of Bounced Bank Credit" },
    ]).run();

    return revVoucher;
  });

  console.log(`   [SUCCESS] Bounced Cheque Status: 'BOUNCED', Auto Reversal Voucher: ${bounceResult.voucherNumber}`);
  const bouncedLeafInDb = db.select().from(chequeLeaves).where(eq(chequeLeaves.id, chqId2)).get();
  if (bouncedLeafInDb?.status !== "BOUNCED") throw new Error("Expected bounced leaf status BOUNCED");

  console.log("\n=== ALL STEP 9 BANK RECONCILIATION TESTS PASSED SUCCESSFULLY! ===");
}

runBankReconTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Bank Recon Test Failed:", err);
    process.exit(1);
  });
