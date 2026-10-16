# General Ledger Vouchers Data Entry & Operational Policy Guide

## 📚 Overview

The **General Ledger Vouchers Module** enables accountants and cashiers to record, audit, and post double-entry financial transactions across the enterprise. It supports four primary voucher types: **Payment Vouchers (PV)**, **Receipt Vouchers (RV)**, **Contra Vouchers (CV)**, and **Journal Vouchers (JV)**.

---

## 📊 Double-Entry Transaction Rules & Accounting Matrix

| Voucher Type | Code | Header Cash/Bank Account | Detail Line Items | Accounting Purpose & Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **Payment Voucher** | `PV` | **Credit (Cr)** | **Debit (Dr)** | Cash/Bank Outflows (Vendor payments, expenses, payroll, NBR TDS/VDS deductions). |
| **Receipt Voucher** | `RV` | **Debit (Dr)** | **Credit (Cr)** | Cash/Bank Inflows (Customer AR collections, retail sales, capital additions). |
| **Contra Voucher** | `CV` | **Debit (Dr)** *(Receiving)* | **Credit (Cr)** *(Transferring)* | Internal Cash & Bank Transfers (Vault deposits, ATM cash withdrawals, bank-to-bank). |
| **Journal Voucher** | `JV` | N/A *(Balanced Line Items)* | **Debit (Dr) / Credit (Cr)** | Non-cash adjustments, depreciation, period-end accruals. |

> [!IMPORTANT]
> **Contra Voucher Restriction**: The system strictly prevents selecting the same Cash/Bank account in both the Header and Detail Line Items ($\text{Header Account} \neq \text{Detail Account}$).

---

## 🛡️ Voucher Entry Policy & Maker-Checker Approval Workflow

The system enforces a **Voucher Entry & Approval Policy** configured under **Settings $\rightarrow$ ACCOUNTING SETTINGS $\rightarrow$ Voucher Entry Policy**:

1. **Maker-Checker Workflow (`Require Accountant Approval`)**:
   - **Cashier / Staff Entry**: When a cashier or staff member creates a voucher, it is saved with status `DRAFT` (Pending Approval).
   - **Ledger Protection**: The General Ledger balance does **NOT** update while the voucher is in `DRAFT` status.
   - **Accountant Review & Approval**: An Accountant reviews the voucher under **Vouchers Register** / **Journal Entries** and clicks **Approve & Post**. Once approved, the status transitions to `POSTED`, and the General Ledger running balance updates immediately.

2. **Direct Auto-Post Policy (`Direct Posting`)**:
   - Vouchers post directly with status `POSTED` and update the General Ledger immediately upon creation.

3. **POS Day-End & Automated System Vouchers**:
   - **POS Day-End Vouchers**: Configurable between *Accountant Review & Approval* vs *Direct Auto-Post*.
   - **Module Vouchers**: System-generated vouchers (Sales Invoices, Purchase Orders, Inventory Movements) auto-post directly.

---

## 📝 Detailed Data Entry Step-by-Step Examples

### Example 1: Payment Voucher (PV) for Vendor Settlement
* **Scenario**: Paying TechSupply Ltd $2,500.00 for office IT equipment via Bank Transfer.
* **Navigation**: Go to **Accounting** $\rightarrow$ **Vouchers Register** $\rightarrow$ Select **Payment Voucher (PV)**.
* **Header Setup**:
  * **Voucher Date**: `2026-10-09`
  * **Header Cash/Bank Account (Credit)**: `Main Operating Bank Account`
* **Detail Line**:
  * **Account (Debit)**: `5.10.01.001 - Office Equipment Expense`
  * **Amount**: `$2,500.00`
  * **Description**: *"Vendor Payment for IT Hardware Order #PO-992"*
* **Accounting Imbalance Verification**:
  $$\text{Header Credit} = \$2,500.00 \quad \text{vs} \quad \text{Detail Line Debit} = \$2,500.00 \quad (\Delta = \$0.00)$$
* **Click Save / Post**: Recorded with status `POSTED` (or `DRAFT` for cashier approval).

---

### Example 2: Receipt Voucher (RV) for Customer Collection
* **Scenario**: Receiving $1,800.00 cash payment from Apex Logistics for Invoice #INV-8891.
* **Navigation**: Go to **Accounting** $\rightarrow$ **Vouchers Register** $\rightarrow$ Select **Receipt Voucher (RV)**.
* **Header Setup**:
  * **Voucher Date**: `2026-10-09`
  * **Header Cash/Bank Account (Debit)**: `Petty Cash in Hand - Gulshan Branch`
* **Detail Line**:
  * **Account (Credit)**: `1.20.02.001 - Accounts Receivable - Corporate Clients`
  * **Amount**: `$1,800.00`
  * **Description**: *"Customer Collection for Invoice #INV-8891"*
* **Accounting Imbalance Verification**:
  $$\text{Header Debit} = \$1,800.00 \quad \text{vs} \quad \text{Detail Line Credit} = \$1,800.00 \quad (\Delta = \$0.00)$$

---

### Example 3: Contra Voucher (CV) for Cash Withdrawal from Bank
* **Scenario**: Withdrawing $500.00 cash from Al Rajhi Bank into Store Cash Register.
* **Navigation**: Go to **Accounting** $\rightarrow$ **Vouchers Register** $\rightarrow$ Select **Contra Voucher (CV)**.
* **Header Setup**:
  * **Header Cash/Bank Account (Debit - Receiving)**: `Store Cash Register`
* **Detail Line**:
  * **Line Account (Credit - Transferring)**: `Al Rajhi Bank Account` *(System blocks selecting `Store Cash Register`)*
  * **Amount**: `$500.00`
  * **Description**: *"ATM Cash withdrawal for daily store float"*
* **Accounting Impact**:
  * Store Cash Register: $+\$500.00$ (Debit)
  * Al Rajhi Bank Account: $-\$500.00$ (Credit)

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Function / Action |
| :--- | :--- |
| `F1` | Focus Account Selector Dropdown in Line Items |
| `F2` | Open Cheque Leaf Selector Modal |
| `F3` | Add New Detail Line Item Row |
| `F4` | Toggle Voucher Type (RV $\rightarrow$ PV $\rightarrow$ CV $\rightarrow$ JV) |
| `F7` | Open Interactive Voucher Live Preview Overlay |
| `F8` | Print / Export Tax-Compliant PDF Document |
| `Ctrl + S` / `F12` | Save / Submit Voucher for Approval |
| `Esc` | Close Overlay Modal / Cancel Form |

---

## 🔒 Audit & Immutability Rules
1. **Immutable Posted Vouchers**: Once a voucher transitions to status `POSTED`, it is locked against direct edits. Corrections must be performed by posting a **Reversing Voucher**.
2. **Period Lock Enforcement**: Closed financial months/years block new voucher entries dated within the locked period.
