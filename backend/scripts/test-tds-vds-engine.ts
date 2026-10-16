import Database from "better-sqlite3";
import { db } from "../src/lib/db";
import { accounts, tdsVdsRates, vouchers, voucherLines } from "../src/lib/db/accounting_schema";
import { tenants } from "../src/lib/db/schema";
import { calculateTdsVdsDeductions } from "../src/lib/accounting/tax_calculator";
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
      email TEXT,
      address TEXT,
      phone TEXT
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      level INTEGER NOT NULL,
      is_transaction INTEGER DEFAULT 0 NOT NULL,
      is_bank_nature INTEGER DEFAULT 0 NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tds_vds_rates (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      category_name TEXT NOT NULL,
      tds_percentage REAL DEFAULT 0.0 NOT NULL,
      vds_percentage REAL DEFAULT 0.0 NOT NULL,
      effective_date INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1 NOT NULL
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

async function runTdsVdsTests() {
  console.log("=== Running Step 11: TDS/VDS NBR Tax Engine Integration Tests ===");
  ensureTablesExist();

  const tenantId = "test-tenant-tax-1";

  // Ensure prerequisite tenant
  const existingTenant = await db.select().from(tenants).where(eq(tenants.id, tenantId)).get();
  if (!existingTenant) {
    await db.insert(tenants).values({
      id: tenantId,
      name: "Tax Test Enterprise",
      code: "TEN-TAX",
      vatNumber: "1234567890123",
      email: "tax@test.com",
      address: "Dhaka, Bangladesh",
      phone: "+8801700000000",
    } as any);
  }

  // 1. Pure Calculation Unit Test
  console.log("\n[Test 1] Testing calculateTdsVdsDeductions utility...");
  const grossBill = 100000;
  const tdsPct = 5; // 5% TDS
  const vdsPct = 7.5; // 7.5% VDS

  const result = calculateTdsVdsDeductions(grossBill, tdsPct, vdsPct);
  console.log("Deduction result:", result);

  if (result.tdsAmount !== 5000) throw new Error(`Expected TDS 5000, got ${result.tdsAmount}`);
  if (result.vdsAmount !== 7500) throw new Error(`Expected VDS 7500, got ${result.vdsAmount}`);
  if (result.netVendorPayable !== 87500) throw new Error(`Expected Net Payable 87500, got ${result.netVendorPayable}`);
  if (result.netVendorPayable + result.tdsAmount + result.vdsAmount !== grossBill) {
    throw new Error("Mathematical balance failure!");
  }
  console.log("✅ Unit calculation test PASSED");

  // 2. Database Tax Rate Registration
  console.log("\n[Test 2] Inserting TDS/VDS Tax Rate Record...");
  const [rate] = await db
    .insert(tdsVdsRates)
    .values({
      tenantId,
      categoryName: "IT Consultancy Services",
      tdsPercentage: 10.0,
      vdsPercentage: 5.0,
      effectiveDate: new Date(),
      isActive: true,
    })
    .returning();

  console.log("Registered Tax Category Rate:", rate);
  if (!rate.id || rate.tdsPercentage !== 10 || rate.vdsPercentage !== 5) {
    throw new Error("Tax rate database insertion failed");
  }
  console.log("✅ Tax Rate DB registration PASSED");

  // 3. Payment Voucher Integration with TDS/VDS Lines
  console.log("\n[Test 3] Verifying Payment Voucher with Tax Lines...");
  const expenseAccId = `acc-exp-${Date.now()}`;
  const bankAccId = `acc-bank-${Date.now()}`;
  const tdsPayableAccId = `acc-tds-${Date.now()}`;
  const vdsPayableAccId = `acc-vds-${Date.now()}`;

  await db.insert(accounts).values([
    { id: expenseAccId, tenantId, code: "5.10.01", name: "IT Consultancy Expense", type: "EXPENSE", level: 5, isTransaction: true },
    { id: bankAccId, tenantId, code: "1.10.02", name: "Dutch-Bangla Bank", type: "ASSET", level: 5, isTransaction: true, isBankNature: true },
    { id: tdsPayableAccId, tenantId, code: "2.10.05", name: "Govt TDS Payable", type: "LIABILITY", level: 5, isTransaction: true },
    { id: vdsPayableAccId, tenantId, code: "2.10.06", name: "Govt VDS Payable", type: "LIABILITY", level: 5, isTransaction: true },
  ]);

  const billAmount = 250000;
  const taxDeductions = calculateTdsVdsDeductions(billAmount, rate.tdsPercentage, rate.vdsPercentage);

  const pvLines = [
    { accountId: expenseAccId, debit: billAmount, credit: 0, narration: "IT Consultancy Bill Gross Amount" },
    { accountId: bankAccId, debit: 0, credit: taxDeductions.netVendorPayable, narration: "Net Vendor Payment via Cheque" },
    { accountId: tdsPayableAccId, debit: 0, credit: taxDeductions.tdsAmount, narration: "TDS Deducted @ 10% under Section 52" },
    { accountId: vdsPayableAccId, debit: 0, credit: taxDeductions.vdsAmount, narration: "VDS Deducted @ 5% under VAT Act 2012" },
  ];

  const validation = validateVoucherInvariants(pvLines);
  console.log("Voucher Invariants check result:", validation);

  if (!validation.isValid) {
    throw new Error(`Tax Payment Voucher Invariant validation failed: ${validation.error}`);
  }
  if (validation.totalDebit !== 250000 || validation.totalCredit !== 250000) {
    throw new Error("Debit/Credit total mismatch");
  }

  const [pv] = await db
    .insert(vouchers)
    .values({
      tenantId,
      voucherNumber: `PV-TAX-${Date.now()}`,
      voucherType: "PV",
      voucherDate: new Date(),
      fiscalYear: "2026-2027",
      periodNumber: 4,
      narration: "Vendor Bill Settlement with TDS & VDS deductions",
      totalAmount: billAmount,
      status: "APPROVED",
      makerId: "maker-1",
      checkerId: "checker-1",
      approverId: "approver-1",
    })
    .returning();

  await db.insert(voucherLines).values(
    pvLines.map((l) => ({
      voucherId: pv.id,
      accountId: l.accountId,
      debit: l.debit,
      credit: l.credit,
      narration: l.narration,
    }))
  );

  console.log(`Created PV with ID: ${pv.id}, Total Amount: ৳${pv.totalAmount}`);
  console.log("✅ Tax-Deducted Payment Voucher Integration PASSED");

  console.log("\n🎉 ALL STEP 11 TDS/VDS TAX ENGINE TESTS PASSED SUCCESSFULLY!");
}

runTdsVdsTests().catch((err) => {
  console.error("❌ Step 11 Test Failed:", err);
  process.exit(1);
});
