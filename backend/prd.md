# Product Requirements Document (PRD)

**Project Name:** ZATCA Phase 2 & WhatsApp Middleware API Engine

**Document Version:** 1.0

**Target Release:** Q1 2027

**Author / Lead:** Core Architecture & Product Team

**Status:** Approved for Engineering

---

## 1. Executive Summary & Objective

### 1.1 Overview

The **ZATCA-WhatsApp Middleware Engine** is a white-label Micro-SaaS and REST API platform designed for software agencies, POS vendors, and ERP providers in Saudi Arabia. The engine abstracts the complex cryptography, UBL 2.1 XML formatting, and mTLS security required for ZATCA Phase 2 e-invoicing compliance into a single JSON API call, while automatically delivering cleared invoices to end-customers via Meta's Official WhatsApp Cloud API.

### 1.2 Core Success Metrics (KPIs)

* **API Response Time:** $< 300 \text{ ms}$ processing latency for clearance, hashing, and queueing.
* **Compliance Accuracy:** $100\%$ pass rate on ZATCA Fatoora Portal validation checks.
* **Agency Integration Time:** $< 15 \text{ minutes}$ developer onboarding time from sandbox to live deployment.
* **Delivery Rate:** $\ge 99.5\%$ success rate on WhatsApp invoice message delivery.

---

## 2. Target Audience & System Roles

| User Role | Target Persona | Key Responsibilities & Features |
| --- | --- | --- |
| **Agency / Reseller (Client)** | Local Software Agencies, POS Vendors, Web Developers | Manage sub-tenants, create API keys, configure white-label branding, monitor client invoice volume. |
| **Developer / System Integrator** | In-house Devs integrating custom ERPs/Web Apps | Access API docs, manage sandbox keys, trigger combined ZATCA + WhatsApp endpoints via JSON payloads. |
| **End-Client (Merchant)** | Restaurants, Clinics, HVAC, Retailers | View delivered WhatsApp invoices, check payment links, download PDF/A-3 files. |
| **Super Admin** | Platform Infrastructure & Operations Team | Manage CSID certificate rotation, monitor API system health, handle billing and platform infrastructure. |

---

## 3. System Architecture & Tech Stack

```
[ Developer / ERP Systems ] ──(JSON API Payload)──► [ API Gateway / Rate Limiter ]
                                                           │
                                                           ▼
                                                [ NestJS Middleware ]
                                                           │
        ┌──────────────────────────────────────────────────┼──────────────────────────────────────────────────┐
        ▼                                                  ▼                                                  ▼
[ ZATCA Engine Module ]                         [ Queue Manager (Redis/BullMQ) ]               [ Multi-Tenant Database ]
• UBL 2.1 XML Generator                         • Background Workers                           • PostgreSQL (Prisma)
• SHA-256 Hasher & Chain Engine                 • Retries & Failover Logs                      • Encrypted Key Vault
• ECDSA (secp256k1) Signer                                 │
        │                                                  ▼
        │ mTLS                                  [ Meta WhatsApp Cloud API ]
        ▼                                       • Interactive Bilingual Templates
[ ZATCA Fatoora Portal ]                        • Dynamic PDF Link & Pay Buttons
                                                • Third-Party Payment Gateway Webhooks

```

### Technical Stack Justification

* **Backend Framework:** NestJS (TypeScript) for modular backend separation (Auth, Cryptography, Queue, WhatsApp).
* **Database & Cache:** PostgreSQL for tenant relational data; Redis with BullMQ for high-throughput asynchronous job queues.
* **Cloud Infrastructure:** AWS Riyadh (`me-central-1`) to comply with Saudi Cloud Computing Regulatory Framework (CCRF) data residency laws.
* **Cryptography Engine:** Node.js native `crypto` / OpenSSL wrappers for ECDSA secp256k1 signing, canonicalization, and SHA-256 invoice hashing.

---

## 4. Functional Requirements & Feature Specs

### 4.1 Module A: ZATCA Phase 2 Cryptographic Engine

* **UBL 2.1 XML Builder:** Automatically transforms incoming JSON payload into ZATCA-compliant UBL 2.1 XML format.
* **Hash & Chaining Engine:** Computes SHA-256 hash of canonicalized XML and chains it with the previous invoice hash string.
* **ECDSA Signer & Stamp Generator:** Signs the invoice using the vendor's private key and attaches the production Cryptographic Stamp Identifier (CSID).
* **Base64 TLV QR Code Engine:** Encodes Seller Name, VAT Number, Timestamp, Total Amount, VAT Amount, Invoice Hash, and ECDSA Signature into a Base64 TLV string.
* **Dual Routing Engine:**
* *B2B Standard Invoices:* Real-time synchronous mTLS call to ZATCA Clearance API (`/e-invoicing/developer-portal/invoices/clearance`).
* *B2C Simplified Invoices:* Asynchronous queueing for ZATCA Reporting API (`/e-invoicing/developer-portal/invoices/reporting`) within the 24-hour window.
* **Failover & Retry Mechanism:** Implements a Dead Letter Queue (DLQ) for failed ZATCA clearance attempts (e.g., when ZATCA portal is down). Automatically retries B2B clearance with exponential backoff and queues failed invoices for manual review.



### 4.2 Module B: Meta WhatsApp Cloud API Engine

* **Template Synchronization:** Manages pre-approved Meta Bilingual (Arabic/English) interactive message templates as preferred by ZATCA.
* **Dynamic Payload Injection:** Injects ZATCA Base64 QR preview, invoice totals, client business name, and PDF URL into template parameters.
* **Interactive Pay Buttons & Payment Gateway:** Embedded Click-to-Pay URL buttons linking to integrated Saudi payment gateways (e.g., Moyasar, PayTabs). The system will listen to payment gateway webhooks to automatically mark invoices as "PAID" and send a follow-up WhatsApp receipt.
* **Delivery Webhooks:** Listens to Meta webhooks (`SENT`, `DELIVERED`, `READ`, `FAILED`) and updates transaction logs in real time.

### 4.3 Module C: White-Label Agency Management Portal

* **Custom Domain Mapping:** Allows agencies to route API calls through custom subdomains (e.g., `zatca-api.agencyname.sa`).
* **Branded Webhooks & Templates:** Customizes WhatsApp headers, footers, and PDF themes with the agency's or end-client's branding.
* **Tenant API Key Management:** Enables creation, revocation, and rate-limiting of client API keys.
* **Reporting & Analytics Dashboard:** Visual charts and metrics for agencies to monitor API usage, successful/failed invoice clearances, WhatsApp delivery rates, and billing usage per sub-tenant.

### 4.4 Module D: CSID Onboarding Automation

* **Automated CSID Pipeline:**
* Endpoint to trigger OTP-based Compliance CSID acquisition (`POST /api/v1/csid/compliance`).
* Automated execution of ZATCA compliance checks (sends test standard/simplified invoices).
* Auto-fetching and vaulting of Production CSID keys (`POST /api/v1/csid/production`).

### 4.5 Module E: Billing & Monetization
* **Subscription & Usage-Based Billing:** Integrated with Stripe/Paddle to bill agencies based on a Monthly SaaS Subscription (Tier-based) and Pay-per-Invoice usage.
* **Prepaid Credits System:** Allows agencies to purchase wallet credits to fund WhatsApp conversation charges and ZATCA API calls.



---

## 5. Non-Functional Requirements (NFRs)

* **Performance & Throughput:** Capable of processing 500+ invoice requests per second per node using Redis queues.
* **Data Residency & Security:** All client invoice payloads and database entries must reside in Saudi Arabian data centers. Private keys must be stored using AES-256 encryption at rest.
* **Data Retention & Archiving:** Conforms to ZATCA's 6-year data archiving regulation. All UBL 2.1 XMLs and PDF/A-3 invoices are securely archived in long-term AWS S3 Standard-IA/Glacier storage and accessible via API.
* **API Availability:** $99.95\%$ uptime target backed by multi-AZ deployment on AWS Riyadh.
* **Compliance Standard:** Zero non-compliance failures during ZATCA Fatoora audit runs.

---

## 6. End-to-End Invoice Processing Data Flow

```
[ ERP / Client System ]
          │
          │ 1. POST /api/v1/invoices/zatca-whatsapp (JSON)
          ▼
[ Middleware API Gateway ]
          │
          │ 2. Validate Payload & Extract API Key
          ▼
[ ZATCA Engine ] ──► Generates UBL 2.1 XML ──► Calculates SHA-256 Hash ──► ECDSA Sign
          │
          ├─────────────────────────────────────────┐
          ▼ (If B2B Standard)                       ▼ (If B2C Simplified)
[ ZATCA Clearance API ]                   [ Local Storage & Queue ]
          │                                         │
          │ 3. Returns Cleared XML                  │ 3. Queue for 24h Batch Reporting
          ▼                                         ▼
[ PDF/A-3 & QR Generator ] ◄────────────────────────┘
          │
          │ 4. Render PDF/A-3 & Base64 QR Code
          ▼
[ WhatsApp Worker Service ]
          │
          │ 5. Trigger Meta Cloud API
          ▼
[ Customer WhatsApp Inbox ] (Receives Invoice, QR & Payment Link)

```

---

## 7. Release Roadmap & Sprint Breakdown

```
Phase 1: ZATCA Core Engine & Crypto (Weeks 1–4)
  ├── Canonicalization & UBL 2.1 XML Builder
  ├── SHA-256 Hashing & ECDSA Signing Module
  └── Automated CSID Onboarding Pipeline

Phase 2: ZATCA Clearance & WhatsApp Integration (Weeks 5–8)
  ├── Real-time mTLS Integration with ZATCA Portal
  ├── PDF/A-3 Generator with embedded XML & TLV QR Code
  └── Meta WhatsApp Cloud API Client & Webhook Handlers

Phase 3: White-Label Dashboard & Agency Multi-Tenancy (Weeks 9–12)
  ├── Agency Sub-tenant & API Key Management Dashboard
  ├── Custom Subdomain Routing & White-Label PDF Templates
  └── AWS Riyadh Cloud Deployment, Security Audit & Launch

```

