import Database from "better-sqlite3";
import { db } from "../src/lib/db";
import { chequeBooks, chequeLeaves, accounts } from "../src/lib/db/accounting_schema";
import { tenants } from "../src/lib/db/schema";
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
  `);
  sqlite.close();
}

async function runChequeManagementTest() {
  console.log("=== Testing Cheque Book Registration & Leaf Lifecycle Management ===");
  ensureTablesExist();

  const tenantId = "test-tenant-cheque";
  const bankAccId = "bank-acc-sonali-101";

  // Seed tenant if not exist
  const tenantDb = db.select().from(tenants).where(eq(tenants.id, tenantId)).get();
  if (!tenantDb) {
    db.insert(tenants).values({ id: tenantId, name: "Cheque Test Tenant", vatNumber: "300000000000099", email: "cheque@test.com" }).run();
  }

  // Seed bank account
  const bankDb = db.select().from(accounts).where(eq(accounts.id, bankAccId)).get();
  if (!bankDb) {
    db.insert(accounts).values({
      id: bankAccId,
      tenantId,
      code: "1102.01",
      name: "Sonali Bank CD Account",
      type: "ASSET",
      accountSubtype: "BANK",
      level: 5,
      isBankNature: true,
      isTransaction: true,
    }).run();
  }

  // 1. Register Cheque Book
  console.log("1. Registering Cheque Book (10 leaves, start: 5001)...");
  const bookNumber = `CB-${Date.now()}`;
  const startNum = 5001;
  const count = 10;
  const endNum = startNum + count - 1;

  const bookResult = db.transaction((tx) => {
    const book = tx
      .insert(chequeBooks)
      .values({
        tenantId,
        bankAccountId: bankAccId,
        chequeBookNumber: bookNumber,
        startLeafNumber: startNum,
        endLeafNumber: endNum,
        totalLeaves: count,
        status: "ACTIVE",
      })
      .returning()
      .get();

    const leavesToInsert = [];
    for (let i = 0; i < count; i++) {
      const leafNo = (startNum + i).toString().padStart(6, "0");
      leavesToInsert.push({
        tenantId,
        chequeBookId: book.id,
        bankAccountId: bankAccId,
        leafNumber: leafNo,
        status: "AVAILABLE",
      });
    }

    tx.insert(chequeLeaves).values(leavesToInsert).run();

    return book;
  });

  console.log(`   [SUCCESS] Cheque Book registered with ID: ${bookResult.id}, Range: ${startNum} to ${endNum}`);

  // 2. Verify Leaf Count & Status
  const leavesInDb = db.select().from(chequeLeaves).where(eq(chequeLeaves.chequeBookId, bookResult.id)).all();
  console.log(`   Generated Cheque Leaves count: ${leavesInDb.length} (Expected 10)`);
  if (leavesInDb.length !== 10) throw new Error("Expected 10 leaves to be generated");

  // 3. Fetch Next Available Cheque Leaf
  console.log("3. Fetching next AVAILABLE Cheque Leaf for Bank Account...");
  const nextAvailable = db
    .select()
    .from(chequeLeaves)
    .where(and(eq(chequeLeaves.bankAccountId, bankAccId), eq(chequeLeaves.status, "AVAILABLE")))
    .orderBy(asc(chequeLeaves.leafNumber))
    .get();

  console.log(`   Next Available Leaf Number: ${nextAvailable?.leafNumber}`);
  if (nextAvailable?.leafNumber !== "005001") throw new Error("Expected first leaf number 005001");

  console.log("\n=== ALL STEP 7 CHEQUE MANAGEMENT TESTS PASSED SUCCESSFULLY! ===");
}

runChequeManagementTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Cheque Management Test Failed:", err);
    process.exit(1);
  });
