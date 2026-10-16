# POS Database Schema & State Management Design

This document outlines the architectural updates required for the backend database schema and the frontend state management (Flutter) to support the new POS features.

## 1. Database Schema Updates

### A. Shift Management (X & Z Reports)
To properly track shifts, expected cash, and variances, we need a robust shift tracking system.

**Table: `pos_shifts`**
- `id` (UUID, Primary Key)
- `tenant_id` (UUID, Foreign Key)
- `cashier_id` (UUID, Foreign Key)
- `terminal_id` (UUID, Foreign Key)
- `opening_time` (Timestamp)
- `closing_time` (Timestamp, Nullable)
- `opening_cash` (Decimal)
- `actual_cash_counted` (Decimal, Nullable) - Entered by cashier at end of shift
- `expected_cash_calculated` (Decimal, Nullable) - System calculated at end of shift
- `cash_variance` (Decimal, Nullable)
- `total_sales` (Decimal)
- `total_refunds` (Decimal)
- `status` (Enum: `open`, `closed`)

**Table: `pos_shift_payment_breakdown`** *(Optional: For detailed Z-Reports)*
- `shift_id` (UUID, Foreign Key)
- `payment_method` (String: cash, card, store_credit, etc.)
- `total_amount` (Decimal)

### B. Manager Override Audit Logs
Crucial for security, preventing internal theft, and tracking when managers approve restricted actions.

**Table: `manager_override_logs`**
- `id` (UUID, Primary Key)
- `tenant_id` (UUID, Foreign Key)
- `manager_id` (UUID, Foreign Key) - The manager who provided the PIN
- `cashier_id` (UUID, Foreign Key) - The cashier who requested the override
- `action_type` (Enum: `void_item`, `void_cart`, `manual_discount`, `price_change`)
- `action_details` (JSON) - e.g., `{"item_id": 123, "original_price": 50, "new_price": 40}`
- `invoice_id` (UUID, Foreign Key, Nullable)
- `timestamp` (Timestamp)

### C. Store Credit & Loyalty Ledger
A double-entry style ledger to track a customer's store credit accurately over time.

**Table: `customer_store_credit_ledger`**
- `id` (UUID, Primary Key)
- `tenant_id` (UUID, Foreign Key)
- `customer_id` (UUID, Foreign Key)
- `transaction_type` (Enum: `earned`, `redeemed`, `refund_issued`, `manual_adjustment`)
- `amount` (Decimal) - Positive for additions, negative for deductions
- `balance_after` (Decimal) - Snapshot of balance after this transaction
- `invoice_id` (UUID, Foreign Key, Nullable)
- `notes` (String)
- `timestamp` (Timestamp)

---

## 2. Frontend State Management Adjustments (Dart/Flutter)

Assuming the use of `Provider`, `Riverpod`, or `Bloc`, the following structural changes are needed in the POS client.

### A. `ShiftProvider` (New)
Manages the lifecycle of a terminal session.
- **State:** `currentShiftId`, `openingAmount`, `isOpen`, `shiftStartTime`.
- **Actions:** 
  - `openShift(amount)`
  - `closeShift(actualCash)`: Triggers API call, calculates variance, and returns Z-Report data for printing.
  - `fetchMidShiftTotals()`: Pulls current aggregated data for X-Report printing.

### B. `CartProvider` (Updates)
Needs enhancements to support security and new payment workflows.
- **State:** `items`, `cartDiscounts`, `appliedTaxes`.
- **Actions:**
  - `removeItem(item)`: Update to check if item has already been sent to kitchen/saved. If yes, trigger `requestManagerOverride('void_item')`.
  - `applyManualDiscount(percent)`: If `percent > tenant.maxDiscountLimit`, trigger `requestManagerOverride('manual_discount')`.
  - `checkout(paymentsList)`: Updated to support processing a mix of Cash, Card, and Store Credit.

### C. `CustomerProvider` (Updates)
Needs to fetch and hold the real-time store credit balance for the currently selected customer.
- **State:** `selectedCustomer`, `storeCreditBalance`.
- **Actions:**
  - `fetchStoreCredit()`: Called immediately when a customer is attached to the cart.
  - `verifyCreditSufficient(amount)`: Validates before allowing checkout with store credit.
