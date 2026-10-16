import Database from "better-sqlite3";
import { db } from "../src/lib/db";
import { accounts, fixedAssets, vouchers, voucherLines } from "../src/lib/db/accounting_schema";
import { tenants } from "../src/lib/db/schema";
import { calculateMonthlyDepreciation } from "../src/lib/accounting/asset_calculator";
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

    CREATE TABLE IF NOT EXISTS fixed_assets (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      asset_tag TEXT NOT NULL,
      asset_name TEXT NOT NULL,
      asset_category_id TEXT,
      cost_center_id TEXT,
      acquisition_date INTEGER NOT NULL,
      purchase_cost REAL NOT NULL,
      salvage_value REAL DEFAULT 0.0 NOT NULL,
      useful_life_months INTEGER NOT NULL,
      depreciation_method TEXT DEFAULT 'STRAIGHT_LINE' NOT NULL,
      depreciation_rate REAL DEFAULT 0.0 NOT NULL,
      accumulated_depreciation REAL DEFAULT 0.0 NOT NULL,
      book_value REAL NOT NULL,
      depreciation_expense_account_id TEXT NOT NULL,
      accumulated_depreciation_account_id TEXT NOT NULL,
      status TEXT DEFAULT 'ACTIVE' NOT NULL,
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
      cost_center_id TEXT,
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

async function runAssetDepreciationTests() {
  console.log("=== Running Step 12: Fixed Asset Depreciation Engine Integration Tests ===");
  ensureTablesExist();

  const tenantId = "test-tenant-asset-1";

  // 1. Seed Tenant & Accounts
  const existingTenant = await db.select().from(tenants).where(eq(tenants.id, tenantId)).get();
  if (!existingTenant) {
    await db.insert(tenants).values({
      id: tenantId,
      name: "Capital Assets Enterprise",
      code: "ASSET-TEN",
      vatNumber: "9876543210123",
      email: "assets@enterprise.com",
    } as any);
  }

  const deprExpenseAccId = `acc-depr-exp-${Date.now()}`;
  const accumDeprAccId = `acc-accum-depr-${Date.now()}`;

  await db.insert(accounts).values([
    { id: deprExpenseAccId, tenantId, code: "5.20.01", name: "Depreciation Expense - IT Equipment", type: "EXPENSE", level: 5, isTransaction: true },
    { id: accumDeprAccId, tenantId, code: "1.30.01", name: "Accumulated Depreciation - IT Equipment", type: "ASSET", level: 5, isTransaction: true },
  ]);

  // 2. Test Straight Line Depreciation Math
  console.log("\n[Test 1] Testing Straight Line Depreciation Math...");
  const slInput = {
    purchaseCost: 120000,
    salvageValue: 0,
    usefulLifeMonths: 60, // 5 years
    depreciationMethod: "STRAIGHT_LINE" as const,
    accumulatedDepreciation: 0,
    bookValue: 120000,
  };

  const slResult = calculateMonthlyDepreciation(slInput);
  console.log("Straight Line Result:", slResult);

  if (slResult.monthlyDepreciation !== 2000) {
    throw new Error(`Expected monthly depreciation 2000, got ${slResult.monthlyDepreciation}`);
  }
  if (slResult.newAccumulatedDepreciation !== 2000 || slResult.newBookValue !== 118000) {
    throw new Error("Straight Line book value calculation mismatch");
  }
  console.log("✅ Straight Line Math PASSED");

  // 3. Test Reducing Balance Depreciation Math
  console.log("\n[Test 2] Testing Reducing Balance Depreciation Math...");
  const rbInput = {
    purchaseCost: 500000,
    salvageValue: 50000,
    usefulLifeMonths: 60,
    depreciationMethod: "REDUCING_BALANCE" as const,
    depreciationRate: 20.0, // 20% annual rate -> 1.6667% monthly rate
    accumulatedDepreciation: 0,
    bookValue: 500000,
  };

  const rbResult = calculateMonthlyDepreciation(rbInput);
  console.log("Reducing Balance Result:", rbResult);
  // Expected: 500000 * (0.20 / 12) = 8333.33

  if (rbResult.monthlyDepreciation !== 8333.33) {
    throw new Error(`Expected monthly depreciation 8333.33, got ${rbResult.monthlyDepreciation}`);
  }
  console.log("✅ Reducing Balance Math PASSED");

  // 4. Asset DB Insertion & Simulated Depreciation Run
  console.log("\n[Test 3] Registering Asset & Executing Depreciation Run...");
  const [asset] = await db
    .insert(fixedAssets)
    .values({
      tenantId,
      assetTag: `FA-LAPTOP-${Date.now()}`,
      assetName: "High Performance Developer Laptops",
      acquisitionDate: new Date(),
      purchaseCost: 120000,
      salvageValue: 0,
      usefulLifeMonths: 60,
      depreciationMethod: "STRAIGHT_LINE",
      accumulatedDepreciation: 0,
      bookValue: 120000,
      depreciationExpenseAccountId: deprExpenseAccId,
      accumulatedDepreciationAccountId: accumDeprAccId,
      status: "ACTIVE",
    })
    .returning();

  console.log("Registered Asset:", asset);

  // Execute Depreciation Post
  const deprCalc = calculateMonthlyDepreciation({
    purchaseCost: asset.purchaseCost,
    salvageValue: asset.salvageValue,
    usefulLifeMonths: asset.usefulLifeMonths,
    depreciationMethod: asset.depreciationMethod as any,
    accumulatedDepreciation: asset.accumulatedDepreciation,
    bookValue: asset.bookValue,
  });

  const jvLines = [
    { accountId: asset.depreciationExpenseAccountId, debit: deprCalc.monthlyDepreciation, credit: 0, narration: `Monthly Depreciation - ${asset.assetTag}` },
    { accountId: asset.accumulatedDepreciationAccountId, debit: 0, credit: deprCalc.monthlyDepreciation, narration: `Accumulated Depreciation - ${asset.assetTag}` },
  ];

  const validation = validateVoucherInvariants(jvLines);
  console.log("Depreciation JV Invariant Check:", validation);

  if (!validation.isValid) {
    throw new Error(`Invariant check failed for Depreciation JV: ${validation.error}`);
  }

  const [jv] = await db
    .insert(vouchers)
    .values({
      tenantId,
      voucherNumber: `JV-DEPR-${asset.assetTag}`,
      voucherType: "JV",
      voucherDate: new Date(),
      fiscalYear: "2026-2027",
      periodNumber: 4,
      narration: `Automated Depreciation Run for ${asset.assetName}`,
      totalAmount: deprCalc.monthlyDepreciation,
      status: "APPROVED",
      makerId: "system-depr-runner",
    })
    .returning();

  await db.insert(voucherLines).values(
    jvLines.map((l) => ({
      voucherId: jv.id,
      accountId: l.accountId,
      debit: l.debit,
      credit: l.credit,
      narration: l.narration,
    }))
  );

  // Update Asset Record
  await db
    .update(fixedAssets)
    .set({
      accumulatedDepreciation: deprCalc.newAccumulatedDepreciation,
      bookValue: deprCalc.newBookValue,
    })
    .where(eq(fixedAssets.id, asset.id));

  const updatedAsset = await db.select().from(fixedAssets).where(eq(fixedAssets.id, asset.id)).get();
  console.log("Updated Asset State:", updatedAsset);

  if (updatedAsset?.accumulatedDepreciation !== 2000 || updatedAsset?.bookValue !== 118000) {
    throw new Error("Asset state update failed after depreciation run");
  }

  console.log("✅ Fixed Asset Depreciation Run DB Integration PASSED");

  console.log("\n🎉 ALL STEP 12 FIXED ASSET DEPRECIATION TESTS PASSED SUCCESSFULLY!");
}

runAssetDepreciationTests().catch((err) => {
  console.error("❌ Step 12 Test Failed:", err);
  process.exit(1);
});
