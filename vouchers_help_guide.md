# General Ledger Vouchers Accountant Guide & Operation Manual

---

## 1. Overview & Core Accounting Invariants
The **Vouchers Module** in Numou ERP processes all transaction entries posted to the General Ledger. Every financial transaction must be recorded using a double-entry voucher satisfying the fundamental double-entry balance invariant:

$$\sum \text{Debit Amount} = \sum \text{Credit Amount}$$

### Core Accounting Policies:
- **No Direct Edits on Posted Vouchers**: Posted vouchers are immutable. Any correction must be executed via an official **Reversal Voucher + New Voucher**.
- **Level 5 CoA Posting**: Voucher lines must reference a valid Level 5 Detail Account code (`Is Transaction = True`).
- **Maker-Checker Workflow**:
  $$\text{DRAFT (Maker)} \longrightarrow \text{CHECKED (Checker)} \longrightarrow \text{APPROVED / POSTED (Approver)}$$
- **Transactional Outbox Cloud Sync**: Every posted voucher writes a sync payload to `syncQueue` for offline/online cloud database synchronization.

---

## 2. 4 Standard Voucher Types Specification

| Voucher Type | Code | Primary Purpose & Usage | Default Account Routing |
|---|---|---|---|
| **Receipt Voucher** | `RV` | Money received into Cash or Bank (Customer collections, POS daily sales, owner capital). | **Debit**: Cash on Hand / Bank Account<br>**Credit**: Sales / AR / Income Account |
| **Payment Voucher** | `PV` | Money paid out from Cash or Bank (Vendor bill payments, rent, salaries, TDS/VDS tax). | **Debit**: Vendor AP / Expense Account<br>**Credit**: Cash / Bank / TDS / VDS Payable |
| **Contra Voucher** | `CV` | Internal transfers between Cash and Bank accounts (Bank cash withdrawal, cash deposit, vault transfer). | **Debit**: Receiving Cash/Bank Account<br>**Credit**: Paying Cash/Bank Account |
| **Journal Voucher** | `JV` | Non-cash adjustments, accruals, depreciation, forex revaluation, year-end closing entries. | **Debit**: Expense / Asset Adjustment<br>**Credit**: Accumulated Depreciation / Income |

---

## 3. Screen Layout & Panel Clarifications

### 3.1 Top Header & Voucher Type Selector Bar
- **Voucher Type Tabs**: Toggle between `RECEIPT_VOUCHER` (RV), `PAYMENT_VOUCHER` (PV), and `CONTRA_VOUCHER` (CV). *(Note: Journal Vouchers `JV` are created under the dedicated **Journal Entries** screen).*
- **Sync Status Widget**:
  - `SYNCED` (Green): Voucher is backed up to cloud database.
  - `PENDING` (Orange): Saved in local SQLite, waiting for network push.
  - `SYNCING` (Blue): Active sync transfer in progress.
- **Pending Sync Counter**: Displays count of unpushed outbox vouchers.
- **Help Button (`?`)**: Opens interactive cashier & accountant training guide dialog.

### 3.2 Voucher Header Form Panel
- **Voucher Number**: Auto-generated sequential ID (e.g., `PV-2026-0042`, `RV-2026-0019`).
- **Voucher Date**: Transaction date (defaults to current date).
- **Fiscal Year & Period**: Auto-populated based on voucher date (e.g., `FY 2026-2027`, Period `4`).
- **Fund / Cost Center**: Tag for outlet branch or department cost allocation.
- **Cheque Leaf Reference**: (Mandatory when Bank Account is used) Auto-selects next `AVAILABLE` leaf from registered Cheque Book (e.g. `CHQ-007001`).
- **Payee / Customer Name**: Official payee or payer entity.
- **Narration / Description**: Mandatory full text transaction explanation.

### 3.3 Double-Entry Line Items Table & Balance Indicator
- **Account Selector**: Dropdown searching Level 5 transaction accounts by code or name.
- **Branch / Cost Center Tags**: Line-item level branch allocation.
- **Debit Amount (৳)**: Line debit value.
- **Credit Amount (৳)**: Line credit value.
- **Line Narration**: Optional line-specific note.
- **Live Balance Indicator Widget**:
  - `BALANCED`: $\text{Total Debit} = \text{Total Credit}$ (Green banner).
  - `UNBALANCED`: Displays exact difference $\text{Total Debit} - \text{Total Credit}$ (Red warning banner; blocks posting until balanced).

### 3.4 Action Controls & Document Export Bar
- **Save Draft**: Saves voucher in `DRAFT` status for later editing.
- **Submit for Checking**: Advances voucher status from `DRAFT` to `CHECKED`.
- **Approve & Post**: Finalizes voucher posting, updates GL ledger, and enqueues cloud sync.
- **Live Preview (`👁️`)**: Opens interactive modal showing formatted voucher document.
- **Print / PDF Export (`🖨️`)**: Generates print-ready PDF tax voucher with 4-tier signature block (Prepared By, Checked By, Approved By, Payee Signature).

---

## 4. Complete Keyboard Shortcuts Matrix

| Shortcut | Function / Action | Panel Context |
|---|---|---|
| **F1** | Focus Account Selector in Active Line Item | Voucher Lines Table |
| **F2** | Open Registered Cheque Book / Leaf Picker Modal | Voucher Header Panel |
| **F3** | Add New Line Item Row to Voucher | Voucher Lines Table |
| **F4** | Switch Voucher Type Tab (RV $\rightarrow$ PV $\rightarrow$ CV $\rightarrow$ JV) | Top Header Bar |
| **F6** | Auto-Calculate Tax Deduction at Source (TDS/VDS) | Payment Voucher Form |
| **F7** | Open Interactive Live Voucher Preview Modal | Screen Action Bar |
| **F8** | Export Print-Ready PDF Voucher Document | Screen Action Bar |
| **F10** | Verify Balance Invariant & Validate Voucher | Form Footer |
| **Ctrl + S** or **F12** | Save / Submit Voucher Record | Screen Action Bar |
| **Esc** | Close Overlay Modal / Cancel Form | Any Modal |

---

## 5. All Buttons & Action Controls Clarification

| Button / Control | Icon / Color | Functional Description & Guidance |
|---|---|---|
| **Voucher Type Tabs** | 📜 Tab Buttons | Selects transaction mode (Receipt, Payment, Contra, Journal). Auto-filters relevant account dropdowns. |
| **Add Line Item** | ➕ Blue Button | Appends a new debit/credit line row to the voucher. |
| **Remove Line Item** | 🗑️ Red Icon | Removes specific line item from voucher table. |
| **Calculate TDS / VDS** | ⚖️ Purple Button | Automatically computes NBR Tax (TDS 3%/7.5%) and VAT (VDS 5%/15%) on bill payment and splits line into Net Payee + Tax Liabilities. |
| **Live Preview** | 👁️ Blue Icon | Opens interactive live preview modal showing voucher layout, invariant totals, Bangla/English currency words, and signature block. |
| **Print / PDF Export** | 🖨️ Green Icon | Downloads formatted PDF tax voucher for paper signature archiving. |
| **Sync Queue Widget** | 🔄 Badge | Shows local SQLite vs Cloud Postgres sync status. Click to force manual outbox sync. |

---

## 6. Step-by-Step Practical Accountant Examples

### Example 1: Creating a Payment Voucher (PV) with NBR Tax (TDS/VDS) Auto-Deduction
**Scenario**: Pay TechSupply Bangladesh Ltd ৳250,000 for IT Hardware via Dutch-Bangla Bank Cheque, auto-deducting 10% TDS (৳25,000) and 5% VDS (৳12,500).

1. Click **Payment Voucher (PV)** tab (`F4`).
2. Auto-generated Voucher #: `PV-2026-0042`.
3. Select Payee: `TechSupply Bangladesh Ltd`.
4. Enter Narration: `Vendor Settlement for IT Hardware with TDS 10% & VDS 5%`.
5. Select Cheque Leaf: `CHQ-007001` (Auto-allocated).
6. Line 1: Select `5.10.01 IT Equipment Expense` $\rightarrow$ **Debit**: `৳250,000.00`
7. Click **Calculate TDS/VDS** (`F6`). System automatically adds:
   - Line 2: `1.10.02 DBBL Bank Account` $\rightarrow$ **Credit**: `৳212,500.00` (Net payment)
   - Line 3: `2.10.05 Govt TDS Payable` $\rightarrow$ **Credit**: `৳25,000.00`
   - Line 4: `2.10.06 Govt VDS Payable` $\rightarrow$ **Credit**: `৳12,500.00`
8. Live Balance Indicator shows **BALANCED (৳0.00 Diff)**.
9. Click **Approve & Post** (`F12`). Click **Print PDF** (`F8`) for signatures.

---

### Example 2: Creating a Receipt Voucher (RV) for Daily POS Counter Collection
**Scenario**: Deposit ৳180,000 cash collected from Dhanmondi POS store tills into Cash on Hand.

1. Click **Receipt Voucher (RV)** tab.
2. Enter Narration: `Daily Sales Counter Cash Collection - Dhanmondi Superstore`.
3. Line 1: Select `1.10.01.001 Petty Cash / Till Float` $\rightarrow$ **Debit**: `৳180,000.00`
4. Line 2: Select `4.10.01.001 In-Store Sales Revenue` $\rightarrow$ **Credit**: `৳180,000.00`
5. Live Balance Indicator: **BALANCED**.
6. Click **Approve & Post**. Auto-posts GL voucher and enqueues sync queue entry.

---

### Example 3: Creating a Contra Voucher (CV) for Bank Cash Withdrawal
**Scenario**: Withdraw ৳50,000 cash from Dutch-Bangla Bank to replenish store cash float using Cheque `CHQ-007002`.

1. Click **Contra Voucher (CV)** tab.
2. Select Cheque Leaf: `CHQ-007002`.
3. Enter Narration: `Bank cash withdrawal for store cashier float replenishment`.
4. Line 1: Select `1.10.01.001 Cash on Hand` $\rightarrow$ **Debit**: `৳50,000.00`
5. Line 2: Select `1.10.01.002 DBBL Bank Account` $\rightarrow$ **Credit**: `৳50,000.00`
6. Click **Approve & Post**. Cheque Leaf `CHQ-007002` status updates from `ISSUED` to `PRESENTED`.

---

### Example 4: Creating a Journal Voucher (JV) for Monthly Asset Depreciation
**Scenario**: Post monthly depreciation expense of ৳15,000 for Store Fixtures.

1. Click **Journal Voucher (JV)** tab.
2. Enter Narration: `Monthly Straight-Line Depreciation Run for Store Fixtures`.
3. Line 1: Select `5.20.05 Depreciation Expense` $\rightarrow$ **Debit**: `৳15,000.00`
4. Line 2: Select `1.20.01.001 Accumulated Depreciation - Fixtures` $\rightarrow$ **Credit**: `৳15,000.00`
5. Click **Approve & Post**. Updates Fixed Asset Register book value automatically.

---

## 7. Compliance & Audit Pack Export
- **Auditor Read-Only Access**: Internal and External Auditors can review all vouchers, view line items, and post audit queries/observations.
- **Audit-Ready Pack**: Export complete zip package containing PDF vouchers, GL ledger logs, cheque leaf histories, and auditor query registers for annual statutory audit.

---

*Document Version: 2.0 (Updated for Numou ERP Accounting Standard)*  
*Target Audience: Accountants, Finance Officers, Internal Auditors*
