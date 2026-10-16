import Database from "better-sqlite3";
import { db } from "../src/lib/db";
import { accounts, exchangeRates, vouchers, voucherLines } from "../src/lib/db/accounting_schema";
import { tenants } from "../src/lib/db/schema";
import { calculateRealizedForexGainLoss, calculateUnrealizedRevaluation } from "../src/lib/accounting/forex_calculator";
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

    CREATE TABLE IF NOT EXISTS exchange_rates (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      currency_code TEXT NOT NULL,
      base_currency TEXT DEFAULT 'BDT' NOT NULL,
      exchange_rate REAL NOT NULL,
      effective_date INTEGER NOT NULL,
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
      debit REAL DEFAULT 0 NOT NULL,
      credit REAL DEFAULT 0 NOT NULL,
      narration TEXT
    );
  `);
  sqlite.close();
}

async function runForexEngineTests() {
  console.log("=== Running Step 13: Multi-Currency Forex Gain/Loss Engine Integration Tests ===");
  ensureTablesExist();

  const tenantId = "test-tenant-forex-1";

  // 1. Seed Tenant
  const existingTenant = await db.select().from(tenants).where(eq(tenants.id, tenantId)).get();
  if (!existingTenant) {
    await db.insert(tenants).values({
      id: tenantId,
      name: "Global Multi-Currency Enterprise",
      code: "FX-TEN",
      vatNumber: "1122334455667",
      email: "forex@global.com",
    } as any);
  }

  // 2. Realized Forex Gain/Loss Unit Calculation Test
  console.log("\n[Test 1] Testing Realized Forex Gain/Loss Calculation...");
  const foreignInvoiceUsd = 10000;
  const originalBookingRate = 110.0; // 1 USD = 110 BDT
  const settlementRate = 120.0;     // 1 USD = 120 BDT

  const realizedResult = calculateRealizedForexGainLoss(foreignInvoiceUsd, originalBookingRate, settlementRate);
  console.log("Realized Forex Calculation Result:", realizedResult);

  if (realizedResult.originalBaseAmount !== 1100000) throw new Error("Original base amount mismatch");
  if (realizedResult.settlementBaseAmount !== 1200000) throw new Error("Settlement base amount mismatch");
  if (realizedResult.gainLossAmount !== 100000 || !realizedResult.isGain) {
    throw new Error("Realized Forex Gain calculation failed");
  }
  console.log("✅ Realized Forex Math PASSED");

  // 3. Period-End Unrealized Revaluation Unit Calculation Test
  console.log("\n[Test 2] Testing Period-End Unrealized Revaluation Math...");
  const foreignBankBalanceUsd = 50000;
  const currentBookBaseValueBdt = 5750000; // Booked @ 115 BDT
  const closingRateUsd = 118.0;             // Closing rate = 118 BDT

  const unrealizedResult = calculateUnrealizedRevaluation(foreignBankBalanceUsd, currentBookBaseValueBdt, closingRateUsd);
  console.log("Unrealized Forex Calculation Result:", unrealizedResult);

  if (unrealizedResult.newRevaluedBaseValue !== 5900000) throw new Error("New revalued base amount mismatch");
  if (unrealizedResult.unrealizedGainLoss !== 150000 || !unrealizedResult.isGain) {
    throw new Error("Unrealized Forex Revaluation calculation failed");
  }
  console.log("✅ Unrealized Forex Math PASSED");

  // 4. Register Foreign Exchange Rates in DB
  console.log("\n[Test 3] Inserting Exchange Rate Record in DB...");
  const [rateRecord] = await db
    .insert(exchangeRates)
    .values({
      tenantId,
      currencyCode: "USD",
      baseCurrency: "BDT",
      exchangeRate: 118.5,
      effectiveDate: new Date(),
    })
    .returning();

  console.log("Registered Exchange Rate:", rateRecord);
  if (!rateRecord.id || rateRecord.exchangeRate !== 118.5) {
    throw new Error("Exchange rate database insertion failed");
  }
  console.log("✅ Exchange Rate DB Insertion PASSED");

  // 5. Post Revaluation JV to Database & Verify Double-Entry Invariants
  console.log("\n[Test 4] Posting Period-End Forex Revaluation JV to DB...");
  const usdBankAccId = `acc-usd-bank-${Date.now()}`;
  const unrealizedGainAccId = `acc-unrealized-gain-${Date.now()}`;

  await db.insert(accounts).values([
    { id: usdBankAccId, tenantId, code: "1.10.05", name: "USD Bank Account", type: "ASSET", level: 5, isTransaction: true },
    { id: unrealizedGainAccId, tenantId, code: "4.20.01", name: "Unrealized Forex Gain", type: "REVENUE", level: 5, isTransaction: true },
  ]);

  const jvLines = [
    { accountId: usdBankAccId, debit: unrealizedResult.unrealizedGainLoss, credit: 0, narration: "Unrealized Forex Gain Revaluation (USD @ 118.0)" },
    { accountId: unrealizedGainAccId, debit: 0, credit: unrealizedResult.unrealizedGainLoss, narration: "Unrealized Forex Gain Credit" },
  ];

  const validation = validateVoucherInvariants(jvLines);
  console.log("Revaluation JV Invariant Check:", validation);

  if (!validation.isValid) {
    throw new Error(`Invariant validation failed for Forex Revaluation JV: ${validation.error}`);
  }

  const [jv] = await db
    .insert(vouchers)
    .values({
      tenantId,
      voucherNumber: `JV-FX-REVAL-${Date.now()}`,
      voucherType: "JV",
      voucherDate: new Date(),
      fiscalYear: "2026-2027",
      periodNumber: 4,
      narration: "Period-End USD Revaluation JV",
      totalAmount: unrealizedResult.unrealizedGainLoss,
      status: "APPROVED",
      makerId: "system-forex-revaluer",
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

  console.log(`Created Forex Revaluation JV with ID: ${jv.id}, Total Amount: ৳${jv.totalAmount}`);
  console.log("✅ Forex Revaluation JV DB Posting PASSED");

  console.log("\n🎉 ALL STEP 13 MULTI-CURRENCY FOREX ENGINE TESTS PASSED SUCCESSFULLY!");
}

runForexEngineTests().catch((err) => {
  console.error("❌ Step 13 Test Failed:", err);
  process.exit(1);
});
