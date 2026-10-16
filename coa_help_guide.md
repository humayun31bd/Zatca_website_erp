# Chart of Accounts (COA) Accountant Guide & Operation Manual

---

## 1. Overview & Standard Architecture
The **Chart of Accounts (COA)** is the financial backbone of the Numou ERP General Ledger. It organizes all financial transactions into a 5-level hierarchical structure complying with statutory international accounting standards (IFRS / GAAP) and local tax requirements (NBR Bangladesh & ZATCA Saudi Arabia).

---

## 2. 5-Level Hierarchy & Coding Convention

| Level | Level Name | Code Format | Description / Example | Can Post JVs? |
|---|---|---|---|:---:|
| **Level 1** | Account Class | `1` to `5` | `1` Assets, `2` Liabilities, `3` Equity, `4` Revenue, `5` Expenses | ❌ No |
| **Level 2** | Account Group | `X.XX` | `1.10` Current Assets, `4.10` Sales Revenue | ❌ No |
| **Level 3** | Account Category | `X.XX.XX` | `1.10.01` Cash & Bank, `2.10.02` VAT Payable | ❌ No |
| **Level 4** | Control Account | `X.XX.XX.XXX` | `1.10.01.001` Cash on Hand, `4.10.01.001` In-Store Sales | ❌ No |
| **Level 5** | Sub-Account / Detail | `X.XX.XX.XXX.XXX` | `1.10.01.001.001` Store Till Float - Dhanmondi | ✅ **Yes** |

> ⚠️ **Core Accounting Rule**: Only **Level 5 Detail Sub-Accounts** (or Level 4 accounts if depth is set to 4) with `Is Transaction = True` can receive journal voucher debit/credit postings. Levels 1–3 serve strictly as reporting roll-up parents.

---

## 3. Screen Layout & Panel Clarifications

### 3.1 Left Panel: Accounts Tree View
- **5 Class Folders**: Root folders for `ASSET` (Green), `LIABILITY` (Amber), `EQUITY` (Purple), `REVENUE` (Blue), and `EXPENSE` (Red).
- **Expand / Collapse All Controls**: Top action icons to instantly expand or collapse all tree nodes.
- **Node Status Indicators**:
  - `Folder Icon`: Group or parent account containing child sub-accounts.
  - `Document Icon`: Detail account node.
  - `Txn Chip`: Blue pill indicating `Is Transaction = True` (eligible for voucher postings).
- **Add Root Button (`+ Add Account`)**: Located on Class headers to add a new Level 1 or Level 2 account under that class.

### 3.2 Right Panel: Account Details & Edit Form (2-Column Layout)
- **Header Badge**: Displays current Level (`Level 1` to `Level 5`) and Account Class (`ASSET`, `LIABILITY`, etc.).
- **Left Column**:
  - **Account Name**: Official title of the account (e.g., *Petty Cash - Main Counter*).
  - **Account Type**: Immutable class selector (read-only for existing accounts).
- **Right Column**:
  - **Parent Account**: Dropdown selector of eligible Level $N-1$ parent accounts.
  - **Account Classification**: Subtype dropdown (`Fixed Asset`, `Inventory`, `Receivables`, `Payables`, `Bank`, `Cash`, `Cost Center`).
- **Feature Toggles**:
  - **Is Active**: Toggles account availability across the system.
  - **Is Transaction**: Enables/disables direct GL line entry posting.
  - **Is Cash Nature**: Marks account for Cash Book / Cash Voucher filtering.
  - **Is Bank Nature**: Marks account for Bank Reconciliation & Cheque Leaf lifecycle.

---

## 4. All Buttons & Action Controls Clarification

| Button / Control | Location | Function & Accountant Guidance |
|---|---|---|
| **Add Account** | Tree Class Header | Creates a new top-level or group account under the selected Account Class. |
| **Add Sub-Account** | Form Footer | Creates a new child account directly under the currently selected parent node. Auto-generates the next sequential code. |
| **Save Account** | Form Footer | Validates form fields and updates or persists the account to SQLite and Cloud DB. |
| **Save & Add Another** | Form Footer | Saves current account and immediately resets form to add another sub-account under the same parent. |
| **Delete Account** | Form Footer | Deletes unposted account. **Protected**: Fails if account has sub-accounts or posted GL vouchers. |
| **Expand All** | Tree Header | Unfolds all sub-accounts across all 5 levels for a full bird’s-eye view. |
| **Collapse All** | Tree Header | Folds all levels back to main Class folders. |
| **Help (`?`)** | Screen Top Bar | Opens interactive step-by-step training dialog. |

---

## 5. Keyboard Shortcuts Quick Reference

| Shortcut | Function / Action | Context |
|---|---|---|
| **F1** | Focus Account Filter / Search Input | Accounts Tree Panel |
| **F2** | Expand All / Collapse All Tree View | Accounts Tree Panel |
| **F3** | Add New Sub-Account under selected node | Active Selected Account |
| **Ctrl + S** or **F12** | Save Account Changes | Detail Form Panel |
| **Esc** | Cancel Creation / Close Modal | Any Overlay |
| **Up / Down Arrows** | Move highlight up or down in Accounts Tree | Accounts Tree Panel |
| **Right / Left Arrows** | Expand or Collapse highlighted node | Accounts Tree Panel |

---

## 6. Step-by-Step Practical Examples for New Accountants

### Example 1: Creating a Level 5 Petty Cash Account
**Objective**: Create a detail petty cash account for Dhanmondi Store Outlet under Cash on Hand.

1. In the Left Tree, click **ASSET** $\rightarrow$ **Current Assets (1.10)** $\rightarrow$ **Cash & Bank (1.10.01)** $\rightarrow$ **Cash on Hand (1.10.01.001)**.
2. Click **Add Sub-Account** at the bottom of the right panel.
3. System auto-sets:
   - **Level**: `5`
   - **Parent Account**: `Cash on Hand (1.10.01.001)`
   - **Auto Code**: `1.10.01.001.001`
4. Enter **Account Name**: `Petty Cash - Dhanmondi Outlet`.
5. Select **Account Classification**: `CASH`.
6. Toggles: Set `Is Transaction = True`, `Is Active = True`, `Is Cash Nature = True`.
7. Click **Save Account**. Account is now ready for Cash Receipt/Payment Vouchers!

---

### Example 2: Creating a Level 5 Beverage Sales Revenue Account
**Objective**: Create a product-specific sales account for Beverage retail sales.

1. Expand **REVENUE** $\rightarrow$ **Sales Revenue (4.10)** $\rightarrow$ **Merchandise Sales (4.10.01)** $\rightarrow$ **In-Store Sales (4.10.01.001)**.
2. Click **Add Sub-Account**.
3. System auto-generates code `4.10.01.001.001`.
4. Enter **Account Name**: `Sales – Beverages`.
5. Select **Account Classification**: `COST_CENTER` (or leave default for revenue).
6. Toggles: Set `Is Transaction = True`, `Is Active = True`.
7. Click **Save Account**.

---

### Example 3: Creating an Operating Bank Account with Cheque Leaf Support
**Objective**: Register Dutch-Bangla Bank Operating Account for cheque payments.

1. Expand **ASSET** $\rightarrow$ **Current Assets (1.10)** $\rightarrow$ **Cash & Bank (1.10.01)** $\rightarrow$ **Bank Accounts (1.10.01.002)**.
2. Click **Add Sub-Account**.
3. Auto Code generated: `1.10.01.002.001`.
4. Enter **Account Name**: `DBBL Operating A/C #11029384`.
5. Select **Account Classification**: `BANK`.
6. Toggles: Set `Is Transaction = True`, `Is Active = True`, `Is Bank Nature = True`.
7. Click **Save Account**. This enables Cheque Book registration and Bank Reconciliation for this account!

---

## 7. Account Rules & Safety Checks
- **Code Uniqueness**: Account codes are auto-generated to prevent duplicates and maintain mathematical hierarchy.
- **Parent Level Rules**: Level $N$ accounts can only be assigned to a Level $N-1$ parent account of the same Account Class.
- **Delete Protection**: Accounts with existing sub-accounts or posted vouchers cannot be deleted. Deactivate them by setting `Is Active = False`.
- **System Accounts**: Core system accounts (Retained Earnings, Output VAT, Cash Float) are locked to maintain tax compliance.

---

*Document Version: 2.0 (Updated for Numou ERP Accounting Standard)*  
*Target Audience: Accountants, Finance Managers, Auditors*
