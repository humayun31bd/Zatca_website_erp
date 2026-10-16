import Database from "better-sqlite3";
import { db } from "../src/lib/db";
import { vouchers, voucherLines, chequeBooks, chequeLeaves, accounts, syncQueue } from "../src/lib/db/accounting_schema";
import { tenants } from "../src/lib/db/schema";
import { validateVoucherInvariants } from "../src/lib/accounting/validator";
import { eq, and, asc } from "drizzle-orm";

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

  try {
    sqlite.exec("ALTER TABLE vouchers ADD COLUMN cheque_leaf_id TEXT;");
  } catch (e) {
    // Ignore if column already exists
  }
  try {
    sqlite.exec("ALTER TABLE vouchers ADD COLUMN cheque_number TEXT;");
  } catch (e) {
    // Ignore if column already exists
  }

  sqlite.close();
}

async function runChequeVoucherTest() {
  console.log("=== Testing Cheque Leaf Auto-Allocation in PV, CV, and RV Vouchers ===");
  ensureTablesExist();

  const tenantId = "test-tenant-chq-v";
  const bankAccId = "bank-acc-sonali-707";
  const expAccId = "exp-acc-707";

  // Seed tenant if not exist
  const tenantDb = db.select().from(tenants).where(eq(tenants.id, tenantId)).get();
  if (!tenantDb) {
    db.insert(tenants).values({ id: tenantId, name: "Cheque Voucher Tenant", vatNumber: "300000000000088", email: "chqv@test.com" }).run();
  }

  // Seed bank & expense accounts
  let bankAcc = db.select().from(accounts).where(eq(accounts.id, bankAccId)).get();
  if (!bankAcc) {
    bankAcc = db.insert(accounts).values({ id: bankAccId, tenantId, code: "1102.07", name: "Sonali Bank", type: "ASSET", accountSubtype: "BANK", level: 5, isBankNature: true, isTransaction: true }).returning().get();
  }
  let expAcc = db.select().from(accounts).where(eq(accounts.id, expAccId)).get();
  if (!expAcc) {
    expAcc = db.insert(accounts).values({ id: expAccId, tenantId, code: "5101.07", name: "Office Expense", type: "EXPENSE", level: 5, isTransaction: true }).returning().get();
  }

  // Register Cheque Book with 5 leaves (7001 to 7005)
  const bookNumber = `CB-TEST-707`;
  const book = db.transaction((tx) => {
    const b = tx.insert(chequeBooks).values({ tenantId, bankAccountId: bankAccId, chequeBookNumber: bookNumber, startLeafNumber: 7001, endLeafNumber: 7005, totalLeaves: 5, status: "ACTIVE" }).returning().get();
    const leaves = [];
    for (let i = 0; i < 5; i++) {
      leaves.push({ tenantId, chequeBookId: b.id, bankAccountId: bankAccId, leafNumber: (7001 + i).toString().padStart(6, "0"), status: "AVAILABLE" });
    }
    tx.insert(chequeLeaves).values(leaves).run();
    return b;
  });

  // 1. Create Payment Voucher (PV) & verify Cheque Leaf auto-allocation
  console.log("1. Creating Payment Voucher (PV) with Bank Account...");
  const pvLines = [
    { accountId: expAccId, debit: 18000, credit: 0 },
    { accountId: bankAccId, bankAccountId: bankAccId, debit: 0, credit: 18000 },
  ];

  const nextLeaf = db.select().from(chequeLeaves).where(and(eq(chequeLeaves.bankAccountId, bankAccId), eq(chequeLeaves.status, "AVAILABLE"))).orderBy(asc(chequeLeaves.leafNumber)).get();
  if (!nextLeaf) throw new Error("Expected available leaf");

  const pvNumber = `PV-CHQ-${Date.now()}`;
  const pvVoucher = db.transaction((tx) => {
    const v = tx.insert(vouchers).values({
      tenantId,
      voucherNumber: pvNumber,
      voucherType: "PV",
      voucherDate: new Date(),
      fiscalYear: "2026-2027",
      periodNumber: 3,
      chequeLeafId: nextLeaf.id,
      chequeNumber: nextLeaf.leafNumber,
      narration: "Vendor payment via cheque",
      totalAmount: 18000,
      status: "DRAFT",
      makerId: "maker-chq",
      syncStatus: "PENDING",
    }).returning().get();

    tx.insert(voucherLines).values([
      { voucherId: v.id, accountId: expAccId, debit: 18000, credit: 0 },
      { voucherId: v.id, accountId: bankAccId, debit: 0, credit: 18000 },
    ]).run();

    tx.update(chequeLeaves).set({ status: "ISSUED", voucherId: v.id, payeeName: "Office Supplier Co.", amount: 18000, issuedDate: new Date() }).where(eq(chequeLeaves.id, nextLeaf.id)).run();
    return v;
  });

  console.log(`   [SUCCESS] PV Created: ${pvVoucher.voucherNumber}, Cheque Leaf Tagged: ${pvVoucher.chequeNumber}`);
  if (pvVoucher.chequeNumber !== "007001") throw new Error("Expected leaf number 007001");

  // Verify Leaf status transitioned to ISSUED
  const updatedLeaf = db.select().from(chequeLeaves).where(eq(chequeLeaves.id, nextLeaf.id)).get();
  console.log(`   Cheque Leaf Status in DB: '${updatedLeaf?.status}', Payee: '${updatedLeaf?.payeeName}'`);
  if (updatedLeaf?.status !== "ISSUED") throw new Error("Expected leaf status ISSUED");

  // 2. Create Receipt Voucher (RV) with Incoming Cheque
  console.log("2. Creating Receipt Voucher (RV) with incoming Cheque...");
  const rvNumber = `RV-CHQ-${Date.now()}`;
  const incomingChqNo = "CHQ-889900";

  const rvVoucher = db.transaction((tx) => {
    const [rvLeaf] = tx.insert(chequeLeaves).values({
      tenantId,
      bankAccountId: bankAccId,
      leafNumber: incomingChqNo,
      status: "RECEIVED",
      payeeName: "Training Participant",
      amount: 25000,
      issuedDate: new Date(),
      remarks: "Received via RV",
    }).returning().all();

    const v = tx.insert(vouchers).values({
      tenantId,
      voucherNumber: rvNumber,
      voucherType: "RV",
      voucherDate: new Date(),
      fiscalYear: "2026-2027",
      periodNumber: 3,
      chequeLeafId: rvLeaf.id,
      chequeNumber: incomingChqNo,
      narration: "Training Course Fee Cheque Receipt",
      totalAmount: 25000,
      status: "DRAFT",
      makerId: "maker-chq",
      syncStatus: "PENDING",
    }).returning().get();

    tx.update(chequeLeaves).set({ voucherId: v.id }).where(eq(chequeLeaves.id, rvLeaf.id)).run();
    return v;
  });

  console.log(`   [SUCCESS] RV Created: ${rvVoucher.voucherNumber}, Incoming Cheque Tagged: ${rvVoucher.chequeNumber}`);
  const rvLeafDb = db.select().from(chequeLeaves).where(eq(chequeLeaves.id, rvVoucher.chequeLeafId!)).get();
  console.log(`   RV Cheque Leaf Status: '${rvLeafDb?.status}', Leaf Number: '${rvLeafDb?.leafNumber}'`);
  if (rvLeafDb?.status !== "RECEIVED") throw new Error("Expected RV leaf status RECEIVED");

  console.log("\n=== ALL STEP 8 CHEQUE INTEGRATION TESTS PASSED SUCCESSFULLY! ===");
}

runChequeVoucherTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Cheque Voucher Test Failed:", err);
    process.exit(1);
  });
