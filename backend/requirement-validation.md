# Requirement Validation & Traceability Matrix

This document maps the completed development phases against the core requirements defined in the **Product Requirements Document (PRD)** and the **Prompt Sequence Architecture**. Currently, the system is operating in **Mock-First Architecture** mode.

## 1. Module A: ZATCA Phase 2 Cryptographic Engine
| PRD Requirement | Implementation Status | Phase / Location | Notes |
| :--- | :--- | :--- | :--- |
| **UBL 2.1 XML Builder** | 🟡 Partial (Mocked) | Phase 2 / `MockZatcaService` | Currently returning mock UBL string. Real XML builder pending. |
| **Hash & Chaining Engine** | 🟡 Partial (Mocked) | Phase 2 / `MockZatcaService` | Returns mock SHA-256 strings. True crypto canonicalization pending. |
| **ECDSA Signer & Stamp** | 🟡 Partial (Mocked) | Phase 2 / `MockZatcaService` | Simulated signing. Real `secp256k1` signing pending. |
| **Base64 TLV QR Engine** | 🟡 Partial (Mocked) | Phase 2 / `MockZatcaService` | Generates dummy Base64 QR code. |
| **Dual Routing Engine** | 🟢 Implemented | Phase 3 / `invoices/zatca-whatsapp` | API correctly routes B2B to Clearance and B2C to Reporting. |

## 2. Module B: Meta WhatsApp Cloud API Engine
| PRD Requirement | Implementation Status | Phase / Location | Notes |
| :--- | :--- | :--- | :--- |
| **Template Synchronization** | 🟡 Partial (Mocked) | Phase 2 / `MockWhatsAppService` | Logs simulated payload to console. |
| **Dynamic Payload Injection** | 🟢 Implemented | Phase 3 / `invoices/zatca-whatsapp` | API injects invoice ID, client name, and mock PDF links. |
| **Interactive Pay Buttons** | 🟡 Partial (Mocked) | Phase 2 / `MockWhatsAppService` | Mock simulated template includes buttons. |
| **Delivery Webhooks** | 🟢 Implemented | Phase 3 / `webhooks/whatsapp` | Webhook endpoints exist to handle Meta and Payment updates. |

## 3. Module C: White-Label Agency Management Portal
| PRD Requirement | Implementation Status | Phase / Location | Notes |
| :--- | :--- | :--- | :--- |
| **Reporting & Analytics** | 🟢 Implemented | Phase 4 / `(dashboard)/page.tsx` | UI includes Stats Cards and Activity Trends Chart. |
| **Live Transaction Logs** | 🟢 Implemented | Phase 4 / `(dashboard)/page.tsx` | Dashboard UI table with dynamic ZATCA & WA status badges. |
| **API Key Management** | 🟢 Implemented | Phase 4 / `keys/page.tsx` | UI built to manage, view, and generate API keys. |
| **Dark/Light Mode Theme** | 🟢 Implemented | Phase 4 / `layout.tsx` | Integrated `next-themes` with Tailwind CSS dark mode. |

---

# 🤖 AI Technical Review & Identified Gaps

Based on the architectural review of `prd.md`, `prompt.md`, and `solutions.md`, the following critical points need to be addressed before transitioning to Production/Live APIs.

### 1. Missing Flows
- **Dead Letter Queue (DLQ) Recovery Flow:** The PRD mentions a failover mechanism for ZATCA downtime, but the system currently lacks a UI or API endpoint to manually re-trigger or batch-process failed clearance attempts.
- **Onboarding Flow for Agency Sub-tenants:** While we have an API Key generator, the actual workflow for an Agency to register a new Merchant, capture their VAT number, and link their WhatsApp business number is missing from the dashboard.

### 2. Edge Cases
- **B2C Reporting within 24 Hours:** B2C invoices can be grouped and reported asynchronously within 24 hours. The current flow assumes instant processing; we lack a batching mechanism for bulk B2C reporting to avoid rate-limiting by ZATCA.
- **Negative Invoice Totals:** Credit notes and refunds require specific ZATCA invoice types (e.g., `381` for Credit Notes). The current flow primarily assumes standard invoices (`388`).

### 3. Error Handling & Exceptions
- **ZATCA Rejection Handling:** If ZATCA rejects an invoice due to validation errors (e.g., invalid VAT format or timestamp mismatch), the system must cleanly rollback the invoice sequence or flag it, rather than blindly failing the WhatsApp delivery.
- **WhatsApp Template Rejection:** If Meta rejects the dynamic template due to policy violations or invalid phone numbers, this needs to be logged distinctly from ZATCA errors.

### 4. Security & Permissions
- **Tenant Isolation (Multi-Tenancy):** The API currently uses a single hardcoded API key (`MOCK_API_KEY`). A robust Row-Level Security (RLS) implementation in PostgreSQL is required to ensure one agency cannot query another agency's invoice logs.
- **Key Vaulting:** Private keys for ECDSA signing and Production CSIDs must be securely vaulted (e.g., AWS KMS or HashiCorp Vault), not stored in plaintext in the database or environment variables.

### 5. Validation
- **UBL 2.1 Schema Validation:** Before hashing and sending to ZATCA, the API should validate the generated XML against the official ZATCA XSD schemas locally. This saves network latency and prevents unexpected ZATCA portal bans for sending badly formatted requests.
- **Zod Strict Validation:** The current Zod schemas for invoices need deeper validation rules (e.g., ensuring VAT numbers are exactly 15 digits and start/end with '3', as per Saudi regulations).

### 6. Notifications
- **System Health Alerts:** Super Admins need to be notified via Email/Slack if the ZATCA portal is down or if WhatsApp delivery rates drop below the 99.5% KPI SLA.
- **Client Payment Webhook Delays:** If a payment gateway (Moyasar/PayTabs) webhook fails to arrive, the system needs a fallback polling mechanism to verify payment status and send the receipt.
