# Sidebar Menu Design Analysis

This document outlines the proposed sidebar navigation structure for the ERP application, incorporating the existing Sales/POS modules, Accounting, Inventory, and the newly integrated Human Resource Management (HRM) module.

## Core Design Principles
1. **Role-Based Visibility:** Menu items should dynamically render based on the user's role (e.g., Cashier vs. HR Manager vs. Tenant Admin).
2. **Expandable Categories:** Group related modules into collapsible sections to keep the sidebar clean.
3. **Quick Actions:** Prioritize the most used features at the top (Dashboard, POS, New Sale).
4. **Icons:** Use clear, intuitive Material Icons for each parent category.

---

## Proposed Navigation Structure

### 📊 Main
- **Dashboard** (`home` icon)
  - Overview / Analytics

### 🛒 Sales & POS
- **Point of Sale** (`point_of_sale` icon)
  - Open Register
  - Current Session
- **Invoices** (`receipt` icon)
  - Create Invoice
  - Manage Invoices
  - Credit/Debit Notes
- **Clients/Customers** (`people` icon)
  - Directory
  - Customer Balances

### 📦 Inventory & Purchasing
- **Products & Stock** (`inventory` icon)
  - Product List
  - Categories & Units
  - Stock Adjustments
- **Purchases** (`shopping_cart` icon)
  - Purchase Orders
  - Purchase Invoices
- **Suppliers** (`local_shipping` icon)
  - Directory

### 💰 Accounting
- **Financials** (`account_balance` icon)
  - Chart of Accounts
  - Journal Entries
  - Cash & Bank Accounts
- **Reports** (`bar_chart` icon)
  - Trial Balance
  - Profit & Loss
  - Balance Sheet
  - VAT/Tax Report
  - Detailed Ledger

### 👥 Human Resources (HRM)
- **Employee Management** (`badge` icon)
  - Employee Directory
  - Add Employee
- **Attendance & Leave** (`event_available` icon)
  - Daily Attendance
  - Leave Requests
  - Overtime Logs
- **Payroll** (`payments` icon)
  - Generate Payroll
  - Salary Slips
  - Advances & Loans
  - End of Service (EOSB)

### ⚙️ Administration
- **Settings** (`settings` icon)
  - Company/Tenant Profile
  - Branch Management
  - User Roles & Access
  - ZATCA Configuration
  - Integrations (WhatsApp, Stripe)

---

## UI/UX Recommendations
* **Default State:** For a tenant admin, all parent categories are visible but collapsed except for "Main".
* **Active State:** The current active route should be highlighted with the primary brand color (e.g., light blue/indigo background tint with a bolder font).
* **Responsive Behavior:** On tablet/mobile, the sidebar should collapse into a hamburger menu or show only icons to maximize screen real estate.
* **Notification Badges:** Show small numerical badges next to items requiring attention (e.g., `Leave Requests (3)` or `Pending Invoices (5)`).

Dark 256 px collapsible left sidebar
+ Light content area
+ Role-based menu
+ Expandable modules
+ Global search
+ Breadcrumbs
+ Clear active blue state
+ Product and driver assignment inside Delivery
+ Mobile drawer with five priority actions


## second phase - analysis

For an ERP, use **permission-based hiding by default** and **context-based disabling when the feature is available to the role but temporarily unavailable**. Do not rely on hiding or disabling as security—the backend must enforce every permission.

## Recommended rule

| Situation | Recommended UI | Example |
|---|---|---|
| User can never access the feature | Hide it | A delivery driver should not see Payroll |
| User has permission, but prerequisites are missing | Disable it with explanation | “Assign Driver” disabled until an order is selected |
| User has view permission but not edit permission | Show page, hide or disable edit actions | User can view invoices but cannot edit them |
| Feature exists in the organization but is not included in the plan | Disable with upgrade/contact message | “Advanced Analytics — Contact administrator” |
| Action is temporarily processing | Disable temporarily | “Submit” disabled while saving |
| Action is dangerous or restricted | Hide for unauthorized users; show confirmation for authorized users | Delete customer, approve payment |

This follows the common UX distinction: disable something when the user may eventually use it, but hide it when it is irrelevant or permanently inaccessible because of permissions. [smashingmagazine](https://www.smashingmagazine.com/2024/05/hidden-vs-disabled-ux/)

## Best ERP approach

### 1. Hide unauthorized modules

If the user has no permission for an entire module, remove it from the sidebar.

Example for a delivery driver:

```text
Dashboard
My Deliveries
Route
Delivery History
Help
```

Do not show:

```text
Finance
Purchasing
Payroll
User Management
System Settings
```

This keeps the menu clean and prevents users from repeatedly opening pages they can never use.

### 2. Show limited-access pages carefully

If the user has some access to a module, show the module but display only permitted actions.

Example:

```text
Inventory
├── Stock overview        Visible
├── Products              Visible
├── Stock adjustment      Hidden or disabled
└── Warehouse settings    Hidden
```

For a user with read-only access:

```text
[View product]  [Edit product disabled]
```

Add a short explanation:

> You have view-only access. Contact your administrator to edit products.

Do not use only a gray color to explain the restriction. Disabled controls often confuse users when the reason is not clear. [nngroup](https://www.nngroup.com/videos/why-disabled-buttons-hurt-ux-and-how-to-fix-them/)

## Product assignment example

For your delivery ERP, the **Product Assignment** page could work like this:

### No order selected

```text
[Assign selected]  Disabled
```

Tooltip:

> Select at least one order to assign.

### Orders selected, but no driver permission

```text
[Assign selected]  Hidden
```

The dispatcher can see delivery orders but cannot assign drivers.

### Orders selected, with permission

```text
[Assign selected]  Enabled
```

### Order already delivered

```text
[Change driver]  Disabled
```

Reason:

> Delivered orders cannot be reassigned.

### Order failed or returned

```text
[Reassign delivery]  Enabled
```

The action is available because the order can legitimately return to the delivery workflow.

## Sidebar design

Use a permission-aware sidebar:

```text
Dashboard

Sales                         ›
Purchasing                    ›
Inventory                     ›
Delivery                      ›
  Overview
  Product assignment
  Driver assignment
  Routes
  Returns

Reports                       ›
Settings                      ›
```

The backend should return the user’s permissions, and the frontend should build the menu from those permissions.

A permission object might look like:

```json
{
  "delivery": {
    "view": true,
    "assign_products": true,
    "assign_drivers": false,
    "edit_routes": true
  },
  "finance": {
    "view": false
  }
}
```

The interface can then show:

```text
Delivery
├── Overview
├── Product assignment
└── Routes
```

It should not show “Driver assignment” when `assign_drivers` is false.

## Avoid permission leakage

Hiding a menu item improves usability, but it is not a security control. A user may still directly visit a URL or call an API. Every request must be checked on the server.

Example:

```text
GET /api/delivery/orders/1025
```

The server should verify:

```text
User has delivery.view = true
```

For an assignment action:

```text
POST /api/delivery/orders/1025/assign-driver
```

The server should verify:

```text
User has delivery.assign_drivers = true
```

If not, return:

```text
403 Forbidden
```

Never depend only on:

```javascript
if (canAssignDriver) {
  showAssignButton();
}
```

That controls visibility, not actual access.

## Hide versus disable decision tree

Use this simple decision:

1. **Can this role ever use the feature?**
   - No: hide it.
   - Yes: continue.

2. **Is it unavailable because of the current page or data state?**
   - Yes: show it disabled with a reason.
   - No: continue.

3. **Would knowing about the feature help the user understand the system?**
   - Yes: show it disabled or read-only.
   - No: hide it.

4. **Could displaying it reveal sensitive information?**
   - Yes: hide it.
   - No: either option may be appropriate.

## Important accessibility rules

- Do not communicate disabled status only through color.
- Use clear text or a tooltip explaining the reason.
- Maintain sufficient contrast for enabled controls; Material Design recommends at least a 3:1 contrast ratio for enabled button elements. [m3.material](https://m3.material.io/components/buttons/accessibility)
- Use proper semantic states such as `aria-disabled="true"` when appropriate.
- A truly disabled button is often not keyboard-focusable, so consider an explanatory text message or a soft-disabled pattern when users need to discover the action. [material-web](https://material-web.dev/components/button/)
- Do not make disabled controls appear identical to normal text.
- Avoid tooltips as the only explanation on mobile; use visible helper text or an information message.

## Final recommendation

Use this policy for your ERP:

```text
No permission at all       → Hide
Read permission only       → Show page, hide edit/delete actions
Permission but wrong state → Disable with explanation
Temporary processing       → Disable temporarily
Dangerous authorized action→ Show confirmation dialog
Every action               → Enforce permission on the backend
```

This gives users a clean sidebar while still helping them understand why a permitted action is temporarily unavailable.

For an ERP desktop application, use a **64 px collapsed sidebar** as the default. It gives enough room for 20–24 px icons, a visible active state, and comfortable click targets without taking too much workspace. Common collapsed sidebar guidance places the range around 48–64 px, while Material-style navigation rails may use approximately 80–96 px when they include labels or larger spacing. [codetrait](https://codetrait.com/best-ux-practices-for-designing-a-sidebar-9174ee0ecaa2/)

## Recommended widths

| Mode | Width | Best use |
|---|---:|---|
| Expanded sidebar | 240–280 px | Full menu labels and submenus |
| Standard collapsed sidebar | 64 px | Best default for ERP desktop |
| Compact collapsed sidebar | 56 px | Smaller screens or dense admin tools |
| Navigation rail | 80–96 px | Icon plus label or larger touch targets |
| Mobile drawer | 280–320 px | Temporary slide-over navigation |

My recommendation:

```text
Expanded: 256 px
Collapsed: 64 px
Mobile drawer: 304 px
```

Use fixed widths rather than allowing the collapsed state to shrink unpredictably. Consistent dimensions make icons, active backgrounds, and tooltips easier to align.

## 64 px collapsed layout

```text
┌────────┐
│   ☰    │  64 px
├────────┤
│   ▣    │  48 px item
│   ▤    │
│   ▥    │
│   🚚   │
│   $    │
│        │
│   ⚙    │
└────────┘
```

Recommended internal spacing:

- Icon size: 20–22 px.
- Navigation item height: 44–48 px.
- Horizontal icon alignment: centered.
- Vertical gap between items: 4–8 px.
- Sidebar padding: 8–12 px.
- Active-state radius: 8 px.
- Collapse button: 40–44 px target.

Do not make the click target only the size of the icon. The entire 44–48 px navigation item should be clickable.

## Tooltip behavior

In collapsed mode, tooltips should reveal the menu label:

```text
🚚  →  Delivery
▦   →  Inventory
$   →  Finance
⚙   →  Settings
```

Tooltips should be short, specific, and action-oriented. Material Design describes tooltips as brief contextual labels, not places for long instructions. [m3.material](https://m3.material.io/components/tooltips)

### Recommended timing

| Event | Behavior |
|---|---|
| Pointer enters icon | Start delay |
| After 400–600 ms | Show tooltip |
| Pointer leaves | Hide after a short delay |
| Keyboard focus | Show tooltip immediately or after a very short delay |
| Escape | Dismiss tooltip |
| Route changes | Hide tooltip |

A delay prevents tooltips from appearing every time the pointer passes through the sidebar. Do not add a delay for keyboard focus because keyboard users need immediate feedback.

## Tooltip placement

For a left sidebar:

```text
[icon]  ───►  Delivery
```

Place the tooltip to the **right** of the collapsed sidebar.

Recommended style:

```text
Background: #111827
Text:       #FFFFFF
Font:       13–14 px
Padding:    8 px 10 px
Radius:     6 px
Shadow:     subtle
Arrow:      optional
```

Do not make tooltips so wide that they cover the main page. For long labels, use a maximum width and wrap to two lines.

Example:

```text
Product assignment
Delivery
```

The module path can help distinguish duplicate names, but keep it compact.

## Keyboard accessibility

Every collapsed navigation item must be keyboard accessible.

Expected behavior:

```text
Tab       Focus next navigation item
Enter     Open selected item
Space     Activate selected item
Esc       Dismiss tooltip
```

When an icon receives keyboard focus, display its text label. The tooltip should remain while focus stays on the trigger. W3C guidance recommends that tooltip content be available on focus, dismissible, and persistent while the user needs it. [w3](https://www.w3.org/WAI/WCAG21/Understanding/content-on-hover-or-focus.html)

Use an accessible label:

```html
<button
  aria-label="Delivery"
  aria-describedby="tooltip-delivery">
  <svg aria-hidden="true"></svg>
</button>

<div id="tooltip-delivery" role="tooltip">
  Delivery
</div>
```

Do not rely on the icon alone to communicate meaning.

## Tooltip accessibility rules

Follow the three practical rules:

1. **Dismissible**  
   Users can close the tooltip with `Escape`.

2. **Hoverable**  
   If the tooltip contains more than a simple label, the pointer can move onto it without it disappearing.

3. **Persistent**  
   It remains visible while the pointer or keyboard focus remains on the trigger. [w3](https://www.w3.org/WAI/WCAG21/Understanding/content-on-hover-or-focus.html)

For simple one-word navigation labels, a standard non-interactive tooltip is sufficient. For a tooltip containing buttons, submenu links, or detailed instructions, use a popover or menu instead.

## Active and hover states

A collapsed sidebar must make the current page obvious even without labels.

Use:

```text
Inactive icon:  #9CA3AF
Hover:          #1F2937
Active:         #2563EB
Active icon:    #FFFFFF
Focus outline: #93C5FD
```

Example:

```text
┌────────┐
│   🚚   │  active blue background
└────────┘
```

You may also add a 3–4 px active indicator on the left edge, but avoid using only a thin color line. The background, icon color, and tooltip should work together.

## Expanded and collapsed transition

Use a smooth transition, but do not animate the icons separately in a way that makes them jump.

```text
Expanded: 256 px
Collapsed: 64 px
Transition: 200–280 ms
```

During collapse:

- Keep icons in the same vertical positions.
- Fade labels out before reducing the width.
- Center icons after labels disappear.
- Keep the active item visible throughout.
- Do not move the page content abruptly.

A practical sequence is:

```text
1. Fade menu labels.
2. Reduce sidebar width.
3. Recenter icons.
4. Enable collapsed tooltips.
```

## ERP-specific behavior

For your ERP, the collapsed sidebar should still show important status information:

```text
🚚  Delivery       badge: 12
▦   Inventory      badge: 5
🔔  Notifications  badge: 3
```

Use badges only for actionable counts:

- Pending deliveries.
- Low-stock items.
- Failed deliveries.
- Unread notifications.

Avoid badges such as “All orders: 5,240,” because large numbers create noise.

For expandable modules, do not open a full submenu as a floating tooltip on ordinary hover. Instead:

- Click the icon to navigate to the module.
- Click again or use an adjacent control to open the submenu.
- Or temporarily expand the whole sidebar.

Example:

```text
Click Delivery → open Delivery dashboard
Click chevron in expanded mode → show submenu
```

This prevents accidental navigation and keeps the collapsed state predictable.

## Recommended final specification

```text
Sidebar expanded: 256 px
Sidebar collapsed: 64 px
Icon size: 20–22 px
Item height: 48 px
Item radius: 8 px
Tooltip delay on hover: 500 ms
Tooltip on focus: immediate
Tooltip dismissal: pointer leave, blur, or Escape
Tooltip position: right side
Tooltip text: one clear label
Keyboard support: Tab, Enter, Space, Escape
Mobile behavior: 304 px slide-over drawer
```

The strongest design for your ERP is therefore a **256/64 px responsive sidebar**: expanded for learning and navigation, collapsed for workspace efficiency, with tooltips that appear on hover and keyboard focus and follow accessible dismissible, hoverable, and persistent behavior.

