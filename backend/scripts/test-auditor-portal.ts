import Database from "better-sqlite3";
import { db } from "../src/lib/db";
import { vouchers, voucherAuditComments, syncQueue } from "../src/lib/db/accounting_schema";
import { tenants } from "../src/lib/db/schema";
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
      sync_status TEXT DEFAULT 'PENDING' NOT NULL,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS voucher_audit_comments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      voucher_id TEXT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
      auditor_id TEXT NOT NULL,
      auditor_type TEXT DEFAULT 'INTERNAL' NOT NULL,
      query_type TEXT DEFAULT 'OBSERVATION' NOT NULL,
      comment_text TEXT NOT NULL,
      status TEXT DEFAULT 'OPEN' NOT NULL,
      management_response TEXT,
      responded_by TEXT,
      responded_at INTEGER,
      resolved_at INTEGER,
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

async function runAuditorPortalTest() {
  console.log("=== Testing Auditor Portal, Audit Queries & Management Response Lifecycle ===");
  ensureTablesExist();

  const tenantId = "test-tenant-audit";
  const voucherId = `v-audit-${Date.now()}`;
  const auditorId = "auditor-ext-99";
  const financeUserId = "finance-mgr-01";

  // Seed tenant & voucher
  const tenantDb = db.select().from(tenants).where(eq(tenants.id, tenantId)).get();
  if (!tenantDb) {
    db.insert(tenants).values({ id: tenantId, name: "Audit Test Tenant", vatNumber: "300000000000066", email: "audit@test.com" }).run();
  }

  db.insert(vouchers).values({
    id: voucherId,
    tenantId,
    voucherNumber: `PV-AUDIT-${Date.now()}`,
    voucherType: "PV",
    voucherDate: new Date(),
    fiscalYear: "2026-2027",
    periodNumber: 3,
    narration: "Audited Procurement Payment Voucher",
    totalAmount: 95000,
    status: "APPROVED",
    makerId: "maker-audit",
    syncStatus: "PENDING",
  }).run();

  // 1. External Auditor Raises Compliance Query
  console.log("1. External Auditor raising compliance query on voucher...");
  const commentText = "Missing VAT Challan Mushak-6.3 copy for BDT 95,000 disbursement.";
  const queryResult = db.transaction((tx) => {
    const q = tx
      .insert(voucherAuditComments)
      .values({
        tenantId,
        voucherId,
        auditorId,
        auditorType: "EXTERNAL",
        queryType: "COMPLIANCE_QUERY",
        commentText,
        status: "OPEN",
      })
      .returning()
      .get();

    tx.insert(syncQueue).values({
      tenantId,
      entityType: "AUDIT_QUERY",
      entityId: q.id,
      action: "INSERT",
      payload: JSON.stringify({ voucherId, queryId: q.id, commentText }),
      status: "PENDING",
    }).run();

    return q;
  });

  console.log(`   [SUCCESS] Audit Query Created with ID: ${queryResult.id}, Status: '${queryResult.status}'`);
  if (queryResult.status !== "OPEN") throw new Error("Expected status OPEN");

  // 2. Finance Team Submits Management Explanation
  console.log("2. Finance Team submitting management response...");
  const mgmtResp = "VAT Challan Mushak-6.3 attached in Annexure B (Ref #VDS-2026-88).";
  const respondedQuery = db.transaction((tx) => {
    const q = tx
      .update(voucherAuditComments)
      .set({
        status: "RESPONDED",
        managementResponse: mgmtResp,
        respondedBy: financeUserId,
        respondedAt: new Date(),
      })
      .where(eq(voucherAuditComments.id, queryResult.id))
      .returning()
      .get();

    tx.insert(syncQueue).values({
      tenantId,
      entityType: "AUDIT_QUERY",
      entityId: queryResult.id,
      action: "UPDATE",
      payload: JSON.stringify({ queryId: queryResult.id, status: "RESPONDED" }),
      status: "PENDING",
    }).run();

    return q;
  });

  console.log(`   [SUCCESS] Management Response submitted. Status: '${respondedQuery.status}', RespondedBy: '${respondedQuery.respondedBy}'`);
  if (respondedQuery.status !== "RESPONDED") throw new Error("Expected status RESPONDED");

  // 3. Auditor Clears & Resolves Query
  console.log("3. Auditor reviewing explanation and marking RESOLVED...");
  const resolvedQuery = db.transaction((tx) => {
    const q = tx
      .update(voucherAuditComments)
      .set({
        status: "RESOLVED",
        resolvedAt: new Date(),
      })
      .where(eq(voucherAuditComments.id, queryResult.id))
      .returning()
      .get();

    tx.insert(syncQueue).values({
      tenantId,
      entityType: "AUDIT_QUERY",
      entityId: queryResult.id,
      action: "UPDATE",
      payload: JSON.stringify({ queryId: queryResult.id, status: "RESOLVED" }),
      status: "PENDING",
    }).run();

    return q;
  });

  console.log(`   [SUCCESS] Audit Query Resolved. Status: '${resolvedQuery.status}', ResolvedAt: ${resolvedQuery.resolvedAt}`);
  if (resolvedQuery.status !== "RESOLVED") throw new Error("Expected status RESOLVED");

  // Outbox Queue Check
  const syncItems = db.select().from(syncQueue).where(eq(syncQueue.entityId, queryResult.id)).all();
  console.log(`   Outbox Queue items for Audit Query: ${syncItems.length} (Expected 3)`);
  if (syncItems.length !== 3) throw new Error("Expected 3 sync entries for audit query lifecycle");

  console.log("\n=== ALL STEP 10 AUDITOR PORTAL TESTS PASSED SUCCESSFULLY! ===");
}

runAuditorPortalTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Auditor Portal Test Failed:", err);
    process.exit(1);
  });
