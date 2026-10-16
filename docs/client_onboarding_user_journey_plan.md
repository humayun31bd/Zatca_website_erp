# Automated Client Onboarding & VPS Provisioning Journey

This document defines the complete end-to-end user journey for **Client Registration**, **Package Selection**, **Payment Processing**, **Email Confirmation**, and **Automated VPS Instance Activation**.

---

## 1. End-to-End User Journey Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as Client / User
    participant Frontend as Registration Portal (/register)
    participant Backend as Next.js API (/api/v1/onboarding)
    participant Payment as Payment Gateway (Tap / Stripe / Mada)
    participant SMTP as Email Service (SMTP)
    participant VPS as VPS Nginx Provisioner (165.73.244.224)

    User->>Frontend: 1. Fills Registration Form (Company, Email, Password)
    User->>Frontend: 2. Selects Package (Basic/Standard/Premium & Billing Cycle)
    Frontend->>Backend: 3. Submits Registration & Plan Selection
    Backend-->>Frontend: 4. Returns Payment Gateway Checkout URL
    User->>Payment: 5. Completes Payment
    Payment->>Backend: 6. Webhook / Callback Triggered (Payment Paid)
    Backend->>SMTP: 7. Sends Email #1 (Confirm Email + Payment Receipt)
    User->>Backend: 8. Clicks 'Confirm Email' Link in Email #1
    Backend->>VPS: 9. Triggers Automated Subdomain & Nginx Setup
    VPS-->>Backend: 10. Provisioning Complete (Status: Active)
    Backend->>SMTP: 11. Sends Email #2 (Credentials + Dedicated Client URL)
    User->>User: 12. Logs into dedicated ERP URL (company.intelligentdive.com)
```

---

## 2. Information Required at Registration

| Field | Input Type | Description |
| :--- | :--- | :--- |
| **Company Name** | Text | Used for tenant setup and subdomain slug generation |
| **User Email** | Email | Primary admin email for receipts & activation |
| **Password** | Password | Client password for accessing their ERP instance |
| **Package Plan** | Dropdown | `Basic` (SAR 1800/yr), `Standard` (SAR 6000/yr), `Premium` |
| **Billing Cycle** | Radio | `Annual`, `6 Months`, `Monthly` |
| **Subdomain Slug** | Auto-generated | e.g., `company-name.intelligentdive.com` |

---

## 3. Email Templates Workflow

### Email #1: Email Confirmation & Payment Receipt
- **Subject**: `[Action Required] Confirm your email to activate Intelligent ERP`
- **Body Content**:
  - Payment Receipt details (Plan, Amount Paid, Transaction ID).
  - Prominent Button: **[Confirm Email & Activate My Instance]**.
  - Expiry: Link valid for 24 hours.

### Email #2: Welcome Credentials & Dedicated ERP URL
- **Subject**: `🎉 Your Intelligent ERP Instance is Live!`
- **Body Content**:
  - Dedicated Client Portal URL: `https://company-name.intelligentdive.com`
  - Admin Username: `client-email@domain.com`
  - Temporary Password / Direct Access Link
  - Quick Start Guide link

---

## 4. Implementation Steps Roadmap

### Step 1: Database Schema (`onboarding_subscriptions`)
Add table to track registration progress, payment confirmation tokens, email verification tokens, and VPS setup status.

### Step 2: Onboarding API Routes
- `POST /api/v1/onboarding/register`: Initiates registration & returns payment gateway link.
- `POST /api/v1/onboarding/payment-callback`: Handles payment confirmation & sends Email #1.
- `GET /api/v1/onboarding/verify-email`: Validates email token, calls `add-site-cli` on VPS, and sends Email #2.

### Step 3: Registration Portal UI (`/register`)
Multi-step onboarding wizard:
1. **Step 1**: Account Info (Company, Email, Password).
2. **Step 2**: Plan Selection (Basic, Standard, Premium).
3. **Step 3**: Payment Checkout Screen.
4. **Step 4**: "Check Your Email" Confirmation Notice.
