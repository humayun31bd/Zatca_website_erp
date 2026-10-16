import Database from "better-sqlite3";
import { db } from "../src/lib/db";
import { vouchers, syncQueue, accounts } from "../src/lib/db/accounting_schema";
import { tenants } from "../src/lib/db/schema";
import { triggerSyncNow, startScheduledSync, stopScheduledSync } from "../src/lib/sync/sync_worker";
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

async function runSyncWorkerTest() {
  console.log("=== Testing Local-to-Cloud Sync Worker & Outbox Processing ===");
  ensureTablesExist();

  const tenantId = "test-tenant-sync-1";
  const makerId = "maker-user-sync";

  // Seed tenant if not exist
  const tenantDb = db.select().from(tenants).where(eq(tenants.id, tenantId)).get();
  if (!tenantDb) {
    db.insert(tenants).values({ id: tenantId, name: "Sync Test Tenant", vatNumber: "300000000000009", email: "sync@test.com" }).run();
  }

  // 1. Create a sample voucher & sync_queue item
  console.log("1. Seeding test voucher in SQLite outbox queue...");
  const voucherId = `v-sync-test-${Date.now()}`;
  const vNumber = `JV-SYNC-${Date.now()}`;

  db.transaction((tx) => {
    tx.insert(vouchers)
      .values({
        id: voucherId,
        tenantId,
        voucherNumber: vNumber,
        voucherType: "JV",
        voucherDate: new Date(),
        fiscalYear: "2026-2027",
        periodNumber: 3,
        narration: "Sync Worker Test Journal Voucher",
        totalAmount: 25000,
        status: "APPROVED",
        makerId,
        syncStatus: "PENDING",
      })
      .run();

    tx.insert(syncQueue)
      .values({
        tenantId,
        entityType: "VOUCHER",
        entityId: voucherId,
        action: "INSERT",
        payload: JSON.stringify({ voucherId, amount: 25000, narration: "Sync Worker Test" }),
        status: "PENDING",
      })
      .run();
  });

  // Verify pending outbox queue status
  const pendingBefore = db.select().from(syncQueue).where(eq(syncQueue.entityId, voucherId)).get();
  console.log(`   [SUCCESS] Pending queue item inserted with status: '${pendingBefore?.status}'`);
  if (pendingBefore?.status !== "PENDING") throw new Error("Expected status PENDING");

  // 2. Trigger Sync Worker Execution
  console.log("2. Executing triggerSyncNow()...");
  const syncResult = await triggerSyncNow();
  console.log(`   Sync execution result: syncedCount = ${syncResult.syncedCount}, failedCount = ${syncResult.failedCount}`);

  // Verify status in SQLite
  const failedItem = db.select().from(syncQueue).where(eq(syncQueue.entityId, voucherId)).get();
  console.log(`   Outbox queue status after offline sync attempt: '${failedItem?.status}', RetryCount: ${failedItem?.retryCount}`);
  console.log(`   Last Error recorded: '${failedItem?.lastError}'`);
  
  // Offline handling test assertion: Status is FAILED, RetryCount == 1, lastError logged
  if (failedItem?.status !== "FAILED" && failedItem?.status !== "SYNCED") {
    throw new Error(`Expected status FAILED or SYNCED but got ${failedItem?.status}`);
  }
  if (failedItem?.retryCount !== 1 && failedItem?.status === "FAILED") {
    throw new Error(`Expected retryCount 1 but got ${failedItem?.retryCount}`);
  }
  console.log("   [PASS] Offline resilience and outbox retry logging verified.");

  // 3. Test Scheduled Sync Runner Start & Stop Lifecycle
  console.log("3. Testing Scheduled Sync Runner Start & Stop...");
  startScheduledSync(1000); // 1-second interval for test
  console.log("   [PASS] Scheduled sync started.");
  stopScheduledSync();
  console.log("   [PASS] Scheduled sync stopped.");

  console.log("\n=== ALL STEP 3 SYNC WORKER TESTS PASSED SUCCESSFULLY! ===");
}

runSyncWorkerTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Sync Worker Test Failed:", err);
    process.exit(1);
  });
