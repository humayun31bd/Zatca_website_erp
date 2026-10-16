
## manage purchase policy

## manage inventory setting menu for different business types
    Tenant should be able to select business type at the time of sign up.
    Based on business type, the inventory setting menu should be displayed    

    a. Retail Business
    b. Food & Beverage (F&B) Business
    c. Services Business
    d. Professional/Office-based SMEs Business
    e. Healthcare & Wellness Business
    f. Trade & Light Manufacturing Business
    g. E-commerce/Warehouse-linked Business

## manage purchase flow - user select flow based on business type
    Menu : Manage Inventory group 
        sub Menu: Manage Purchase Flow (a. Complex flow b. Normal flow c. Simple flow) (Tenants select the flow based on their business type)

    a. Complex flow
        1. Take quotation from supplier - Menu: Procurement & Purchase -> Quotation 
            i. Quotation should have details like item name, quantity, price, tax, total amount
        2. Quotation comparative statement generate - Menu: Procurement & Purchase -> Quotation CS 
            i. Compare all quotations and generate comparative statement
            ii. Comparative statement should have details like item name, quantity, price, tax, total amount
            iii. Comparative statement should have status like pending, approved, rejected
        3. Create purchase order base comparative statement - Menu: Procurement & Purchase -> Purchase Order 
            i. Purchase order should have details like item name, quantity, price, tax, total amount, payment terms, delivery schedule, shipping terms
            ii. Purchase order should be sent to supplier for approval            
            iii. Purchase order should have status like pending, approved, rejected
        4. Receive goods - Menu: Procurement & Purchase -> Purchase Order -> Received Goods
            i. Goods should be received
            ii. Goods should be received based on Purchase order
            iii. Goods should be received within the delivery schedule
        5. Manage Inventory Quality Check - Menu: Procurement & Purchase -> Purchase Order -> Received Goods -> Quality Check
            i. Goods should be checked for quality
            i. Accept or reject goods
            ii. Return to supplier
                1. Return partial goods
                2. Return full goods
                3. Exchange goods
        6. Received Bills from supplier - Menu: Procurement & Purchase -> Purchase Order -> Received Goods -> Received Bills
            i. Bill should be received from supplier
            ii. Bill should have details like item name, quantity, price, tax, total amount
            iii. Bill should have status like unpaid or partially paid or fully paid
        7. Make payment to supplier - Menu: Accounts Payable -> Make Payment
            i. payment should be made base on received goods and invoice quantity
            ii. payment should be made within the payment terms
            iii. payment should have status like unpaid or partially paid or fully paid
        8. Manage Inventory Transfer - Menu: Inventory Stock -> Transfer
            i. Inventory should be transferred from warehouse to branch
            ii. Inventory should be transferred from branch to warehouse
            iii. Inventory should be transferred from branch to branch
            iv. Inventory should be transferred from warehouse to warehouse
            v. Inventory should have status like pending, approved, rejected
            vi. Inventory should be approved or rejected by the manager
        9. Manage Inventory Adjustment - Menu: Inventory Stock -> Adjustment
            i. Inventory adjustment should be approved or rejected by the manager

    b.  Normal flow
        1. Create Purchase Invoice
        2. Return to supplier
        3. Make payment to supplier
        4. Manage Inventory Adjustment
    c.  Simple flow
        1. Create Purchase Invoice
        2. Make payment to supplier

## manage inventory stock and report
    Menu - Inventory Stock
    Sub menu - inventory Report 
        - Date Range  
        - as on date
        - warehouse wise / All warehouses / All branches
        - Report details
            - opening stock
            - inword stock
            - outword stock
            - closing stock
            - stock adjustment
            - stock transfer
            - stock in hand 

## implementation flows.

### 1. Business Type Selection & Inventory Menu Mapping Flow
1. **Tenant Onboarding / Sign-Up**:
   - During signup or tenant settings setup, tenant selects their **Business Type**:
     1. Retail Business
     2. Food & Beverage (F&B) Business
     3. Services Business
     4. Professional/Office-based SMEs Business
     5. Healthcare & Wellness Business
     6. Trade & Light Manufacturing Business
     7. E-commerce/Warehouse-linked Business
2. **Default Purchase Flow Mapping**:
   - `Services` & `Office SMEs` -> Default: **Simple Flow**
   - `Retail`, `F&B`, `Healthcare` -> Default: **Normal Flow**
   - `Trade & Light Manufacturing`, `E-commerce/Warehouse` -> Default: **Complex Flow**
3. **Menu Customization**:
   - Menu options under `Procurement & Purchase` and `Inventory Stock` dynamically adjust based on the active flow configured by the tenant in `Manage Inventory -> Manage Purchase Flow`.

---

### 2. Purchase Flow Selection Engine (Manage Purchase Flow)
- **Menu Location**: `Manage Inventory -> Manage Purchase Flow`
- **Flow Options**:
  - **Simple Flow**: Streamlined for quick billing and direct supplier payments.
  - **Normal Flow**: Standard retail flow with returns and inventory stock adjustments.
  - **Complex Flow**: Multi-stage enterprise procurement with quotations, CS, PO, GRN, QC, AP billing, multi-location stock transfers, and manager-approved stock adjustments.

---

### 3. Step-by-Step Execution Workflows

#### A. Complex Purchase Flow (9-Step Enterprise Procurement)

1. **Step 1: Supplier Quotation**
   - **Menu**: `Procurement & Purchase -> Quotation`
   - **Action**: Input quotations received from multiple vendors.
   - **Fields**: Supplier, Item Name, Quantity, Unit Price, Tax/VAT Rate, Total Amount.
   - **Status**: `DRAFT`, `SUBMITTED`.

2. **Step 2: Quotation Comparative Statement (CS)**
   - **Menu**: `Procurement & Purchase -> Quotation CS`
   - **Action**: Select 2 or more submitted quotations for the same items to compare pricing, delivery terms, and tax.
   - **Output**: Auto-generated comparative matrix displaying lowest bid, average pricing, and vendor terms.
   - **Status**: `PENDING`, `APPROVED`, `REJECTED`.

3. **Step 3: Create Purchase Order (PO) from CS**
   - **Menu**: `Procurement & Purchase -> Purchase Order`
   - **Action**: Generate PO directly from an `APPROVED` Comparative Statement or manually.
   - **Fields**: Item details, Quantity, Unit Price, Tax, Total, Payment Terms, Delivery Schedule, Shipping Terms.
   - **Status**: `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `SENT_TO_SUPPLIER`.

4. **Step 4: Receive Goods (GRN - Goods Received Note)**
   - **Menu**: `Procurement & Purchase -> Purchase Order -> Received Goods`
   - **Action**: Receive physical shipment at destination warehouse/branch against an approved PO.
   - **Validation**: Verify received items & quantities against PO delivery schedule and PO balance.

5. **Step 5: Inventory Quality Check (QC)**
   - **Menu**: `Procurement & Purchase -> Purchase Order -> Received Goods -> Quality Check`
   - **Action**: Inspect received items for physical quality and specification compliance.
   - **Outcomes**:
     - **Accept**: Items pass inspection -> Stock incremented.
     - **Reject & Return to Supplier**:
       1. *Partial Return*: Return damaged/defective sub-quantity.
       2. *Full Return*: Reject entire shipment.
       3. *Exchange Goods*: Issue replacement request to vendor.

6. **Step 6: Receive Supplier Bills / Invoices**
   - **Menu**: `Procurement & Purchase -> Purchase Order -> Received Goods -> Received Bills`
   - **Action**: Log vendor invoice against passed QC quantities.
   - **Status**: `UNPAID`, `PARTIALLY_PAID`, `FULLY_PAID`.

7. **Step 7: Accounts Payable Supplier Payment**
   - **Menu**: `Accounts Payable -> Make Payment`
   - **Action**: Issue payment via Cash/Bank against Received Bills within payment terms.
   - **Journal Entry**: Debit Accounts Payable, Credit Cash/Bank (and track Input VAT).

8. **Step 8: Multi-Location Inventory Transfer**
   - **Menu**: `Inventory Stock -> Transfer`
   - **Routes Supported**:
     - Warehouse ↔ Branch
     - Branch ↔ Branch
     - Warehouse ↔ Warehouse
   - **Approval**: Sender submits -> Transfer status `PENDING` -> Receiver/Manager approves/rejects -> Stock shifted across locations.

9. **Step 9: Inventory Adjustment (Manager Approval)**
   - **Menu**: `Inventory Stock -> Adjustment`
   - **Action**: Record physical count differences, breakage, expiry, or audit variances.
   - **Approval**: Requires Manager approval (`PENDING` -> `APPROVED` / `REJECTED`) before updating stock in hand.

---

#### B. Normal Purchase Flow
1. **Create Purchase Invoice**: `Procurement & Purchase -> Purchase Invoice` -> Direct invoice creation & stock update.
2. **Return to Supplier**: Issue Debit Note / Return for damaged stock.
3. **Make Payment to Supplier**: `Accounts Payable -> Make Payment`.
4. **Manage Inventory Adjustment**: `Inventory Stock -> Adjustment` (Requires Manager approval).

---

#### C. Simple Purchase Flow
1. **Create Purchase Invoice**: `Procurement & Purchase -> Purchase Invoice` -> Quick entry.
2. **Make Payment to Supplier**: `Accounts Payable -> Make Payment` -> Direct payment settlement.

---

### 4. Inventory Stock & Report Implementation Flow
- **Menu Location**: `Inventory Stock -> Inventory Report`
- **Filter Criteria**:
  - **Date Range**: `From Date` to `To Date`
  - **As On Date**: Snapshot of inventory balance on a specific target date
  - **Location Filter**: Warehouse-wise / All Warehouses / All Branches / Specific Branch
- **Calculated Ledger Columns**:
  1. **Opening Stock**: Stock balance at the beginning of the selected date range.
  2. **Inward Stock (+)**: Purchases received + Transfers received.
  3. **Outward Stock (-)**: Sales dispatched + Supplier returns + Transfers sent out.
  4. **Stock Adjustments (+/-)**: Net manager-approved inventory adjustments.
  5. **Stock Transfers (+/-)**: Net inward/outward location transfers.
  6. **Closing Stock / Stock in Hand**:
     $$\text{Closing Stock} = \text{Opening Stock} + \text{Inward Stock} - \text{Outward Stock} \pm \text{Adjustments} \pm \text{Transfers}$$

---

### 5. Backend Database Schema Mapping
- `tenants.business_type` (Enum: `RETAIL`, `FB`, `SERVICES`, `SME`, `HEALTHCARE`, `MANUFACTURING`, `ECOMMERCE`)
- `tenant_settings.purchase_flow_type` (Enum: `SIMPLE`, `NORMAL`, `COMPLEX`)
- `supplier_quotations` & `supplier_quotation_items`
- `quotation_comparative_statements` & `cs_items`
- `purchase_orders` & `purchase_order_items`
- `goods_received_notes` & `grn_items`
- `quality_check_records` & `qc_items`
- `supplier_bills`
- `inventory_transfers` & `inventory_transfer_items`
- `inventory_adjustments` & `inventory_adjustment_items`

---

## 6. Implementation Status (All Phases Completed)
- [x] **Phase 1**: DB Schema & Settings Backend/Frontend for Purchase Flow Modes (`SIMPLE`, `NORMAL`, `COMPLEX`).
- [x] **Phase 2**: Dynamic Sidebar Navigation adaptation (`getDynamicSidebarMenuGroups`) based on tenant business type and active flow mode.
- [x] **Phase 3**: Supplier Quotations (RFQs) & Comparative Statement (CS) evaluation matrix with head-to-head vendor scoring and manager approval.
- [x] **Phase 4**: Purchase Orders (PO) workflow with auto-PO generation from approved CS.
- [x] **Phase 5**: Goods Received Notes (GRN) & Quality Check (QC) inspection with Accept / Partial / Reject / Exchange logic.
- [x] **Phase 6**: Received Bills & Accounts Payable (AP) payment settlement.
- [x] **Phase 7**: Multi-location Stock Transfers & Manager Adjustments.
- [x] **Phase 8**: Inventory Stock Valuation & Audit Report engine (`InventoryReportScreen` & `/api/v1/inventory/report`).

