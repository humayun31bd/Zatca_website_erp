import Database from "better-sqlite3";
import { db } from "../src/lib/db";
import { tenants, branches, users } from "../src/lib/db/schema";
import {
  accounts,
  accountMappings,
  costCenters,
  tdsVdsRates,
  chequeBooks,
  chequeLeaves,
  vouchers,
  voucherLines,
  financialYears,
  financialPeriods,
} from "../src/lib/db/accounting_schema";
import { validateVoucherInvariants } from "../src/lib/accounting/validator";
import { calculateTdsVdsDeductions } from "../src/lib/accounting/tax_calculator";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

function ensureTablesExist() {
  const sqlite = new Database("sqlite.db");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT,
      vat_number TEXT,
      email TEXT,
      phone TEXT,
      address TEXT
    );

    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS cost_centers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      is_active INTEGER DEFAULT 1 NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      account_subtype TEXT,
      level INTEGER NOT NULL,
      parent_id TEXT,
      is_control INTEGER DEFAULT 0 NOT NULL,
      is_transaction INTEGER DEFAULT 0 NOT NULL,
      is_cash_nature INTEGER DEFAULT 0 NOT NULL,
      is_bank_nature INTEGER DEFAULT 0 NOT NULL,
      is_active INTEGER DEFAULT 1 NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
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
      amount REAL,
      issued_date INTEGER,
      cleared_date INTEGER,
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
      cheque_leaf_id TEXT,
      cheque_number TEXT,
      narration TEXT NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'DRAFT' NOT NULL,
      maker_id TEXT NOT NULL,
      checker_id TEXT,
      approver_id TEXT,
      sync_status TEXT DEFAULT 'PENDING' NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS voucher_lines (
      id TEXT PRIMARY KEY,
      voucher_id TEXT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      branch_id TEXT,
      cost_center_id TEXT,
      debit REAL DEFAULT 0 NOT NULL,
      credit REAL DEFAULT 0 NOT NULL,
      narration TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS account_mappings (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      module_key TEXT NOT NULL,
      mapping_key TEXT NOT NULL,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      updated_at INTEGER DEFAULT (unixepoch())
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_account_mapping_tenant_key ON account_mappings(tenant_id, module_key, mapping_key);
  `);
  sqlite.exec(`
    PRAGMA foreign_keys = OFF;
    DELETE FROM users WHERE tenant_id = 'tenant-grocery-01';
    DELETE FROM voucher_lines WHERE voucher_id IN (SELECT id FROM vouchers WHERE tenant_id = 'tenant-grocery-01');
    DELETE FROM vouchers WHERE tenant_id = 'tenant-grocery-01';
    DELETE FROM cheque_leaves WHERE tenant_id = 'tenant-grocery-01';
    DELETE FROM cheque_books WHERE tenant_id = 'tenant-grocery-01';
    DELETE FROM tds_vds_rates WHERE tenant_id = 'tenant-grocery-01';
    DELETE FROM account_mappings WHERE tenant_id = 'tenant-grocery-01';
    DELETE FROM accounts WHERE tenant_id = 'tenant-grocery-01';
    DELETE FROM cost_centers WHERE tenant_id = 'tenant-grocery-01';
    DELETE FROM branches WHERE tenant_id = 'tenant-grocery-01';
    PRAGMA foreign_keys = ON;
  `);
  sqlite.close();
}

async function seedGroceryAccounting() {
  console.log("=== Seeding Grocery Business Accounting Module & General Ledger ===");
  ensureTablesExist();

  const tenantId = "tenant-grocery-01";

  // 1. Seed Tenant & Outlets
  console.log("\n[1/6] Seeding Supermarket Tenant & Outlets...");
  let tenant = await db.select().from(tenants).where(eq(tenants.id, tenantId)).get();
  if (!tenant) {
    [tenant] = await db
      .insert(tenants)
      .values({
        id: tenantId,
        name: "Shapla Supermarket Chain Ltd",
        code: "SHAPLA-GROCERY",
        vatNumber: "1801122334455",
        email: "accounts@shaplamart.com",
        phone: "+8801711000999",
        address: "Plot 42, Dhanmondi 27, Dhaka 1209, Bangladesh",
      } as any)
      .returning();
  }
  console.log(`Tenant Registered: ${tenant.name} (${tenant.vatNumber})`);

  // 1.5 Seed Grocery Admin User for Login
  const passwordHash = await bcrypt.hash("password123", 10);
  const userEmail = "accounts@shaplamart.com";
  let user = await db.select().from(users).where(eq(users.email, userEmail)).get();
  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        email: userEmail,
        passwordHash,
        role: "TENANT_ADMIN",
        tenantId: tenantId,
      } as any)
      .returning();
  }
  console.log(`Grocery Tenant Admin User created: ${userEmail} (Password: password123)`);

  // 1.8 Seed Financial Year & 12 Monthly Periods
  let fy = await db.select().from(financialYears).where(eq(financialYears.tenantId, tenantId)).get();
  if (!fy) {
    const fyFromDate = new Date("2026-07-01T00:00:00.000Z");
    const fyToDate = new Date("2027-06-30T23:59:59.000Z");

    [fy] = await db
      .insert(financialYears)
      .values({
        tenantId,
        name: "FY 2026-2027",
        fromDate: fyFromDate,
        toDate: fyToDate,
        isActive: true,
        isClosed: false,
      })
      .returning();

    for (let i = 1; i <= 12; i++) {
      const pFrom = new Date(2026, 5 + i, 1);
      const pTo = new Date(2026, 6 + i, 0, 23, 59, 59);
      const monthName = pFrom.toLocaleString("default", { month: "short", year: "numeric" });
      await db.insert(financialPeriods).values({
        tenantId,
        financialYearId: fy.id,
        periodNumber: i,
        periodName: `Period ${i} (${monthName})`,
        fromDate: pFrom,
        toDate: pTo,
        isLocked: false,
      });
    }
    console.log(`Seeded Financial Year FY 2026-2027 with 12 monthly periods`);
  }

  // Branches / Outlets
  const branchDhanmondiId = `br-dhanmondi-${tenantId}`;
  const branchGulshanId = `br-gulshan-${tenantId}`;

  await db.insert(branches).values({ id: branchDhanmondiId, tenantId, name: "Dhanmondi Flagship Superstore", code: "DHM-01", address: "Dhanmondi 27, Dhaka", phone: "+8801711000901" } as any);
  await db.insert(branches).values({ id: branchGulshanId, tenantId, name: "Gulshan Avenue Superstore", code: "GUL-02", address: "Gulshan 2, Dhaka", phone: "+8801711000902" } as any);
  console.log("Seeded 2 Outlets (Dhanmondi Flagship & Gulshan Avenue)");

  // 2. Cost Centers / Departments
  console.log("\n[2/6] Seeding Departments & Cost Centers...");
  const ccProduceId = `cc-produce-${tenantId}`;
  const ccDairyMeatId = `cc-dairymeat-${tenantId}`;
  const ccPackagedId = `cc-packaged-${tenantId}`;
  const ccPosCashierId = `cc-poscheckout-${tenantId}`;
  const ccHqLogisticsId = `cc-hqlogistics-${tenantId}`;

  await db.insert(costCenters).values([
    { id: ccProduceId, tenantId, name: "Fresh Produce & Vegetables Department" },
    { id: ccDairyMeatId, tenantId, name: "Dairy, Meat & Frozen Foods Department" },
    { id: ccPackagedId, tenantId, name: "Bakery & Packaged Goods Department" },
    { id: ccPosCashierId, tenantId, name: "POS Checkout & Cash Register Department" },
    { id: ccHqLogisticsId, tenantId, name: "HQ Administration & Supply Chain Logistics" },
  ]);
  console.log("Seeded 5 Grocery Departments & Cost Centers");

  // 3. Chart of Accounts Hierarchy (Level 1 to Level 5)
  console.log("\n[3/6] Seeding 5-Level Grocery Chart of Accounts...");

  // Level 1 Headers
  const assetL1 = `acc-1-asset-${tenantId}`;
  const liabL1 = `acc-2-liab-${tenantId}`;
  const eqL1 = `acc-3-eq-${tenantId}`;
  const revL1 = `acc-4-rev-${tenantId}`;
  const expL1 = `acc-5-exp-${tenantId}`;

  await db.insert(accounts).values([
    { id: assetL1, tenantId, code: "1.0.0.00.000", name: "ASSETS", type: "ASSET", level: 1, isControl: true },
    { id: liabL1, tenantId, code: "2.0.0.00.000", name: "LIABILITIES", type: "LIABILITY", level: 1, isControl: true },
    { id: eqL1, tenantId, code: "3.0.0.00.000", name: "EQUITY & CAPITAL", type: "EQUITY", level: 1, isControl: true },
    { id: revL1, tenantId, code: "4.0.0.00.000", name: "REVENUE & SALES", type: "REVENUE", level: 1, isControl: true },
    { id: expL1, tenantId, code: "5.0.0.00.000", name: "EXPENSES & COGS", type: "EXPENSE", level: 1, isControl: true },
  ]);

  // Level 5 Transaction Accounts
  const accCashMainId = `acc-cash-main-${tenantId}`;
  const accCashGulshanId = `acc-cash-gulshan-${tenantId}`;
  const accBankDbblId = `acc-bank-dbbl-${tenantId}`;
  const accBankBracPosId = `acc-bank-bracpos-${tenantId}`;
  const accStockFreshId = `acc-stock-fresh-${tenantId}`;
  const accStockDryId = `acc-stock-dry-${tenantId}`;
  const accArCorporateId = `acc-ar-corp-${tenantId}`;
  const accEquipmentChillerId = `acc-eq-chiller-${tenantId}`;
  const accAccumDeprEquipmentId = `acc-accum-depr-eq-${tenantId}`;

  const accApVendorsId = `acc-ap-vendors-${tenantId}`;
  const accTdsPayableId = `acc-tds-payable-${tenantId}`;
  const accVdsPayableId = `acc-vds-payable-${tenantId}`;

  const accShareCapitalId = `acc-equity-capital-${tenantId}`;
  const accRetainedEarningsId = `acc-equity-retained-${tenantId}`;

  const accRevPosSalesId = `acc-rev-pos-${tenantId}`;
  const accRevWholesaleId = `acc-rev-wholesale-${tenantId}`;
  const accRevShelfDisplayId = `acc-rev-shelf-${tenantId}`;

  const accCogsGroceryId = `acc-cogs-grocery-${tenantId}`;
  const accExpElectricityId = `acc-exp-electric-${tenantId}`;
  const accExpSalariesId = `acc-exp-salaries-${tenantId}`;
  const accExpStoreRentId = `acc-exp-storerent-${tenantId}`;
  const accExpDeprChillersId = `acc-exp-deprchillers-${tenantId}`;

  const level5Accounts = [
    // Assets
    { id: accCashMainId, tenantId, code: "1.10.01.001", name: "Cash in Hand - Dhanmondi Main Register", type: "ASSET", accountSubtype: "CASH", level: 5, isTransaction: true, isCashNature: true },
    { id: accCashGulshanId, tenantId, code: "1.10.01.002", name: "Cash in Hand - Gulshan Register", type: "ASSET", accountSubtype: "CASH", level: 5, isTransaction: true, isCashNature: true },
    { id: accBankDbblId, tenantId, code: "1.10.02.001", name: "Dutch-Bangla Bank Operating Acc", type: "ASSET", accountSubtype: "BANK", level: 5, isTransaction: true, isBankNature: true },
    { id: accBankBracPosId, tenantId, code: "1.10.02.002", name: "Brac Bank POS Merchant Settlement Acc", type: "ASSET", accountSubtype: "BANK", level: 5, isTransaction: true, isBankNature: true },
    { id: accStockFreshId, tenantId, code: "1.20.01.001", name: "Grocery Inventory Stock - Produce & Frozen", type: "ASSET", accountSubtype: "INVENTORY", level: 5, isTransaction: true },
    { id: accStockDryId, tenantId, code: "1.20.01.002", name: "Grocery Inventory Stock - Dry & Packaged", type: "ASSET", accountSubtype: "INVENTORY", level: 5, isTransaction: true },
    { id: accArCorporateId, tenantId, code: "1.20.02.001", name: "Corporate Client Accounts Receivable", type: "ASSET", accountSubtype: "RECEIVABLES", level: 5, isTransaction: true },
    { id: accEquipmentChillerId, tenantId, code: "1.30.01.001", name: "Commercial Refrigerators & Display Chillers", type: "ASSET", accountSubtype: "FIXED_ASSET", level: 5, isTransaction: true },
    { id: accAccumDeprEquipmentId, tenantId, code: "1.30.02.001", name: "Accumulated Depreciation - Store Equipment", type: "ASSET", accountSubtype: "FIXED_ASSET", level: 5, isTransaction: true },

    // Liabilities
    { id: accApVendorsId, tenantId, code: "2.10.01.001", name: "Wholesale Trade Vendors & Distributors Payable", type: "LIABILITY", accountSubtype: "PAYABLES", level: 5, isTransaction: true },
    { id: accTdsPayableId, tenantId, code: "2.10.02.001", name: "Govt TDS Payable (Sec 52 NBR Tax)", type: "LIABILITY", level: 5, isTransaction: true },
    { id: accVdsPayableId, tenantId, code: "2.10.03.001", name: "Govt VDS Payable (VAT Act 2012)", type: "LIABILITY", level: 5, isTransaction: true },

    // Equity
    { id: accShareCapitalId, tenantId, code: "3.10.01.001", name: "Paid-up Share Capital", type: "EQUITY", level: 5, isTransaction: true },
    { id: accRetainedEarningsId, tenantId, code: "3.20.01.001", name: "Retained Earnings / Accumulated Surplus", type: "EQUITY", level: 5, isTransaction: true },

    // Revenue
    { id: accRevPosSalesId, tenantId, code: "4.10.01.001", name: "POS Retail Grocery Sales Revenue", type: "REVENUE", level: 5, isTransaction: true },
    { id: accRevWholesaleId, tenantId, code: "4.10.02.001", name: "Wholesale & Bulk Corporate Sales Revenue", type: "REVENUE", level: 5, isTransaction: true },
    { id: accRevShelfDisplayId, tenantId, code: "4.20.01.001", name: "Supplier Shelf Display & Listing Fee Income", type: "REVENUE", level: 5, isTransaction: true },

    // Expenses
    { id: accCogsGroceryId, tenantId, code: "5.10.01.001", name: "Cost of Goods Sold (COGS) - Grocery Purchases", type: "EXPENSE", level: 5, isTransaction: true },
    { id: accExpElectricityId, tenantId, code: "5.10.02.001", name: "Store Electric Power & Cold Storage Utilities", type: "EXPENSE", level: 5, isTransaction: true },
    { id: accExpSalariesId, tenantId, code: "5.10.03.001", name: "Store Staff Salaries & Cashier Overtime", type: "EXPENSE", level: 5, isTransaction: true },
    { id: accExpStoreRentId, tenantId, code: "5.10.04.001", name: "Commercial Supermarket Store Lease Rent", type: "EXPENSE", level: 5, isTransaction: true },
    { id: accExpDeprChillersId, tenantId, code: "5.20.01.001", name: "Depreciation Expense - Refrigerators & Chillers", type: "EXPENSE", level: 5, isTransaction: true },
  ];

  await db.insert(accounts).values(level5Accounts as any);
  console.log(`Seeded ${level5Accounts.length} Level 5 Transaction Accounts`);

  // 3.5 Seed Default Module Account Mappings
  console.log("\n[3.5/6] Seeding Predefined Module Account Mappings...");
  await db.insert(accountMappings).values([
    { tenantId, moduleKey: 'POS', mappingKey: 'POS_CASH', accountId: accCashMainId },
    { tenantId, moduleKey: 'POS', mappingKey: 'POS_BANK', accountId: accBankDbblId },
    { tenantId, moduleKey: 'POS', mappingKey: 'POS_REVENUE', accountId: accRevPosSalesId },
    { tenantId, moduleKey: 'POS', mappingKey: 'POS_RECEIVABLE', accountId: accArCorporateId },
    { tenantId, moduleKey: 'PURCHASE', mappingKey: 'PURCHASE_AP', accountId: accApVendorsId },
    { tenantId, moduleKey: 'PURCHASE', mappingKey: 'PURCHASE_COGS', accountId: accCogsGroceryId },
    { tenantId, moduleKey: 'TAX', mappingKey: 'VAT_PAYABLE', accountId: accVdsPayableId },
    { tenantId, moduleKey: 'TAX', mappingKey: 'TDS_PAYABLE', accountId: accTdsPayableId },
    { tenantId, moduleKey: 'INVENTORY', mappingKey: 'INVENTORY_ASSET', accountId: accStockFreshId },
  ] as any);
  console.log("Seeded 9 Predefined Module Account Mappings (POS, Purchase, Tax, Inventory)");

  // 4. Seed NBR Tax (TDS/VDS) Rates
  console.log("\n[4/6] Seeding NBR Bangladesh Tax Rates for Grocery Operations...");
  await db.insert(tdsVdsRates).values([
    { tenantId, categoryName: "Grocery Wholesale Supply", tdsPercentage: 3.0, vdsPercentage: 7.5, effectiveDate: new Date(), isActive: true },
    { tenantId, categoryName: "Supermarket Commercial Lease Rent", tdsPercentage: 5.0, vdsPercentage: 15.0, effectiveDate: new Date(), isActive: true },
  ]);
  console.log("Seeded NBR Tax Rates (Wholesale Supply 3%/7.5%, Store Rent 5%/15%)");

  // 5. Seed Cheque Book & Leaves
  console.log("\n[5/6] Seeding Registered Cheque Book & Leaf Register...");
  const [chequeBook] = await db
    .insert(chequeBooks)
    .values({
      tenantId,
      bankAccountId: accBankDbblId,
      chequeBookNumber: "CB-DBBL-2026-01",
      startLeafNumber: 7001,
      endLeafNumber: 7010,
      totalLeaves: 10,
      status: "ACTIVE",
    })
    .returning();

  const leavesToInsert = [];
  for (let i = 7001; i <= 7010; i++) {
    leavesToInsert.push({
      tenantId,
      chequeBookId: chequeBook.id,
      bankAccountId: accBankDbblId,
      leafNumber: `00${i}`,
      status: "AVAILABLE",
    });
  }

  await db.insert(chequeLeaves).values(leavesToInsert);
  console.log(`Seeded Cheque Book CB-DBBL-2026-01 with 10 Cheque Leaves (007001 - 007010)`);

  // 6. Seed Sample Grocery Vouchers (PV, RV, CV, JV)
  console.log("\n[6/6] Seeding Grocery Business Vouchers (PV, RV, CV, JV)...");

  // Voucher 1: Payment Voucher (PV) for Wholesale Dairy Stock Purchase with TDS & VDS
  const grossVendorBill = 150000;
  const taxCalc = calculateTdsVdsDeductions(grossVendorBill, 3.0, 7.5); // TDS: 4500, VDS: 11250, Net Payee: 134250

  const pvLines = [
    { accountId: accCogsGroceryId, branchId: branchDhanmondiId, costCenterId: ccDairyMeatId, debit: grossVendorBill, credit: 0, narration: "Wholesale Dairy & Agro Product Purchase - Pran Foods" },
    { accountId: accBankDbblId, branchId: branchDhanmondiId, costCenterId: ccDairyMeatId, debit: 0, credit: taxCalc.netVendorPayable, narration: "Net Payment via Cheque 007001" },
    { accountId: accTdsPayableId, branchId: branchDhanmondiId, costCenterId: ccDairyMeatId, debit: 0, credit: taxCalc.tdsAmount, narration: "TDS Deducted @ 3% (Sec 52 NBR Tax)" },
    { accountId: accVdsPayableId, branchId: branchDhanmondiId, costCenterId: ccDairyMeatId, debit: 0, credit: taxCalc.vdsAmount, narration: "VDS Deducted @ 7.5% (VAT Act 2012)" },
  ];

  const pvVal = validateVoucherInvariants(pvLines);
  if (!pvVal.isValid) throw new Error(`PV Invariant validation failed: ${pvVal.error}`);

  // Fetch leaf 007001
  const leaf001 = await db.select().from(chequeLeaves).where(eq(chequeLeaves.leafNumber, "007001")).get();

  const [pv] = await db
    .insert(vouchers)
    .values({
      tenantId,
      voucherNumber: `PV-GROCERY-001`,
      voucherType: "PV",
      voucherDate: new Date(),
      fiscalYear: "2026-2027",
      periodNumber: 4,
      costCenterId: ccDairyMeatId,
      chequeLeafId: leaf001?.id,
      chequeNumber: "007001",
      narration: "Wholesale Stock Settlement to Pran-RFL Agro Foods with TDS/VDS deductions",
      totalAmount: grossVendorBill,
      status: "APPROVED",
      makerId: "maker-grocery-1",
      checkerId: "checker-grocery-1",
      approverId: "approver-grocery-1",
      syncStatus: "PENDING",
    })
    .returning();

  await db.insert(voucherLines).values(
    pvLines.map((l) => ({
      voucherId: pv.id,
      accountId: l.accountId,
      branchId: l.branchId,
      costCenterId: l.costCenterId,
      debit: l.debit,
      credit: l.credit,
      narration: l.narration,
    }))
  );

  // Update Cheque Leaf status to ISSUED
  if (leaf001) {
    await db
      .update(chequeLeaves)
      .set({
        status: "ISSUED",
        voucherId: pv.id,
        payeeName: "Pran-RFL Agro Foods Ltd",
        amount: taxCalc.netVendorPayable,
        issuedDate: new Date(),
      })
      .where(eq(chequeLeaves.id, leaf001.id));
  }

  // Voucher 2: Receipt Voucher (RV) for Daily POS Cash Collection
  const posSalesCollection = 320000;
  const rvLines = [
    { accountId: accCashMainId, branchId: branchDhanmondiId, costCenterId: ccPosCashierId, debit: posSalesCollection, credit: 0, narration: "Daily POS Counter Cash Collection Deposit" },
    { accountId: accRevPosSalesId, branchId: branchDhanmondiId, costCenterId: ccPosCashierId, debit: 0, credit: posSalesCollection, narration: "Dhanmondi Outlet Retail Sales Revenue" },
  ];

  const rvVal = validateVoucherInvariants(rvLines);
  if (!rvVal.isValid) throw new Error(`RV Invariant validation failed: ${rvVal.error}`);

  const [rv] = await db
    .insert(vouchers)
    .values({
      tenantId,
      voucherNumber: `RV-GROCERY-001`,
      voucherType: "RV",
      voucherDate: new Date(),
      fiscalYear: "2026-2027",
      periodNumber: 4,
      costCenterId: ccPosCashierId,
      narration: "Dhanmondi Outlet Daily POS Cash Collection Deposit",
      totalAmount: posSalesCollection,
      status: "APPROVED",
      makerId: "cashier-main-1",
      checkerId: "checker-grocery-1",
      approverId: "approver-grocery-1",
      syncStatus: "PENDING",
    })
    .returning();

  await db.insert(voucherLines).values(
    rvLines.map((l) => ({
      voucherId: rv.id,
      accountId: l.accountId,
      branchId: l.branchId,
      costCenterId: l.costCenterId,
      debit: l.debit,
      credit: l.credit,
      narration: l.narration,
    }))
  );

  // Voucher 3: Contra Voucher (CV) for Bank Cash Withdrawal to Cash Drawer
  const cashWithdrawal = 50000;
  const cvLines = [
    { accountId: accCashMainId, branchId: branchDhanmondiId, costCenterId: ccPosCashierId, debit: cashWithdrawal, credit: 0, narration: "Cash Withdrawal for POS Cash Float replenishment" },
    { accountId: accBankDbblId, branchId: branchDhanmondiId, costCenterId: ccPosCashierId, debit: 0, credit: cashWithdrawal, narration: "Bank Withdrawal via Cheque 007002" },
  ];

  const cvVal = validateVoucherInvariants(cvLines);
  if (!cvVal.isValid) throw new Error(`CV Invariant validation failed: ${cvVal.error}`);

  const [cv] = await db
    .insert(vouchers)
    .values({
      tenantId,
      voucherNumber: `CV-GROCERY-001`,
      voucherType: "CV",
      voucherDate: new Date(),
      fiscalYear: "2026-2027",
      periodNumber: 4,
      costCenterId: ccPosCashierId,
      narration: "Bank Cash Withdrawal for Dhanmondi POS Float Replenishment",
      totalAmount: cashWithdrawal,
      status: "APPROVED",
      makerId: "maker-grocery-1",
      checkerId: "checker-grocery-1",
      approverId: "approver-grocery-1",
      syncStatus: "PENDING",
    })
    .returning();

  await db.insert(voucherLines).values(
    cvLines.map((l) => ({
      voucherId: cv.id,
      accountId: l.accountId,
      branchId: l.branchId,
      costCenterId: l.costCenterId,
      debit: l.debit,
      credit: l.credit,
      narration: l.narration,
    }))
  );

  // Voucher 4: Journal Voucher (JV) for Monthly COGS Inventory Consumption
  const cogsConsumption = 850000;
  const jvLines = [
    { accountId: accCogsGroceryId, branchId: branchDhanmondiId, costCenterId: ccProduceId, debit: cogsConsumption, credit: 0, narration: "Monthly Inventory COGS Consumption Expense" },
    { accountId: accStockFreshId, branchId: branchDhanmondiId, costCenterId: ccProduceId, debit: 0, credit: cogsConsumption, narration: "Inventory Stock Account Adjustment" },
  ];

  const jvVal = validateVoucherInvariants(jvLines);
  if (!jvVal.isValid) throw new Error(`JV Invariant validation failed: ${jvVal.error}`);

  const [jv] = await db
    .insert(vouchers)
    .values({
      tenantId,
      voucherNumber: `JV-GROCERY-001`,
      voucherType: "JV",
      voucherDate: new Date(),
      fiscalYear: "2026-2027",
      periodNumber: 4,
      costCenterId: ccProduceId,
      narration: "Monthly COGS Inventory Consumption Adjustment Entry",
      totalAmount: cogsConsumption,
      status: "APPROVED",
      makerId: "inventory-manager-1",
      checkerId: "checker-grocery-1",
      approverId: "approver-grocery-1",
      syncStatus: "PENDING",
    })
    .returning();

  await db.insert(voucherLines).values(
    jvLines.map((l) => ({
      voucherId: jv.id,
      accountId: l.accountId,
      branchId: l.branchId,
      costCenterId: l.costCenterId,
      debit: l.debit,
      credit: l.credit,
      narration: l.narration,
    }))
  );

  console.log("\nSeeded 4 Grocery Vouchers with Invariant Double-Entry Validation:");
  console.log(`- PV-GROCERY-001: ৳150,000 (Pran Dairy Purchase with TDS ৳4,500 & VDS ৳11,250)`);
  console.log(`- RV-GROCERY-001: ৳320,000 (Daily POS Counter Cash Collection)`);
  console.log(`- CV-GROCERY-001: ৳50,000 (Bank Cash Withdrawal for POS Float)`);
  console.log(`- JV-GROCERY-001: ৳850,000 (Monthly COGS Inventory Consumption)`);

  console.log("\n🎉 GROCERY BUSINESS ACCOUNTING MODULE SEEDING COMPLETED SUCCESSFULLY!");
}

seedGroceryAccounting().catch((err) => {
  console.error("❌ Grocery Accounting Seeding Failed:", err);
  process.exit(1);
});
