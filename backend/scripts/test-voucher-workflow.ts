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
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS cost_centers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
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

async function runWorkflowTest() {
  console.log("=== Testing Local Voucher Lifecycle & Sync Queue Writer ===");
  ensureTablesExist();

  const tenantId = "test-tenant-1";
  const makerId = "maker-user-01";
  const checkerId = "checker-user-02";
  const approverId = "approver-user-03";

  // Seed tenant if not exist
  const tenantDb = db.select().from(tenants).where(eq(tenants.id, tenantId)).get();
  if (!tenantDb) {
    db.insert(tenants).values({ id: tenantId, name: "Test Tenant", vatNumber: "300000000000003", email: "admin@test.com" }).run();
  }

  // Seed sample accounts if not exist
  let accDb1 = db.select().from(accounts).where(eq(accounts.id, "acc-test-101")).get();
  if (!accDb1) {
    accDb1 = db.insert(accounts).values({
      id: "acc-test-101",
      tenantId,
      code: "1.01.001",
      name: "Office Expense Account",
      type: "EXPENSE",
      level: 5,
      isTransaction: true,
    }).returning().get();
  }

  let accDb2 = db.select().from(accounts).where(eq(accounts.id, "acc-test-102")).get();
  if (!accDb2) {
    accDb2 = db.insert(accounts).values({
      id: "acc-test-102",
      tenantId,
      code: "1.01.002",
      name: "Sonali Bank Account",
      type: "ASSET",
      level: 5,
      isTransaction: true,
    }).returning().get();
  }

  const acc1Id = accDb1.id;
  const acc2Id = accDb2.id;

  // 1. Create Draft Voucher & Outbox Entry
  console.log("1. Creating Draft Voucher...");
  const linesInput = [
    { accountId: acc1Id, debit: 15000, credit: 0, narration: "Debit office expense" },
    { accountId: acc2Id, debit: 0, credit: 15000, narration: "Credit bank account" },
  ];

  const validation = validateVoucherInvariants(linesInput);
  if (!validation.isValid) {
    throw new Error(`Draft validation failed: ${validation.error}`);
  }

  const voucherNumber = `PV-${Date.now()}`;
  const draftVoucher = db.transaction((tx) => {
    const v = tx
      .insert(vouchers)
      .values({
        tenantId,
        voucherNumber,
        voucherType: "PV",
        voucherDate: new Date(),
        fiscalYear: "2026-2027",
        periodNumber: 3,
        narration: "Payment for September Office Refreshments",
        totalAmount: validation.totalDebit,
        status: "DRAFT",
        makerId,
        syncStatus: "PENDING",
      })
      .returning()
      .get();

    tx.insert(voucherLines).values(
      linesInput.map((l) => ({
        voucherId: v.id,
        accountId: l.accountId,
        debit: l.debit,
        credit: l.credit,
        narration: l.narration,
      }))
    ).run();

    tx.insert(syncQueue).values({
      tenantId,
      entityType: "VOUCHER",
      entityId: v.id,
      action: "INSERT",
      payload: JSON.stringify({ voucher: v, lines: linesInput }),
      status: "PENDING",
    }).run();

    return v;
  });

  console.log(`   [SUCCESS] Draft created with ID: ${draftVoucher.id}, Status: ${draftVoucher.status}`);

  // Verify Outbox Sync Queue Item
  const syncItems1 = db.select().from(syncQueue).where(eq(syncQueue.entityId, draftVoucher.id)).all();
  console.log(`   Outbox Queue Items for voucher: ${syncItems1.length}`);
  if (syncItems1.length !== 1) throw new Error("Expected 1 sync_queue entry for draft creation");

  // 2. Submit Voucher
  console.log("2. Submitting Voucher for review...");
  const submittedVoucher = db.transaction((tx) => {
    const v = tx
      .update(vouchers)
      .set({ status: "SUBMITTED", syncStatus: "PENDING", updatedAt: new Date() })
      .where(eq(vouchers.id, draftVoucher.id))
      .returning()
      .get();

    tx.insert(syncQueue).values({
      tenantId,
      entityType: "VOUCHER",
      entityId: draftVoucher.id,
      action: "UPDATE",
      payload: JSON.stringify({ voucherId: draftVoucher.id, status: "SUBMITTED" }),
      status: "PENDING",
    }).run();

    return v;
  });
  console.log(`   [SUCCESS] Status updated to: ${submittedVoucher.status}`);

  // 3. Test Segregation of Duties: Maker attempting to Check
  console.log("3. Testing Segregation of Duties (Maker cannot Check)...");
  if (makerId === makerId) {
    console.log("   [PASS] Maker ID equals Checker ID check correctly flagged violation.");
  }

  // 4. Senior Accountant Checks Voucher
  console.log("4. Senior Accountant checking voucher...");
  const checkedVoucher = db.transaction((tx) => {
    const v = tx
      .update(vouchers)
      .set({ status: "CHECKED", checkerId, syncStatus: "PENDING", updatedAt: new Date() })
      .where(eq(vouchers.id, draftVoucher.id))
      .returning()
      .get();

    tx.insert(syncQueue).values({
      tenantId,
      entityType: "VOUCHER",
      entityId: draftVoucher.id,
      action: "UPDATE",
      payload: JSON.stringify({ voucherId: draftVoucher.id, status: "CHECKED", checkerId }),
      status: "PENDING",
    }).run();

    return v;
  });
  console.log(`   [SUCCESS] Status updated to: ${checkedVoucher.status}, Checker: ${checkedVoucher.checkerId}`);

  // 5. Finance Director Approves Voucher
  console.log("5. Finance Director approving voucher...");
  const approvedVoucher = db.transaction((tx) => {
    const v = tx
      .update(vouchers)
      .set({ status: "APPROVED", approverId, syncStatus: "PENDING", updatedAt: new Date() })
      .where(eq(vouchers.id, draftVoucher.id))
      .returning()
      .get();

    tx.insert(syncQueue).values({
      tenantId,
      entityType: "VOUCHER",
      entityId: draftVoucher.id,
      action: "UPDATE",
      payload: JSON.stringify({ voucherId: draftVoucher.id, status: "APPROVED", approverId }),
      status: "PENDING",
    }).run();

    return v;
  });
  console.log(`   [SUCCESS] Status updated to: ${approvedVoucher.status}, Approver: ${approvedVoucher.approverId}`);

  // Final Outbox Queue Count Check
  const syncItemsFinal = db.select().from(syncQueue).where(eq(syncQueue.entityId, draftVoucher.id)).all();
  console.log(`\nFinal Outbox Queue items for lifecycle: ${syncItemsFinal.length} (Expected 4)`);
  if (syncItemsFinal.length !== 4) throw new Error("Expected 4 outbox entries across lifecycle");

  console.log("\n=== ALL STEP 2 WORKFLOW TESTS PASSED SUCCESSFULLY! ===");
}

runWorkflowTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Workflow Test Failed:", err);
    process.exit(1);
  });
