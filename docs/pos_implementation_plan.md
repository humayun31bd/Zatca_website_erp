# POS Screen Feature Enhancement & Implementation Plan

As a senior full-stack developer, this plan outlines the systematic approach to updating our specifications and implementing the missing POS features. It is broken down into manageable phases, complete with actionable prompts that you can feed into your development workflow.

## Phase 1: Specification Refinement & Architecture Update

Before writing code, we need to finalize the feature requirements and update our architectural models to support the new features (hardware, complex workflows, and permissions).

**Step 1.1: Update `posscreenfeatures.md`**
- Add missing definitions for Payment Methods, Hardware Integration, Permissions (Manager Overrides), and ZATCA compliance (Arabic receipt requirements).
- Clarify the Returns/Refunds/Exchanges workflow.
- **Prompt:** *"Update `posscreenfeatures.md` to include detailed sections on Hardware Peripherals (scanners, printers), Manager Override permissions for voids/discounts, explicit Payment Methods (Card, Store Credit), and Z-Report/X-Report specifications."*

**Step 1.2: Database Schema & State Management Adjustments**
- Ensure the database and state management (e.g., Redux/Provider/Bloc) can handle store credit balances, specific transaction types (X/Z reports), and override logs.
- **Prompt:** *"Design the database schema updates and state management models required to support Store Credit transactions, Manager Override audit logs, and detailed shift reporting (Z-Reports)."*

---

## Phase 2: Core POS Logic & Security Enhancements

Implement the underlying business logic that drives the UI, focusing on security, permissions, and accurate calculations.

**Step 2.1: Implement Role-Based Access Control (RBAC) & Overrides**
- Create middleware/logic to intercept restricted actions (voiding items, applying >10% discounts).
- Implement the UI flow for a manager to input a PIN to approve an action.
- **Prompt:** *"Implement the logic and UI modal for Manager Overrides in the POS cart. When a cashier attempts to void an item or apply a high discount, prompt for a Manager PIN. Log the override in the database upon success."*

**Step 2.2: Advanced Tax & Discount Calculations**
- Refactor the cart calculation engine to support both inclusive and exclusive taxes, handling complex item-level vs. cart-level discount precedence.
- **Prompt:** *"Refactor the POS cart calculation service to support ZATCA-compliant inclusive/exclusive tax calculations. Ensure the math correctly handles precedence when both item-level and cart-level discounts are applied."*

---

## Phase 3: Hardware Integration & Workflow Automation

Connect the POS software to the physical world and streamline the return/exchange processes.

**Step 3.1: Hardware Abstraction Layer**
- Implement a service to handle USB/Bluetooth barcode scanners (acting as keyboard inputs) and ESC/POS commands for receipt printers and cash drawers.
- **Prompt:** *"Create a hardware abstraction service in Dart/Flutter that listens for barcode scanner input (keyboard wedge) globally, and implement a printing service that translates invoice data into ESC/POS commands for thermal printers."*

**Step 3.2: Returns and Refunds Workflow**
- Build the UI and logic to fetch a past invoice (via barcode scan or manual entry) and select specific items for return, ensuring the system prevents returning more items than were originally purchased.
- **Prompt:** *"Build the Return/Refund workflow UI. Create a screen to fetch an invoice by ID, display its items, and allow the user to select quantities to return. Add validation to ensure items cannot be over-returned, and update inventory accordingly."*

---

## Phase 4: Reporting & Compliance (ZATCA)

Finalize the operational reporting and ensure legal compliance.

**Step 4.1: Shift Management (X and Z Reports)**
- Implement the logic to calculate expected drawer totals, record actual counted totals, and generate the end-of-shift reports.
- **Prompt:** *"Implement the End of Shift (Z-Report) logic. Calculate total sales categorized by payment method, total refunds, and expected cash. Build the UI for the cashier to input actual counted cash and record the variance."*

**Step 4.2: Receipt Template Localization**
- Ensure the receipt template engine enforces bilingual (Arabic/English) requirements for ZATCA compliance.
- **Prompt:** *"Update the POS receipt rendering engine to support bilingual templates. Ensure all mandatory ZATCA fields (VAT number, timestamp, Arabic item names) are correctly formatted and printed."*

---

## Next Action
To proceed, please reply with:
**"Execute Step 1.1"** to begin updating the specification document, or specify another step you would like to tackle first.



    
