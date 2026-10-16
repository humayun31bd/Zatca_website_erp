##Standard for tenants accounts chart of accounts predefined    

##Standard 5 level Chart of Accounts for Tenants    

Here's a **5-level Chart of Accounts (COA)** structure suitable for SME retail tenants (e.g., for a leasing platform, marketplace, or standalone accounting setup):

## Level Structure & Coding Convention

| Level | Name | Digits | Example |
|---|---|---|---|
| 1 | Account Class | 1 digit | 1 = Assets |
| 2 | Account Group | 3 digits | 111 = Current Assets |
| 3 | Account Category | 4 digits | 1101 = Cash & Bank |
| 4 | Control Account | 7 digits | 1101001 = Cash on Hand |
| 5 | Sub-Account / Detail | 10 digits | 1101001001 = Petty Cash |
     - Cost Center / Branch / Department / Cost Center / Branch / Project / Department / Profit Center / Outlet / Product Category
- is transaction level only. level 5 not required.
- if you want to add product category in account you can add in level 4 by making category 5 digit code
- if you want to add product sub category in account you can add in level 5 by making sub category 3 digit code 


**Code format:** `X-XXX-XXXX-XXXXXXX` (Class-Group-Category-Control)
**Note:** *Code used only internal management tree controls*

## Notes on Design
- **Level 1–3** are usually standardized system-wide (same for all tenants) so reporting can be consolidated across tenants.
- **Level 4–5** can be tenant-customizable (e.g., adding their own outlets, product categories, or cost centers) without breaking the parent structure.
- If tenants operate multiple outlets, consider adding an **outlet/cost-center dimension** as a separate tag rather

## Sample Chart for Retail tenant - 5 level accounts and 5 level with cost center / product category

Here's a sample chart for a mini-mart retail tenant. It uses the same code format as before (`Class.Group.Category.Control.Detail`), and Level 5 is where **product category** comes in. Cost centers work differently, and I explain why after the chart.

## Part 1: 5-Level Chart of Accounts (Retail Tenant)

**Assets**

| Code | Lvl | Account |
|---|---|---|
| 1 | 1 | Assets |
| 1.10 | 2 | Current Assets |
| 1.10.01 | 3 | Cash & Bank |
| 1.10.01.001 | 4 | Cash on Hand |
| 1.10.01.001.001 | 5 | Petty Cash |
| 1.10.01.001.002 | 5 | Store Till Float |
| 1.10.01.002 | 4 | Bank Accounts |
| 1.10.01.002.001 | 5 | Operating Account |
| 1.10.01.002.002 | 5 | Card Settlement Clearing |
| 1.10.02 | 3 | Receivables |
| 1.10.02.001 | 4 | Trade Receivables |
| 1.10.02.001.001 | 5 | Corporate Customers |
| 1.10.02.001.002 | 5 | Wallet / Card Receivable |
| 1.10.03 | 3 | Inventory |
| 1.10.03.001 | 4 | Merchandise Inventory |
| 1.10.03.001.001 | 5 | Inventory – Beverages |
| 1.10.03.001.002 | 5 | Inventory – Snacks & Confectionery |
| 1.10.03.001.003 | 5 | Inventory – Household |
| 1.10.03.001.004 | 5 | Inventory – Personal Care |
| 1.10.03.002 | 4 | Goods in Transit |
| 1.10.03.002.001 | 5 | Warehouse-to-Branch Transfers |
| 1.20 | 2 | Fixed Assets |
| 1.20.01 | 3 | Furniture & Equipment |
| 1.20.01.001 | 4 | Store Fixtures |
| 1.20.01.001.001 | 5 | Shelving & Chillers |
| 1.20.01.002 | 4 | POS & IT Equipment |
| 1.20.01.002.001 | 5 | POS Terminals |

**Liabilities and Equity**

| Code | Lvl | Account |
|---|---|---|
| 2.10.01.001 | 4 | Trade Payables |
| 2.10.01.001.001 | 5 | Local Suppliers |
| 2.10.01.001.002 | 5 | Import Suppliers |
| 2.10.02.001 | 4 | VAT Payable |
| 2.10.02.001.001 | 5 | Output VAT |
| 2.10.02.001.002 | 5 | Input VAT (offset) |
| 2.10.03.001 | 4 | Accrued Payroll |
| 2.10.03.001.001 | 5 | Salaries Payable |
| 3.10.01.001 | 4 | Owner Contribution |
| 3.10.01.001.001 | 5 | Initial Capital |
| 3.10.02.001 | 4 | Retained Earnings |
| 3.10.02.001.001 | 5 | Current Year Earnings |

**Revenue**

| Code | Lvl | Account |
|---|---|---|
| 4.10 | 2 | Sales Revenue |
| 4.10.01 | 3 | Merchandise Sales |
| 4.10.01.001 | 4 | In-Store Sales |
| 4.10.01.001.001 | 5 | Sales – Beverages |
| 4.10.01.001.002 | 5 | Sales – Snacks & Confectionery |
| 4.10.01.001.003 | 5 | Sales – Household |
| 4.10.01.001.004 | 5 | Sales – Personal Care |
| 4.10.01.002 | 4 | Online / Delivery Sales |
| 4.10.01.002.001 | 5 | Online Sales – Beverages |
| 4.10.01.002.002 | 5 | Online Sales – Snacks & Confectionery |
| 4.10.01.002.003 | 5 | Online Sales – Household |
| 4.10.01.002.004 | 5 | Online Sales – Personal Care |
| 4.10.02 | 3 | Sales Deductions |
| 4.10.02.001 | 4 | Returns |
| 4.10.02.001.001 | 5 | Sales Returns |
| 4.10.02.002 | 4 | Discounts |
| 4.10.02.002.001 | 5 | Promotional Discounts |

**Expenses**

| Code | Lvl | Account |
|---|---|---|
| 5.10 | 2 | Cost of Goods Sold |
| 5.10.01 | 3 | Cost of Merchandise Sold |
| 5.10.01.001 | 4 | COGS by Category |
| 5.10.01.001.001 | 5 | COGS – Beverages |
| 5.10.01.001.002 | 5 | COGS – Snacks & Confectionery |
| 5.10.01.001.003 | 5 | COGS – Household |
| 5.10.01.001.004 | 5 | COGS – Personal Care |
| 5.10.02 | 3 | Inventory Losses |
| 5.10.02.001 | 4 | Shrinkage & Write-offs |
| 5.10.02.001.001 | 5 | Stock Shrinkage |
| 5.10.02.001.002 | 5 | Expired Stock Write-off |
| 5.20 | 2 | Operating Expenses |
| 5.20.01 | 3 | Occupancy |
| 5.20.01.001 | 4 | Rent |
| 5.20.01.001.001 | 5 | Store Rent |
| 5.20.01.002 | 4 | Utilities |
| 5.20.01.002.001 | 5 | Electricity |
| 5.20.01.002.002 | 5 | Water & Internet |
| 5.20.02 | 3 | Staff Costs |
| 5.20.02.001 | 4 | Salaries & Wages |
| 5.20.02.001.001 | 5 | Salaries – Store Staff |
| 5.20.02.001.002 | 5 | Salaries – Warehouse & Delivery |
| 5.20.02.001.003 | 5 | Salaries – Admin |
| 5.20.03 | 3 | Selling & Logistics |
| 5.20.03.001 | 4 | Delivery & Transport |
| 5.20.03.001.001 | 5 | Fuel & Vehicle Costs |
| 5.20.03.002 | 4 | Payment & Platform Fees |
| 5.20.03.002.001 | 5 | Card Processing Fees |

## How chart of account page entry will work 

Chart of account level depth (4/5) (User can set this value on tenant profile page)
On Chart of Account page we need to show all the accounts from level 1 to level 5.

Page has two columns
Left panel has treeview to show chart of accounts 
  - On selection 2-5 level account show add button to add sub account 
  - add button enable only when level 4/5

Right panel has 
- Account (Asset/Liability/Equity/Revenue/Expense) as default parent for new account (Level 1)(Disable edit)
- Account name field(only edit when in level 2,3,4,5)(in level 1 disable)
- Parent account field 
  - Show only in level 2,3,4,5
  - Dropdown Show Parent Account based on level and account type
  - Disable edit when in level 1 or 5
- Is active field (Disable edit if account type is 1 or 5)

- Account Level 3 
  - Only edit when in level 3,4,5 (in level 1,2 disable)
  - Asset Types 
    - Asset(Dropdown)(Is Fixed Asset, Is Inventory, Is Receivables, Is Bank, Is Cash)
    - Liability(Dropdown)(Is Fixed Asset Depreciation, Is Payables, Is Cost Center) 
    - Expense (Dropdown)(Is Cost Center)
    - Revenue (Dropdown)(Is Cost Center) 
    - Owner's Equity(Dropdown)(Is Owner Contribution, Is Retained Earnings) 

- Account Level 4 (Disable edit if account is parent account or account type is 1 or 5 or 3)(only edit when in level 4)(in level 1,2,3 disable)
    Account Type	Eligible Parent Accounts for Level 4
    Is Inventory	Cost center types (Product Category)
    Is Receivables	Cost center types (e.g., Customer, Sales, etc.)
    Is Payables	Cost center types (e.g., Supplier, Cost Center, etc.)
    Is Cost Center	Cost center types (e.g., Sales, Admin, etc.)
    Other account types (Bank, Cash, Fixed Asset, Revenue, etc.)	None (cannot have level 4 subaccounts)
    - Is Transaction by default true if account level depth = 4

- Account Level 5 (Dropdown)(Disable edit if account is parent account or account type is 1 or 5 or 3 or 4)(only edit when in level 5)(in level 1,2,3,4 disable)
    Account Type	Eligible Parent Accounts for Level 5
    Is Inventory	Product Category accounts
    Is Fixed Assets	Fixed Asset accounts (assets with depreciation)
    Is Payables	Cost center types
    Is Cost Center	Cost center types
    Other account types (Receivables, Revenue, Bank, Cash, etc.)	None
- Is Transaction by default true if account level depth = 5




## Part 2: How Product Category and Cost Center Combine with Level 5

I handle the two dimensions differently, on purpose:

| Dimension | Where it lives | Why |
|---|---|---|
| **Product category** | **Embedded at Level 5** for Inventory, Sales, and COGS | The category list is small and stable (4 to 10). Category P&L is the core retail report, and it should appear on the statutory-style income statement without any tagging. |
| **Cost center** | **Tag on the journal line**, never in the account code | Multiplying accounts by cost centers gives you (accounts × cost centers × branches) rows. Tagging keeps the chart at about 60 accounts instead of thousands. |
| **Branch, supplier, customer** | Tags on the journal line (as designed earlier) | Same reasoning. |

**Cost center × expense matrix (tag-based, no extra accounts):**

| Expense account (L5) | Sales Floor | Warehouse | Delivery | Admin/HQ |
|---|---|---|---|---|
| 5.20.01.001.001 Store Rent | ✔ | ✔ | | ✔ |
| 5.20.01.002.001 Electricity | ✔ | ✔ | | ✔ |
| 5.20.02.001.001 Salaries – Store Staff | ✔ | | | |
| 5.20.02.001.002 Salaries – Warehouse & Delivery | | ✔ | ✔ | |
| 5.20.03.001.001 Fuel & Vehicle Costs | | | ✔ | |

Each ✔ is just a `cost_center_id` on the line. It is not a separate account.

**Sample journal entries showing all tags together:**

| Transaction | Account (L5) | Branch | Cost Center | Category | Supplier / Customer |
|---|---|---|---|---|---|
| Sold beverages in-store | Cr 4.10.01.001.001 Sales – Beverages | Outlet A | Sales Floor | Beverages | (walk-in) |
| Cost of that sale | Dr 5.10.01.001.001 COGS – Beverages | Outlet A | Sales Floor | Beverages | |
|  | Cr 1.10.03.001.001 Inventory – Beverages | Outlet A | Sales Floor | Beverages | |
| Bought snacks on credit | Dr 1.10.03.001.002 Inventory – Snacks | Outlet A | Warehouse | Snacks | Supplier X |
|  | Cr 2.10.01.001.001 Local Suppliers | Outlet A | Warehouse | | Supplier X |
| Delivery van fuel | Dr 5.20.03.001.001 Fuel & Vehicle | Outlet A | Delivery | | |

Because category is already in the Level 5 account for Sales, COGS, and Inventory, no extra column is needed for those lines. If you also want category on expense or transfer lines (marketing spend per category, for example), add a nullable `product_category_id` to `journal_entry_line`, next to `outlet_id` and `cost_center_id`.

One thing to decide before you build this: if a tenant adds a new product category, the system needs to auto-create three Level 5 accounts (Inventory, Sales, COGS). Would you rather generate those automatically when the category is created, or have the tenant's accountant approve them first? I can write that as a trigger or a service-layer routine.

I can also export this as an Excel COA template with the account codes, levels, and parent references ready to import.

transactions    

| Transaction | Type | Status | Date | Customer / Supplier | Branch | Counter | Category | Payment Method | Amount (SAR) | Tax (SAR) | Total (SAR) | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Daily Sales | Invoice | Posted | 2026-10-05 | Walk-in Customer | Main Street Branch | POS-01 | Groceries | Cash | 149.50 | 6.80 | 156.30 | Morning sales batch |
| Online Order #123 | Invoice | Posted | 2026-10-05 | Ahmed Hassan | Delivery | N/A | Groceries | Online Wallet | 89.90 | 4.10 | 94.00 | Order #123-456 |
| Supplier Delivery | Purchase | Posted | 2026-10-04 | Fresh Food Suppliers | Main Street Branch | Warehouse | Groceries | Credit | 780.00 | 35.45 | 815.45 | PO #2345 |
| Refund for Return | Credit Memo | Posted | 2026-10-03 | Sarah Ali | Main Street Branch | POS-02 | Groceries | Card | 22.50 | 1.02 | 23.52 | Returned milk carton |
| Utility Bill | Invoice | Posted | 2026-10-03 | Dubai Electricity | Head Office | N/A | Utilities | Direct Debit | 185.30 | 8.42 | 193.72 | September bill |
| Employee Salary | Payment | Posted | 2026-10-01 | Staff Salaries | Head Office | N/A | Payroll | Bank Transfer | 4,500.00 | 0.00 | 4,500.00 | October payroll |
| Online Order #124 | Invoice | Draft | 2026-10-05 | Fatima Khan | Delivery | N/A | Beverages | Credit Card | 45.00 | 2.05 | 47.05 | Pending payment |

## Sample Cost Center × Expense Matrix (Tag-Based)

| Expense Account (L5) | Sales Floor | Warehouse | Delivery | Admin/HQ | Total |
|---|---|---|---|---|---|
| 5.20.01.001.001 Store Rent | ✓ | ✓ | | ✓ | 4 |
| 5.20.01.002.001 Electricity | ✓ | ✓ | | ✓ | 4 |
| 5.20.02.001.001 Salaries – Store Staff | ✓ | | | | 1 |
| 5.20.02.001.002 Salaries – Warehouse & Delivery | | ✓ | ✓ | | 2 |
| 5.20.03.001.001 Fuel & Vehicle Costs | | | ✓ | | 1 |

Each ✓ indicates that this expense can be tagged with this cost center.

### Tagging Logic

For each expense account, you decide which cost centers can apply:

- **Store Rent**: Can be assigned to all branches (each branch is a cost center)
- **Electricity**: Can be assigned to all branches with meters
- **Salaries – Store Staff**: Only for store locations
- **Salaries – Warehouse & Delivery**: For warehouse and delivery operations
- **Fuel & Vehicle Costs**: For delivery vehicles

This keeps the chart compact while allowing detailed cost allocation.

## Sample Journal Entries

Here are several journal entries showing how tags work in practice:

### 1. Daily In-Store Sales (Cash)

**Transaction**: A customer buys groceries worth 149.50 SAR (including 6.80 SAR tax) using cash at the Main Street Branch POS-01 counter.

**Journal Entry**: 

```
Date: 2026-10-05
Type: Sales Invoice

Cash Transaction
Debit: 4.10.01.001.001 Sales – Groceries | 149.50
Credit: 2.10.02.001.001 Output VAT Payable | 6.80
Credit: 1.10.01.001.001 Cash on Hand | 156.30

Credit/Dues Transaction

Debit: 4.10.01.001.001 Accounts Receivables – Customer Account | 149.50
Credit: 2.10.02.001.001 Output VAT Payable | 6.80
Credit: 1.10.01.001.001 Sales – Groceries | 149.50

Partial Payments From Customer

Debit: 1.10.01.001.001 Cash on Hand | 100.00
Credit: 4.10.01.001.001 Accounts Receivables – Customer Account | 100.00


Tags:
  Branch: Main Street Branch
  Counter: POS-01
  Category: Groceries
```

**Explanation**: 
- The sale is recorded in the Sales account at the full amount including VAT
- Output VAT is recorded as a liability
- Cash on Hand increases by the total received
- The transaction is tagged with the branch, counter, and product category

### 2. Online Order with Wallet Payment

**Transaction**: Ahmed Hassan places an online order for 89.90 SAR (including 4.10 SAR tax) paid using his Online Wallet balance.

**Journal Entry**: 

```
Date: 2026-10-05
Type: Sales Invoice

Debit: 4.10.01.001.002 Sales – Groceries | 89.90
Credit: 2.10.02.001.001 Output VAT Payable | 4.10
Credit: 1.10.02.001.002 Wallet Receivable | 94.00

Tags:
  Branch: Delivery (no physical branch)
  Counter: N/A
  Category: Groceries
  Customer: Ahmed Hassan
```

**Explanation**: 
- The online sale is tagged with "Delivery" as the location
- The Online Wallet balance increases by the total amount
- This will later be settled when the wallet balance is transferred to the main bank account

### 3. Supplier Delivery Purchase

**Transaction**: Fresh Food Suppliers delivers 780.00 SAR worth of groceries (including 35.45 SAR tax) on credit for the Main Street Branch.

**Journal Entry**: 

```
Date: 2026-10-04
Type: Purchase Invoice

Debit: 1.10.03.001.001 Inventory – Groceries | 780.00
Credit: 2.10.01.001.001 Local Suppliers | 780.00

Tags:
  Branch: Main Street Branch
  Cost Center: Warehouse
  Category: Groceries
  Supplier: Fresh Food Suppliers
```

**Explanation**: 
- Inventory increases by the full invoice amount
- The supplier balance increases (accounts payable)
- The transaction is tagged with the branch, cost center, category, and supplier

Note: When the VAT is paid later, a separate entry will be made against the supplier account. This keeps the purchase transaction clean and focused on inventory movement.

### 4. Refund for Product Return

**Transaction**: Sarah Ali returns a milk carton purchased earlier and receives a refund of 22.50 SAR (including 1.02 SAR tax) to her card.

**Journal Entry**: 

```
Date: 2026-10-03
Type: Sales Return (Credit Memo)

Debit: 2.10.02.001.002 Output VAT Payable | 1.02
Debit: 4.10.02.001.001 Sales Returns | 22.50
Credit: 1.10.01.002.002 Card Settlement Clearing | 23.52

Tags:
  Branch: Main Street Branch
  Counter: POS-02
  Category: Groceries
  Customer: Sarah Ali
```

**Explanation**: 
- The sales return reduces the VAT liability and increases the sales returns account
- The full amount is credited to the card

---

## POS Screen & Invoice Creation GL Voucher Auto-Posting Policy

### 1. Functional Policy Overview
- **Trigger**: Every time a POS checkout counter or sales invoice is created/posted (`POST /api/v1/invoices`), the system automatically generates and posts balanced double-entry GL Vouchers (`RV` or `JV`).
- **Payment Method Account Routing**:
  - **CASH**: Debit `1.10.01.001.001` (Cash on Hand / Till Float).
  - **CARD / BANK / WALLET**: Debit `1.10.01.002.001` (Operating Bank / Card Clearing).
  - **CREDIT**: Debit `1.10.02.001.001` (Accounts Receivable).
- **Revenue & Tax Accounting**:
  - Credit `4.10.01.001.001` (Merchandise Sales Revenue) for Net Subtotal Amount.
  - Credit `2.10.02.001.001` (Output VAT Payable) for VAT Amount.
- **Inventory COGS Accounting**:
  - Debit `5.10.01.001.001` (Cost of Goods Sold - Merchandise) for Total Items COGS Cost.
  - Credit `1.10.03.001.001` (Merchandise Inventory Stock) for Total Items Cost.
- **Double-Entry Invariant Guard**:
  - Every auto-generated voucher is validated via `validateVoucherInvariants()` to ensure:
    $$\sum \text{Debit} = \sum \text{Credit}$$
- **Transactional Outbox Sync**:
  - Every auto-generated voucher writes an entry to `syncQueue` for background offline/online cloud database synchronization.

---

## Step-by-Step AI Execution Prompt

### Step 17: POS Screen & Invoice Creation Double-Entry GL Voucher Generator
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

