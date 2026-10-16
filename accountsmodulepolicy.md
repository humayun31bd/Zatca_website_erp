# Accounts Module Policy, Dual-Database Architecture & Implementation Plan

---

## Part 1: Accounts Module Policy & Functional Specification

### 1. Financial Year & Currency Policy
- **Financial Year Structure**: 
  - Standard financial year runs from **1 July to 30 June** (e.g., FY 2026-27).
  - Accounting periods are monthly (12 periods per FY, plus period 13 for year-end closing entries).
  - Periods can be locked to prevent retroactive entries.
- **Currency & Multi-Currency Handling**:
  - Base currency: **BDT (Bangladeshi Taka)**.
  - Multi-currency support for international transactions using daily exchange rate tables.
  - Foreign currency vouchers record original currency, exchange rate, and base currency equivalent (BDT). Realized and unrealized forex gain/loss posted to GL automatically.

### 2. General Ledger & Journal Rules
- Catch-all module for any financial transaction not covered by specialized sub-ledgers (AR, AP, Payroll, Fixed Assets).
- **Double-Entry Invariant**: Every transaction voucher must contain balanced line items where:
  $$\sum \text{Debit Amount} = \sum \text{Credit Amount}$$
- **Strict Data Quality Rules**:
  - No negative line quantities or negative line amounts permitted.
  - No zero-value transaction lines allowed.
  - All lines must reference a valid Level 5 Chart of Accounts (CoA) code, Cost Center, and Fund Source.
- **Voucher Attributes**: Mandatory Voucher Number (auto-generated sequence), Voucher Date, Voucher Type, Narration/Description, Maker User ID, Supporting Document Attachment(s), and Cheque Leaf Reference (when Bank nature account is used).
- **Immutability**: Posted vouchers cannot be modified or deleted. Errors are corrected exclusively via Reversal Vouchers + New Vouchers.

### 3. Cheque Management & Cheque Leaf Lifecycle Policy
- **Cheque Book Registration**:
  - Each bank account maintains registered Cheque Books (Cheque Book Number, Bank Account reference, Start Leaf Number, End Leaf Number, Total Leaf Count).
- **Cheque Leaf Status Lifecycle**:
  $$\text{AVAILABLE} \longrightarrow \text{ISSUED / RECEIVED} \longrightarrow \text{PRESENTED} \longrightarrow \begin{cases} \text{CLEARED} \\ \text{BOUNCED} \\ \text{CANCELLED} \end{cases}$$
- **Cheque Leaf Integration in Voucher Entry (RV, PV, CV)**:
  - **Payment Voucher (PV)**: Auto-allocates next `AVAILABLE` Cheque Leaf.
  - **Receipt Voucher (RV)**: Captures incoming payee cheque details (`RECEIVED`).
  - **Contra Voucher (CV)**: Mandates Cheque Leaf selection for cash withdrawals or bank transfers.

### 4. Auditor Access, Audit Queries & Comments Policy
- **Auditor Role & Permissions**:
  - **Internal Auditor & External Auditor** roles have **Strict Read-Only Access** across all financial modules, general ledger entries, vouchers, cheque registers, bank reconciliation, trial balance, and document attachments.
  - Auditors **cannot edit, modify, create, or post** financial vouchers or change period lock statuses.
- **Voucher Audit Queries & Observations**:
  - Auditors can post **Audit Queries, Comments, Compliance Observations, and Document Requests** attached directly to any voucher record.
  - Query Status Lifecycle:
    $$\text{OPEN (Query Raised)} \longrightarrow \text{RESPONDED (Management Answered)} \longrightarrow \text{RESOLVED / CLOSED (Auditor Cleared)}$$
  - Finance Team (Maker/Checker/Approver) receives automated notifications of raised queries and can post official **Management Responses / Explanations** with supporting document uploads.
  - Auditors can generate an **Audit-Ready Pack** export containing all vouchers, GL entries, approval histories, audit logs, and auditor query registers for time-bound external audits.

### 5. Advanced Compliance & Enterprise Features
- **Tax (TDS) & VAT (VDS) Auto-Deduction Engine**:
  - Auto-calculates Tax Deduction at Source (TDS) and VAT Deduction at Source (VDS) on vendor bill payments according to NBR Bangladesh tax rate schedules.
  - Auto-splits Payment Vouchers into Net Vendor Payee, TDS Payable, and VDS Payable.
- **Fixed Asset Depreciation Run Engine**:
  - Monthly automated depreciation run (Straight Line & Reducing Balance methods).
  - Auto-posts Depreciation Expense JVs and updates Accumulated Depreciation.
- **Multi-Currency Forex Revaluation**:
  - Period-end revaluation of foreign currency bank accounts and foreign currency AR/AP balances.
  - Automatically posts Realized and Unrealized Forex Gain/Loss JVs.
- **Recurring Vouchers & Amortization Scheduler**:
  - Automated generation of monthly recurring vouchers (Office Rent, Software Subscriptions, Insurance Prepayment Amortization).
- **Financial Year-End Closing Engine**:
  - Automated period 13 year-end closing transaction closing Income & Expense accounts to Accumulated Fund / Retained Earnings and carrying forward Balance Sheet balances to the new FY.
     
---

### 6. Role-Based Access Control (RBAC) & Permission Matrix
*(C = Create, R = Read, U = Update draft, A = Approve, P = Post/Lock, – = None)*

| Module / Function | Sys Admin | Maker | Checker | Approver | Budget Off. | Int. Auditor | Ext. Auditor | Mgmt (DG) |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Users & Roles** | CRUDU | – | – | R | – | R | R | – |
| **Chart of Accounts** | R | R | R | C/U/A | – | R | R | R |
| **Voucher Management** | – | C/R/U | R/Check | A/P | R | R | R | R |
| **Cheque Book & Leaves** | – | C/R/U | R | A/P | – | R | R | R |
| **Bank Reconciliation** | – | – | C/R/U | A/P | – | R | R | R |
| **Audit Queries & Comments** | – | R/Respond | R/Respond | R/Respond | – | C/R/U/Close | C/R/U/Close | R |
| **TDS / VDS Tax Engine** | – | C/R/U | R/Check | A/P | – | R | R | R |
| **Asset Depreciation Engine**| – | – | R | A/P | – | R | R | R |
| **Budgeting & Re-appropriation** | – | R | R | A/P | C/R/U | R | R | R |
| **Fund Allocation** | – | R | R | C/A | R | R | R | R |
| **Payables & Receivables** | – | C/R/U | R/Check | A/P | – | R | R | R |
| **Asset Register** | – | C/R/U | R/Check | A/P | – | R | R | R |
| **Period Lock & Closing** | – | – | R | P | – | R | R | R |
| **Financial Reports & Audit Pack**| – | R (Scoped) | R | R | R | R (Export) | R (Export) | R |

---

## Part 2: Dual-Database Architecture & Sync Engine Specification

### 1. Database Schema Specification

#### 1.1 Local SQLite Schema Blueprint (Drizzle ORM)

```typescript
// src/lib/db/accounting_schema.ts (SQLite Core)
import { sqliteTable, integer, text, real, check } from 'drizzle-orm/sqlite-core';

// 1. Voucher Audit Queries & Comments Table
export const voucherAuditComments = sqliteTable('voucher_audit_comments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull(),
  voucherId: text('voucher_id').references(() => vouchers.id, { onDelete: 'cascade' }).notNull(),
  auditorId: text('auditor_id').notNull(),
  auditorType: text('auditor_type').default('INTERNAL').notNull(),
  queryType: text('query_type').default('OBSERVATION').notNull(),
  commentText: text('comment_text').notNull(),
  status: text('status').default('OPEN').notNull(),
  managementResponse: text('management_response'),
  respondedBy: text('responded_by'),
  respondedAt: integer('responded_at', { mode: 'timestamp' }),
  resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

// 2. TDS / VDS Tax Rates Table (NBR Bangladesh Rules)
export const tdsVdsRates = sqliteTable('tds_vds_rates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull(),
  categoryName: text('category_name').notNull(), // e.g., 'Vendor Supply', 'Consultancy Fee', 'Rent'
  tdsPercentage: real('tds_percentage').default(0.0).notNull(),
  vdsPercentage: real('vds_percentage').default(0.0).notNull(),
  effectiveDate: integer('effective_date', { mode: 'timestamp' }).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
});

// 3. Fixed Assets Register Table
export const fixedAssets = sqliteTable('fixed_assets', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull(),
  assetTag: text('asset_tag').notNull(),
  assetName: text('asset_name').notNull(),
  assetCategoryId: text('asset_category_id').notNull(),
  costCenterId: text('cost_center_id').references(() => costCenters.id),
  acquisitionDate: integer('acquisition_date', { mode: 'timestamp' }).notNull(),
  purchaseCost: real('purchase_cost').notNull(),
  salvageValue: real('salvage_value').default(0.0).notNull(),
  usefulLifeMonths: integer('useful_life_months').notNull(),
  depreciationMethod: text('depreciation_method').default('STRAIGHT_LINE').notNull(), // STRAIGHT_LINE, REDUCING_BALANCE
  accumulatedDepreciation: real('accumulated_depreciation').default(0.0).notNull(),
  bookValue: real('book_value').notNull(),
  status: text('status').default('ACTIVE').notNull(), // ACTIVE, DISPOSED, WRITE_OFF
});

// 4. Recurring Voucher Schedule Table
export const recurringVouchers = sqliteTable('recurring_vouchers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull(),
  templateName: text('template_name').notNull(),
  voucherType: text('voucher_type').notNull(),
  frequency: text('frequency').default('MONTHLY').notNull(), // MONTHLY, QUARTERLY, ANNUAL
  amount: real('amount').notNull(),
  payloadJson: text('payload_json').notNull(),
  nextRunDate: integer('next_run_date', { mode: 'timestamp' }).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
});
```

---

## Part 3: Phased Implementation Plan & Execution Roadmap

### Phase 1 to Phase 8 (Weeks 1–16) — COMPLETED
- Foundation GL, Maker-Checker Workflow, Data Sync Engine, Cloud Postgres Ingestion, Financial Reports, Flutter UI, Cheque Management, Bank Reconciliation, and Auditor Portal.

### Phase 9: Enterprise Expansion & Compliance Automation (Weeks 17–20) — RECOMMENDED
- **Step 11**: TDS/VDS NBR Bangladesh Tax Auto-Deduction Engine.
- **Step 12**: Fixed Asset Register & Monthly Depreciation Run Scheduler.
- **Step 13**: Multi-Currency Realized & Unrealized Forex Gain/Loss Engine.
- **Step 14**: Recurring Voucher Template Runner & Amortization Scheduler.
- **Step 15**: Period Lock & Financial Year-End Closing Engine.

---

## Part 4: Step-by-Step AI Execution Prompts

---

### Step 1 to Step 10 (Completed)
*(Implemented and verified with automated test suites)*

---

### Step 11: NBR Tax (TDS/VDS) Auto-Calculation & Deduction Engine
```text
Task: Implement Tax Deduction at Source (TDS) and VAT Deduction at Source (VDS) Auto-Calculation Engine.
Requirements:
1. Extend `accounting_schema.ts` with `tdsVdsRates` table.
2. Build utility `calculateTdsVdsDeductions(billAmount, categoryId)` returning net vendor payment, TDS payable, and VDS payable amounts.
3. Build API POST /api/v1/accounts/tax/calculate-deduction.
4. Integrate with Payment Voucher creation so vendor payments automatically split into Net Vendor Payee, Govt TDS Payable, and Govt VDS Payable GL lines.
5. Write integration test `backend/scripts/test-tds-vds-engine.ts`.
```

---

### Step 12: Fixed Asset Register & Monthly Depreciation Run Engine
```text
Task: Implement Fixed Asset Register and Automated Monthly Depreciation Engine.
Requirements:
1. Extend `accounting_schema.ts` with `fixedAssets` table.
2. Build API POST /api/v1/accounts/assets (Registers new capital asset).
3. Build API POST /api/v1/accounts/assets/depreciate (Executes monthly depreciation run):
   - Calculates monthly depreciation per active asset using Straight Line or Reducing Balance methods.
   - Automatically posts Depreciation Expense JV (Debit: Depreciation Expense, Credit: Accumulated Depreciation).
   - Updates `accumulatedDepreciation` and `bookValue` on asset records.
4. Write integration test `backend/scripts/test-asset-depreciation.ts`.
```

---

### Step 13: Multi-Currency Forex Realized/Unrealized Gain & Loss Engine
```text
Task: Implement Multi-Currency Forex Revaluation and Realized/Unrealized Gain/Loss Engine.
Requirements:
1. Build API POST /api/v1/accounts/forex/revalue:
   - Revalues foreign currency bank accounts and foreign AR/AP balances against current exchange rate table.
   - Automatically generates Unrealized Forex Gain/Loss JVs for open period.
2. Update Payment Voucher & Receipt Voucher settlements to compute Realized Forex Gain/Loss on settled foreign currency invoices.
3. Write integration test `backend/scripts/test-forex-engine.ts`.
```

---

### Step 14: Recurring Journal Vouchers & Amortization Scheduler
```text
Task: Implement Recurring Voucher Template Scheduler and Amortization Engine.
Requirements:
1. Extend `accounting_schema.ts` with `recurringVouchers` table.
2. Build API POST /api/v1/accounts/recurring-vouchers (Saves recurring template).
3. Build API POST /api/v1/accounts/recurring-vouchers/process (Cron runner API):
   - Finds recurring templates due for execution.
   - Auto-generates draft/approved vouchers and schedules next run date.
4. Write integration test `backend/scripts/test-recurring-vouchers.ts`.
```

---

### 15. Voucher Print, PDF Export & Interactive Preview Policy
- **Standardized Voucher Layout Specification**:
  - Every voucher (RV, PV, JV, CV) must support real-time interactive previewing and 1-click PDF/Paper Print export.
  - **Header Block**: Company Name, Tenant VAT Registration Number, Branch/Cost Center Name, Document Title (e.g. *PAYMENT VOUCHER*, *RECEIPT VOUCHER*), Voucher Number, Date, Fiscal Year, Period Number.
  - **Cheque Reference Block**: (When Bank account is used) Cheque Book #, Cheque Leaf #, Payee Name, Issued/Cleared Date.
  - **Transaction Details Table**: Level 5 CoA Code, Account Title, Narration/Description, Debit Amount (৳), Credit Amount (৳).
  - **Invariant Totals & Currency in Words**: Total Debit, Total Credit ($\sum \text{Debit} = \sum \text{Credit}$), and Total Amount rendered in words in both English and Bangla numerals (e.g., *Two Hundred Fifty Thousand Taka Only* / *দুই লক্ষ পঞ্চাশ হাজার টাকা মাত্র*).
  - **Audit Queries & Observations Block**: Displays auditor compliance notes, query status (`OPEN` / `RESOLVED`), and management explanations.
  - **4-Tier Signature Block**:
    1. **Prepared By** (Maker Name & Timestamp)
    2. **Checked By** (Checker Name & Timestamp)
    3. **Approved By** (Approver Name & Timestamp)
    4. **Received By / Payee Signature**

---

## Part 3: Phased Implementation Plan & Execution Roadmap

### Phase 1 to Phase 9 (Weeks 1–20) — COMPLETED
- Foundation GL, Maker-Checker Workflow, Data Sync Engine, Cloud Postgres Ingestion, Financial Reports, Flutter UI, Cheque Management, Bank Reconciliation, Auditor Portal, TDS/VDS Tax Engine, Asset Depreciation Engine, Forex Revaluation Engine, Recurring Vouchers, Year-End Close Engine.

### Phase 10: Interactive UI & PDF Document Generation (Weeks 21–22) — RECOMMENDED
- **Step 16**: Live Voucher Preview Modal & PDF Print Generation Engine.

### Phase 11: POS & Sales Checkout GL Integration (Weeks 23–24) — COMPLETED
- **Step 17**: POS Screen & Sales Invoice Creation Double-Entry GL Voucher Generator.

---

## Part 4: Step-by-Step AI Execution Prompts

---

### Step 1 to Step 16 (Completed)
*(Implemented and verified with automated test suites)*

---

### Step 17: POS Screen & Sales Invoice Creation Double-Entry GL Voucher Generator
```text
Task: Link POS Screen and Sales Invoice Creation with Automated Double-Entry GL Voucher Generation.
Requirements:
1. Create POS GL Integration Helper `src/lib/accounting/pos_integration.ts`:
   - Function `generatePosInvoiceGlVoucher(input)` handles mapping POS payment methods (Cash, Card, Credit) to Level 5 CoA accounts.
   - Computes Sales Revenue, Output VAT Payable, and COGS Inventory Stock reduction lines.
   - Validates double-entry balance invariant sum(Debit) == sum(Credit).
   - Inserts voucher into `vouchers` and `voucher_lines` tables with status 'APPROVED'.
   - Enqueues outbox sync item into `sync_queue` for cloud push worker.
2. Link API Endpoint `backend/src/app/api/v1/invoices/route.ts`:
   - Invoke `generatePosInvoiceGlVoucher` immediately after saving invoice records.
3. Create Integration Test `backend/scripts/test-pos-gl-integration.ts`:
   - Simulates POS checkout invoice creation and asserts GL voucher balance, line narrations, and outbox sync enqueuing.
   - Verify execution with `npx tsx scripts/test-pos-gl-integration.ts`.
```


