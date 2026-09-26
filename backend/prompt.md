# ZATCA Phase 2 & WhatsApp Middleware Engine — Master AI Prompt Guide

**Platform:** Bizora ERP
**Company:** Bizora Technologies Limited
**Tagline:** Simplify Business. Grow Smarter.
**PRD Version:** 1.0 | **Architecture Version:** 2.0 | **Target Release:** Q1 2027

---

## 🧠 Persistent Architectural Directives & Project Memory

> [!IMPORTANT]
> **MANDATORY PROJECT STACK DIRECTIVES — ALL AI AGENTS & DEVELOPERS MUST COMPLY:**
>
> ### 1. Framework & Runtime
> - **Primary Framework:** Next.js 14+ with **App Router** and **TypeScript**
> - **Backend Module Pattern:** Service Locator (`src/lib/services/serviceLocator.ts`) — enables seamless Mock ↔ Live switching via `USE_MOCK_API` env flag
> - **Architecture:** Mock-First Development → all external dependencies (ZATCA, WhatsApp, Payment) have corresponding mock implementations before live integration
>
> ### 2. Database & ORM — DRIZZLE ORM (Mandatory)
> - **ORM:** `drizzle-orm` + `drizzle-kit` with **PostgreSQL** dialect
> - **Schema:** `src/lib/db/schema.ts` — single source of truth for all table definitions
> - **DB Client:** `src/lib/db/index.ts` — exports `db = drizzle(client, { schema })`
> - **Config:** `drizzle.config.ts` — dialect: `postgresql`, output: `./drizzle`
> - **Migrations:** `./drizzle/` directory, managed via `drizzle-kit generate` & `drizzle-kit migrate`
> - **Scripts:** `db:generate`, `db:migrate`, `db:studio` in `package.json`
> - **CRITICAL:** Never use Prisma. Never write raw SQL migrations without also updating Drizzle schema.
>
> ### 3. Security & Cryptography
> - **ECDSA Key Signing:** `secp256k1` curve via Node.js native `crypto` / OpenSSL wrappers
> - **Key Storage:** AWS KMS (`me-central-1`) — private keys are NEVER passed directly; signing is delegated to KMS IAM context
> - **API Auth:** `Authorization: Bearer <API_KEY>` — hashed (SHA-256) key lookup in PostgreSQL via `src/lib/auth/keyValidator.ts`
> - **Row-Level Security (RLS):** Enforced via Drizzle middleware — all queries scoped to `tenant_id` from request context
> - **mTLS:** All ZATCA Fatoora Portal calls use mutual TLS. Certificate pinning enforced.
>
> ### 4. Queue & Async Workers
> - **Queue Engine:** **Redis + BullMQ** (`src/lib/queue/`) — three worker types:
>   - `B2C Reporting Worker` — batches simplified invoices within 24-hour ZATCA window
>   - `WhatsApp Delivery Worker` — sends Meta Cloud API templates post-clearance
>   - `DLQ Recovery Worker` — retries failed B2B clearance with exponential backoff
>
> ### 5. UI/UX Design System (Mandatory)
> - **Styling:** Tailwind CSS with custom design tokens
> - **Color Palette:**
>   - Saudi Royal Emerald: `#064E3B` / `#059669`
>   - Desert Gold: `#D4AF37`
>   - Deep Slate Ink: `#0F172A`
> - **Inspiration:** [AmalERP](https://amalerp.com) — high-converting, state-of-the-art enterprise UI
> - **Components:** Radix UI / Shadcn-style accessible primitives with dark/light mode (`NextThemes`)
> - **Motion:** Framer Motion animations, 3D perspective tilt cards (`perspective: 1600px`), glassmorphism (`backdrop-blur-md bg-white/80 dark:bg-slate-900/80`), live SVG sparklines
> - **Bilingual RTL:** First-class English + Arabic (`dir="rtl"`) layout switching
>
> ### 6. Cloud & Deployment
> - **Cloud:** AWS Region `me-central-1` (Riyadh) — mandatory for Saudi CCRF data residency compliance
> - **Compute:** ECS Fargate (containerized Next.js) — zero-downtime rolling deployments
> - **Database:** Amazon RDS for PostgreSQL (Multi-AZ)
> - **Cache/Queue:** Amazon ElastiCache (Redis)
> - **Storage:** Amazon S3 Standard-IA — 6-year ZATCA archival of UBL 2.1 XMLs + PDF/A-3 invoices
> - **Security:** AWS WAF (DDoS), AWS KMS (key vault), mTLS certificates

---

## 📐 System Architecture Overview

```
[ Developer / ERP Systems ] ──(JSON API Payload)──► [ AWS WAF / API Gateway ]
                                                               │
                                                    [ Application Load Balancer ]
                                                               │
                                                    [ Next.js API Engine ]
                                                               │
         ┌─────────────────────────────────────────────────────┼────────────────────────────────────┐
         ▼                                                      ▼                                    ▼
[ ZATCA Crypto Engine ]                           [ Redis BullMQ Manager ]            [ Multi-Tenant PostgreSQL ]
• UBL 2.1 XML Generator                           • B2C Reporting Worker              • Drizzle ORM + RLS
• SHA-256 Hash Chain                              • WhatsApp Delivery Worker           • Tenant / Invoice / Keys
• ECDSA secp256k1 Signer                          • DLQ Recovery Worker               • Audit Logs
• XSD Local Validator                                          │
         │                                                     ▼
         │ mTLS                                     [ Meta WhatsApp Cloud API ]
         ▼                                          • Bilingual Templates (AR/EN)
[ ZATCA Fatoora Portal ]                            • Click-to-Pay (Moyasar/PayTabs)
                                                    • Delivery Webhooks

AWS KMS ←→ Signing Engine (CSID keys never exposed)
AWS S3  ←→ UBL XML + PDF/A-3 Archive (6-year retention)
```

### Module Map (PRD Alignment)
| Module | Description | Phase |
|:--|:--|:--|
| **Module A** | ZATCA Phase 2 Cryptographic Engine | Phase 1–2 |
| **Module B** | Meta WhatsApp Cloud API Engine | Phase 2 |
| **Module C** | White-Label Agency Management Portal | Phase 3 |
| **Module D** | CSID Onboarding Automation | Phase 1 |
| **Module E** | Billing & Monetization (Stripe/Paddle) | Phase 3 |

---

## 🗄️ Canonical Database Schema (Drizzle ORM Reference)

> [!NOTE]
> These are the **authoritative** table definitions. Always sync `src/lib/db/schema.ts` with this document.
> All analyst-reviewed fixes (from `analyst-review-report.md`) are already incorporated here.

### Tables Summary

| # | Table | Engine | Notes |
|:--|:--|:--|:--|
| 1 | `tenants` | PostgreSQL | Agency configs, VAT: `^3[0-9]{13}3$` |
| 2 | `api_keys` | PostgreSQL | SHA-256 hashed keys, rate limits |
| 3 | `csid_certificates` | PostgreSQL | COMPLIANCE / PRODUCTION CSIDs, KMS ref |
| 4 | `invoices` | PostgreSQL | UNIQUE(`tenant_id`, `invoice_number`); credit notes allow negative totals |
| 5 | `invoice_line_items` | PostgreSQL | CASCADE delete with invoice |
| 6 | `whatsapp_messages` | PostgreSQL | One-to-Many with invoices (retry support) |
| 7 | `webhook_events` | PostgreSQL | META / MOYASAR / PAYTABS / ZATCA sources |
| 8 | `billing_credits` | PostgreSQL | SERIALIZABLE isolation; REFUND adds balance |
| 9 | `audit_logs` | PostgreSQL | Immutable — no `updated_at` (intentional) |
| 10 | `task_queue` | Redis | BullMQ job definitions |
| 11 | `rate_limit_counters` | Redis | Sliding window per tenant |

### Critical Schema Constraints (Analyst-Validated — analyst-review-report.md)
```sql
-- invoices: UNIQUE per tenant (ZATCA mandate — analyst fix #7)
UNIQUE(tenant_id, invoice_number)

-- invoices: VAT validation on seller field (analyst fix #8)
CHECK (seller_vat ~ '^3[0-9]{13}3$')

-- invoices: Credit notes (type_code 381) CAN have negative totals (analyst fix #10)
-- Only enforce subtotal >= 0 for type_code 388 (Standard invoices)

-- billing_credits: Race condition mitigation (analyst fix #9)
-- Use SERIALIZABLE isolation + advisory lock in transaction layer

-- billing_credits: REFUND adds to balance (NOT subtracts — analyst fix #13)
SELECT
  SUM(CASE WHEN type IN ('TOPUP','REFUND') THEN amount ELSE -amount END) AS balance
FROM billing_credits WHERE tenant_id = $1

-- audit_logs: Intentionally NO updated_at — immutable audit trail (analyst fix #12)

-- invoices: invoiceHash must be valid 44-char Base64 SHA-256 (analyst fix #14)
-- whatsapp_messages: One-to-Many with invoices (NOT One-to-One — analyst fix #11)
```

---

## 🌊 Data Flow Summary (DFD Reference)

### Context-Level Flows (Level 0)
| Flow | Direction | Data |
|:--|:--|:--|
| 1 | ERP → System | Invoice JSON Payload |
| 2 | System → ERP | Clearance Status + QR Code |
| 3 | Admin → System | Create Tenant / API Key |
| 4 | System → Admin | Analytics & Usage Report |
| 5 | System → ZATCA | UBL 2.1 XML (mTLS) |
| 6 | ZATCA → System | Cleared XML / CSID / Errors |
| 7 | System → Meta | Interactive WA Template |
| 8 | Meta → System | Webhook (SENT/READ/FAILED) |
| 9 | Payment → System | Webhook (PAID) |
| 10 | System → Payment | Pay-link Embedded in WA |
| 11 | System → Billing | Usage & Invoice Count |
| 12 | Billing → System | Subscription Status & Credits |
| 13 | System → KMS | ECDSA Sign Request |
| 14 | KMS → System | Signature & CSID Token |

> [!NOTE]
> **DLQ is NOT an external entity** — it is internal data store D5. Correctly placed in Level 1 DFD only (analyst fix #2).
> **Billing flow is bidirectional** — System sends usage → Billing returns subscription status (analyst fix #3).

---

## 🚩 Phase 1: Foundation & Architecture Setup

### 💬 Prompt 1: Project Initialization & Directory Structure
```text
Role: Senior Next.js Architect
Task: Initialize a Next.js 14+ project with TypeScript, App Router, and Tailwind CSS for a
ZATCA Phase 2 & WhatsApp Middleware Engine (Bizora ERP platform).

Requirements:
1. Initialize with App Router, TypeScript, ESLint, and Tailwind CSS.
2. Create the full directory structure:
   src/
   ├── app/
   │   ├── api/v1/
   │   │   ├── auth/               # API Key generation & validation
   │   │   ├── invoices/           # Unified ZATCA+WA submission
   │   │   │   └── zatca-whatsapp/ # POST endpoint
   │   │   ├── csid/               # CSID onboarding & renewal
   │   │   └── webhooks/
   │   │       └── whatsapp/       # Meta WA + Payment Gateway webhooks
   │   └── (dashboard)/            # White-Label Agency Portal UI
   ├── lib/
   │   ├── services/               # IZatcaService, IWhatsAppService, ICsidService interfaces
   │   │   └── serviceLocator.ts   # Factory: returns Mock or Live services via USE_MOCK_API
   │   ├── mock/                   # MockZatcaService, MockWhatsAppService, MockCsidService
   │   ├── crypto/                 # UBL 2.1 XML builder, XSD validator, SHA-256, ECDSA signer
   │   ├── whatsapp/               # Meta Cloud API client
   │   ├── queue/                  # BullMQ worker definitions (B2C, WA, DLQ)
   │   ├── auth/
   │   │   └── keyValidator.ts     # Bearer API key hash lookup
   │   └── db/
   │       ├── schema.ts           # Drizzle ORM — ALL table definitions
   │       └── index.ts            # db = drizzle(client, { schema })
   ├── types/
   │   ├── invoice.ts              # ZATCA Standard + Simplified interfaces & Zod schemas
   │   ├── zatca.ts                # Clearance, Reporting, CSID response types
   │   └── whatsapp.ts             # WA template, webhook payload types
   └── utils/
       ├── pdf.ts                  # PDF/A-3 generator with embedded UBL XML
       └── qr.ts                   # Base64 TLV encoder (Seller, VAT, Timestamp, Hash, Sig)

3. Create `.env.example`:
   USE_MOCK_API=true
   MOCK_API_KEY=zatca_test_key_123
   DATABASE_URL=postgresql://localhost:5432/bizora_dev
   REDIS_URL=redis://localhost:6379
   AWS_REGION=me-central-1
   AWS_KMS_KEY_ID=<placeholder>
   AWS_S3_BUCKET=bizora-invoices
   META_WHATSAPP_TOKEN=<placeholder>
   META_VERIFY_TOKEN=<placeholder>
   PORT=3000

4. Create `GET /api/v1/health` returning:
   { "status": "ok", "mode": "mock", "version": "1.0.0", "timestamp": "<ISO8601>" }

5. Create `drizzle.config.ts`:
   export default { dialect: 'postgresql', schema: './src/lib/db/schema.ts', out: './drizzle' }

6. Add package.json scripts:
   "db:generate": "drizzle-kit generate"
   "db:migrate": "drizzle-kit migrate"
   "db:studio": "drizzle-kit studio"
   "test:api": "ts-node scripts/test-api.ts"
```

---

### 💬 Prompt 2: Core Domain Types & Service Interfaces
```text
Role: TypeScript Architect
Task: Define all TypeScript interfaces, Zod schemas, and service contracts.

Requirements:
1. src/types/invoice.ts:
   - ZatcaInvoiceType: 'STANDARD' | 'SIMPLIFIED'  (B2B | B2C)
   - InvoiceLineItem: { lineNumber, description, quantity, unitCode, unitPrice, taxPercent, taxAmount, lineTotal }
   - InvoicePayload Zod schema:
     * invoiceType: ZatcaInvoiceType
     * invoiceNumber: string (unique per tenant)
     * issueDate: ISO 8601 string
     * seller: { name, vatNumber: 15-char regex '^3[0-9]{13}3$', address }
     * buyer: { name, vatNumber (optional for B2C), address }
     * lineItems: InvoiceLineItem[]
     * subtotalAmount: number >= 0 (for STANDARD; credit notes exempt)
     * totalVatAmount: number
     * totalAmount: number
     * currencyCode: 'SAR' default
     * previousInvoiceHash: string (for chain integrity)

2. src/types/zatca.ts:
   - ClearanceResponse: { clearanceStatus, clearedXml, qrCodeBase64, validationResults[] }
   - ReportingResponse: { reportingStatus, warnings[] }
   - CsidComplianceResponse: { complianceRequestId, binarySecurityToken, secret }
   - CsidProductionResponse: { issuedAt, expiresAt, csidToken }

3. src/types/whatsapp.ts:
   - WaTemplatePayload: { to (E.164), templateName, language: 'ar'|'en', components[] }
   - WaWebhookEvent: { messageId, status: 'SENT'|'DELIVERED'|'READ'|'FAILED', timestamp }
   - WaDeliveryResult: { messageId: string (wamid.xxx), status: 'QUEUED' }

4. src/lib/services/interfaces.ts — three service contracts:
   - IZatcaService:
     * generateUblXml(invoice: InvoicePayload): Promise<string>
     * calculateHash(xml: string): Promise<string>         // SHA-256
     * generateTlvQr(invoice: InvoicePayload): Promise<string>  // Base64 TLV
     * clearInvoice(invoice: InvoicePayload): Promise<ClearanceResponse>   // B2B mTLS
     * reportInvoice(invoice: InvoicePayload): Promise<ReportingResponse>  // B2C queue
   - IWhatsAppService:
     * sendInvoiceNotification(payload: WaDeliveryPayload): Promise<WaDeliveryResult>
     * handleWebhook(event: WaWebhookEvent): Promise<void>
   - ICsidService:
     * requestComplianceCsid(otp: string): Promise<CsidComplianceResponse>
     * runComplianceChecks(requestId: string): Promise<boolean>
     * issueProductionCsid(requestId: string): Promise<CsidProductionResponse>
```

---

### 💬 Prompt 2.5: Drizzle ORM Database Layer & Schema Definitions
```text
Role: Database Architect (PostgreSQL / Drizzle ORM)
Task: Implement complete type-safe Drizzle ORM schema, relations, and database client.
IMPORTANT: Apply all constraints from the analyst-reviewed schema (analyst-review-report.md).

Requirements:
1. Install: drizzle-orm, postgres, drizzle-kit (dev)

2. src/lib/db/schema.ts — define all tables with pgTable():

   tenants: id (UUID PK), name, vatNumber CHAR(15) CHECK('^3[0-9]{13}3$'), email UNIQUE,
            subdomain UNIQUE, logoUrl, status ('ACTIVE'|'SUSPENDED'|'PENDING'),
            planTier ('STARTER'|'PROFESSIONAL'|'ENTERPRISE'), whatsappNumber,
            createdAt, updatedAt

   apiKeys: id, tenantId (FK→tenants CASCADE), name, keyHash CHAR(64) UNIQUE,
             prefix CHAR(12), rateLimit INT DEFAULT 500, lastUsedAt, expiresAt,
             isActive BOOL DEFAULT true, createdAt

   csidCertificates: id, tenantId (FK), type ('COMPLIANCE'|'PRODUCTION'),
                     binarySecurityToken TEXT, secret TEXT, kmsKeyId TEXT,
                     issuedAt, expiresAt, isActive BOOL, createdAt

   invoices: id, tenantId (FK), invoiceNumber, invoiceType ('STANDARD'|'SIMPLIFIED'),
             sellerName, sellerVat CHECK('^3[0-9]{13}3$'), sellerAddress,
             buyerName, buyerVat (nullable), buyerAddress,
             subtotalAmount NUMERIC(14,2),    -- CHECK >= 0 only for type STANDARD (analyst fix #10)
             totalVatAmount NUMERIC(14,2),
             totalAmount NUMERIC(14,2),       -- Can be negative for credit notes (typeCode 381)
             currencyCode CHAR(3) DEFAULT 'SAR',
             typeCode VARCHAR(3),             -- '388' standard, '381' credit note, '386' debit note
             invoiceHash CHAR(44),            -- Valid Base64 SHA-256 (44 chars — analyst fix #14)
             previousHash CHAR(44),
             ublXmlS3Key TEXT, pdfS3Key TEXT, qrCodeBase64 TEXT,
             zatcaStatus ('PENDING'|'CLEARED'|'REPORTED'|'FAILED'),
             whatsappStatus ('QUEUED'|'SENT'|'DELIVERED'|'READ'|'FAILED'),
             paymentStatus ('UNPAID'|'PAID'|'PARTIAL'),
             UNIQUE(tenantId, invoiceNumber),  -- ZATCA mandate (analyst fix #7)
             createdAt, updatedAt

   invoiceLineItems: id, invoiceId (FK→invoices CASCADE DELETE),
                     lineNumber, description, quantity NUMERIC(10,3),
                     unitCode VARCHAR(10), unitPrice NUMERIC(14,4),
                     taxPercent NUMERIC(5,2), taxAmount NUMERIC(14,2),
                     lineTotal NUMERIC(14,2), createdAt

   whatsappMessages: id, invoiceId (FK→invoices), tenantId (FK),
                     waMessageId VARCHAR(100), phoneNumber VARCHAR(20),
                     templateName VARCHAR(100), payload JSONB,
                     status ('QUEUED'|'SENT'|'DELIVERED'|'READ'|'FAILED'),
                     sentAt, deliveredAt, readAt, failedAt, createdAt
                     -- One-to-Many with invoices (retry scenarios allowed — analyst fix #11)

   webhookEvents: id, tenantId (FK), source ('META'|'MOYASAR'|'PAYTABS'|'ZATCA'),
                  eventType, referenceId, payload JSONB,
                  isProcessed BOOL DEFAULT false, processedAt, createdAt

   billingCredits: id, tenantId (FK),
                   transactionType ('TOPUP'|'DEDUCT'|'REFUND'),
                   amount NUMERIC(12,2), balanceAfter NUMERIC(12,2), description, createdAt
                   -- CRITICAL: SERIALIZABLE isolation + advisory lock (analyst fix #9)
                   -- Balance: TOPUP + REFUND add, DEDUCT subtracts (analyst fix #13)

   auditLogs: id, tenantId (FK), actorType ('SYSTEM'|'AGENCY'|'ADMIN'),
              action, resourceType, resourceId, metadata JSONB, ipAddress, createdAt
              -- Intentionally NO updatedAt — immutable audit trail (analyst fix #12)

3. Define relations() from drizzle-orm for all FK relationships.

4. src/lib/db/index.ts:
   import postgres from 'postgres'
   import { drizzle } from 'drizzle-orm/postgres-js'
   import * as schema from './schema'
   const client = postgres(process.env.DATABASE_URL!)
   export const db = drizzle(client, { schema })

5. Drizzle RLS middleware pattern:
   All queries must accept tenantId and use .where(eq(table.tenantId, tenantId))
   Never expose cross-tenant data.
```

---

## 🚩 Phase 2: Mock Engine & Service Locator

### 💬 Prompt 3: Mock ZATCA Cryptographic Engine
```text
Role: Cryptography & Mock Engine Engineer
Task: Build MockZatcaService — full simulation of ZATCA Phase 2 UBL 2.1 pipeline.

Requirements:
1. src/lib/mock/mockZatcaService.ts — implements IZatcaService:

   generateUblXml(invoice):
   - Returns properly structured UBL 2.1 XML with namespaces:
     xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
     xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
   - Includes: InvoiceTypeCode, IssueDate, SellerParty, BuyerParty, TaxTotal,
     LegalMonetaryTotal, InvoiceLine elements

   calculateHash(xml):
   - Returns mock SHA-256 as 44-char Base64 string (ZATCA-valid format)
   - Chain with previousHash using: SHA-256(previousHash + SHA-256(currentXml))

   generateTlvQr(invoice):
   - TLV encoding: Tag=1 SellerName, Tag=2 VATNumber, Tag=3 Timestamp,
     Tag=4 TotalWithVAT, Tag=5 VATAmount, Tag=6 InvoiceHash, Tag=7 ECDSASignature
   - Returns valid Base64 string

   clearInvoice(invoice) — B2B:
   - Returns { clearanceStatus: 'CLEARED', clearedXml, qrCodeBase64, validationResults: [] }
   - Returns WARNINGS if sellerVat doesn't match regex pattern
   - Returns FAILED if totalAmount is negative AND typeCode is '388' (STANDARD)
   - Credit notes (typeCode '381') with negative total MUST return CLEARED (analyst fix #10)

   reportInvoice(invoice) — B2C:
   - Returns { reportingStatus: 'REPORTED', reportingRequestId: uuid, warnings: [] }

2. src/lib/mock/mockInvoices.json — test scenarios:
   - scenario_b2b_success: Standard invoice, positive total, valid VAT
   - scenario_b2c_success: Simplified invoice, B2C buyer (no VAT required)
   - scenario_credit_note: typeCode '381', negative totalAmount (must CLEAR successfully)
   - scenario_invalid_vat: Returns ZATCA validation warning
   - scenario_duplicate_number: Should be caught by DB UNIQUE(tenantId, invoiceNumber)
```

---

### 💬 Prompt 4: Mock WhatsApp Cloud API Engine & Webhook Simulator
```text
Role: Integration Engineer
Task: Build MockWhatsAppService — full simulation of Meta Cloud API delivery pipeline.

Requirements:
1. src/lib/mock/mockWhatsAppService.ts — implements IWhatsAppService:

   sendInvoiceNotification(payload):
   - Accepts: { to: E.164 phone, invoiceNumber, totalAmount, currency,
                qrCodeBase64, pdfUrl, buyerName, language: 'ar'|'en' }
   - Simulates bilingual interactive template:
     * Body (AR): "مرحباً [buyerName]، تم إصدار فاتورتك رقم [invoiceNumber]..."
     * Body (EN): "Hello [buyerName], your invoice [invoiceNumber] is ready..."
     * Button 1: "View PDF / عرض الفاتورة" → pdfUrl
     * Button 2: "Pay Now / ادفع الآن" → Moyasar/PayTabs link
   - Returns { messageId: 'wamid.HBgL' + randomUUID, status: 'QUEUED' }
   - Logs full payload to console with timestamp

   handleWebhook(event: WaWebhookEvent):
   - Updates whatsappMessages record in mock store
   - Logs status transition: QUEUED → SENT → DELIVERED → READ

2. src/lib/mock/mockStore.ts:
   - In-memory store (Map<invoiceId, MockInvoiceState>)
   - triggerMockWebhook(messageId, status): simulates Meta status updates
   - triggerPaymentWebhook(invoiceId, 'PAID'): marks paymentStatus='PAID',
     triggers follow-up WA "Payment Received" receipt template
```

---

### 💬 Prompt 5: Service Locator & Authentication Middleware
```text
Role: Software Architect
Task: Implement Service Locator pattern and API key authentication.

Requirements:
1. src/lib/services/serviceLocator.ts:
   - getZatcaService(): IZatcaService
     → if USE_MOCK_API=true: return new MockZatcaService()
     → else: return new LiveZatcaService() (throws NotImplementedError until Phase 5)
   - getWhatsAppService(): IWhatsAppService
   - getCsidService(): ICsidService
   - Pattern ensures zero code change when switching Mock → Live

2. src/lib/auth/keyValidator.ts:
   - validateApiKey(request: NextRequest): Promise<{ tenantId: string } | null>
   - Extract Bearer token from Authorization header
   - SHA-256 hash the raw key
   - Query: db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash))
   - Verify isActive=true, expiresAt > NOW(), update lastUsedAt
   - Return tenantId or null (→ 401 response)

3. Rate limiting middleware (src/lib/middleware/rateLimiter.ts):
   - Redis sliding window: key = `rate:${tenantId}:${Math.floor(Date.now()/1000)}`
   - Default limit: 500 req/sec per tenant (from apiKeys.rateLimit)
   - Return 429 with Retry-After header on breach

4. Tenant context injection:
   - Attach tenantId to NextRequest headers after keyValidator passes
   - All subsequent DB queries use this tenantId for RLS scoping
```

---

## 🚩 Phase 3: Core API Endpoints Implementation

### 💬 Prompt 6: Unified Invoice Processing API
```text
Role: Backend API Developer
Task: Implement POST /api/v1/invoices/zatca-whatsapp — the primary orchestration endpoint.

File: src/app/api/v1/invoices/zatca-whatsapp/route.ts

Flow (strict order):
  Step 1: Auth — validate Bearer API key via keyValidator → extract tenantId
  Step 2: Rate limit — check Redis counter for this tenantId
  Step 3: Validate — parse body with Zod InvoicePayload schema (400 on failure)
  Step 4: Tenant lookup — fetch tenant config from Drizzle (planTier, whatsappNumber)
  Step 5: Billing check — verify tenantId has sufficient billing credits
  Step 6: ZATCA processing:
    → B2B (STANDARD): zatcaService.clearInvoice() — synchronous mTLS call
    → B2C (SIMPLIFIED): zatcaService.reportInvoice() → push to BullMQ queue
  Step 7: Generate PDF/A-3 (async, S3 upload) + Base64 QR code
  Step 8: WhatsApp delivery → whatsappService.sendInvoiceNotification()
  Step 9: Persist to DB via Drizzle (SERIALIZABLE transaction):
    - Insert invoices record with zatcaStatus, whatsappStatus
    - Insert invoiceLineItems (cascade)
    - Insert whatsappMessages record
    - Deduct billing credit (advisory lock + SERIALIZABLE)
    - Insert auditLog entry
  Step 10: Return HTTP 200:
    {
      "success": true,
      "invoiceId": "uuid",
      "invoiceNumber": "INV-2027-001",
      "zatca": {
        "status": "CLEARED",
        "qrCode": "<base64-TLV>",
        "validationResults": []
      },
      "whatsapp": {
        "messageId": "wamid.HBgL...",
        "status": "QUEUED"
      }
    }

Error handling:
  400 — Zod validation failure → return { errors: ZodError[] }
  401 — Invalid/expired API key
  402 — Insufficient billing credits
  429 — Rate limit exceeded (Retry-After header)
  422 — ZATCA clearance rejected (return zatcaError details)
  500 — Internal error (log to auditLogs, do NOT expose stack trace)
```

---

### 💬 Prompt 7: CSID Onboarding & Webhook Endpoints
```text
Role: API Developer
Task: Implement CSID onboarding pipeline and all webhook handlers.

1. POST /api/v1/csid/compliance
   - Auth: Bearer key → tenantId
   - Body: { otp: string } (from ZATCA portal)
   - Mock: return { complianceRequestId: uuid, binarySecurityToken: 'mock-bst-...', secret: 'mock-secret' }
   - Save to csidCertificates (type='COMPLIANCE')
   - Audit log: 'CSID_COMPLIANCE_REQUESTED'

2. POST /api/v1/csid/production
   - Body: { complianceRequestId: string }
   - Auto-run ZATCA compliance suite (send test STANDARD + SIMPLIFIED invoices)
   - Mock: return { issuedAt, expiresAt, csidToken: 'prod-csid-...' }
   - Save to csidCertificates (type='PRODUCTION', isActive=true)
   - Store KMS key reference (never store raw private key)

3. POST /api/v1/webhooks/whatsapp
   - Verify Meta webhook signature (X-Hub-Signature-256 HMAC-SHA256)
   - Parse WaWebhookEvent → update whatsappMessages.status
   - Handle payment PAID event → update invoices.paymentStatus='PAID'
   - Send follow-up "Payment Received" WA receipt
   - Insert webhookEvents record (isProcessed=true)
   - Return HTTP 200 immediately (Meta requires < 5s response)

4. GET /api/v1/webhooks/whatsapp
   - Meta challenge: ?hub.verify_token=META_VERIFY_TOKEN&hub.challenge=xxx
   - Return hub.challenge as plain text if token matches
```

---

## 🚩 Phase 4: White-Label Agency Dashboard & UI

### 💬 Prompt 8: Agency Portal Dashboard UI/UX
```text
Role: Senior Frontend & UI/UX Engineer (Next.js / Tailwind CSS / Framer Motion)
Task: Build the White-Label Agency Portal — premium, bilingual, RTL-ready dashboard.

Design System (MANDATORY — no deviations):
  Primary:   #064E3B (Saudi Royal Emerald), #059669 (Emerald Glow)
  Accent:    #D4AF37 (Desert Gold)
  Base:      #0F172A (Deep Slate Ink)
  Glass:     backdrop-blur-md bg-white/80 dark:bg-slate-900/80
  3D Cards:  perspective: 1600px, rotateX/Y on hover (Framer Motion)
  Font:      Inter (EN) + Noto Naskh Arabic (AR) from Google Fonts

1. src/app/(dashboard)/layout.tsx:
   - Sidebar navigation (collapsible, RTL-aware)
   - ThemeProvider (NextThemes: dark/light)
   - Language toggle: EN ↔ AR with dir="rtl" switch
   - Agency logo placement (from tenants.logoUrl)

2. src/app/(dashboard)/page.tsx — Main Dashboard:
   KPI Cards (Framer Motion count-up, live SVG sparklines):
   - Total Invoices Processed (month-to-date)
   - ZATCA Clearance Pass Rate (target: 100%)
   - WhatsApp Delivery Rate (target: ≥ 99.5%)
   - Active API Keys
   - Current Billing Credit Balance

   Analytics Chart: Daily invoice clearance + delivery rates (last 30 days)

   Live Transaction Table (Drizzle Server Component):
   db.select({ invoiceNumber, tenantName, invoiceType, zatcaStatus,
               whatsappStatus, paymentStatus, createdAt })
     .from(invoices)
     .innerJoin(tenants, eq(invoices.tenantId, tenants.id))
     .where(eq(invoices.tenantId, currentTenantId))
     .orderBy(desc(invoices.createdAt)).limit(50)

   Row click → Detail Modal:
   - Base64 QR Code rendered as QR image
   - Canonicalized UBL 2.1 XML (syntax-highlighted)
   - Simulated WhatsApp chat preview with Pay Now button
   - Status timeline: Submitted → Cleared → WA Sent → WA Read → Paid

3. src/app/(dashboard)/keys/page.tsx:
   - Generate new API key (name, rateLimit, expiresAt) → show raw key ONCE
   - Display: prefix (12 chars), rateLimit, lastUsedAt, isActive toggle, expiry
   - Revoke key: isActive=false (audit logged)
   - Credit balance + top-up flow (Stripe/Paddle stub)

4. src/app/(dashboard)/tenants/page.tsx:
   - Create sub-tenant: name, vatNumber, email, whatsappNumber, planTier
   - Custom subdomain + logo upload (S3 presigned URL)
   - Per-tenant invoice volume and credit usage charts
```

---

## 🚩 Phase 5: Live Production Services

### 💬 Prompt 9: Live ZATCA Cryptographic Engine
```text
Role: Cryptography Engineer (Production)
Task: Replace MockZatcaService with LiveZatcaService — real mTLS ZATCA integration.

Requirements:
1. src/lib/crypto/ublBuilder.ts:
   - Full UBL 2.1 XML generation with all required ZATCA fields
   - C14N canonicalization (Canonical XML 1.0)
   - XSD local validation before any portal submission

2. src/lib/crypto/signer.ts:
   - Retrieve ECDSA private key from AWS KMS (never decrypt locally)
   - KMS Sign API: SigningAlgorithm=ECDSA_SHA_256, KeyId=tenant.kmsKeyId
   - Attach CSID from csidCertificates table
   - Hash chain: SHA-256(previousInvoiceHash + SHA-256(currentXmlC14N))

3. src/lib/services/liveZatcaService.ts:
   - B2B clearance: POST https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/invoices/clearance/single
     Headers: Authorization: Basic <b64(binarySecurityToken:secret)>
     Body: { invoiceHash, uuid, invoice: <base64 UBL XML> }
   - B2C reporting: POST .../invoices/reporting/single
   - Both: axios with httpsAgent for mTLS

4. DLQ strategy for failed B2B clearance:
   - Exponential backoff: 1s → 2s → 4s → 8s → 16s (max 5 retries)
   - After 5 failures: DLQ (BullMQ) + Slack alert to SuperAdmin
   - Manual review queue in dashboard
```

---

## 🚩 Phase 6: Testing, QA & Verification

### 💬 Prompt 10: Automated Testing Suite
```text
Role: QA & DevOps Engineer
Task: Build comprehensive automated test suite + VS Code REST client collection.

Requirements:
1. scripts/test-api.ts (ts-node) — 13 sequential test scenarios:
   T01 — GET /api/v1/health → status: ok
   T02 — POST invoices (B2B Standard) → zatcaStatus: CLEARED
   T03 — POST invoices (B2C Simplified) → zatcaStatus: REPORTED
   T04 — POST credit note (typeCode 381, negative total) → CLEARED (NOT failed)
   T05 — Duplicate invoice number → 409 from DB UNIQUE constraint
   T06 — Invalid VAT (not 15-char, not starting/ending with 3) → 400 Zod error
   T07 — Invalid API key → 401 Unauthorized
   T08 — POST /api/v1/csid/compliance → complianceRequestId returned
   T09 — POST /api/v1/csid/production → csidToken returned
   T10 — Mock WA webhook DELIVERED → whatsappStatus updated in DB
   T11 — Mock payment PAID webhook → paymentStatus=PAID + receipt WA sent
   T12 — Billing credit deduction → balanceAfter correctly reduced
   T13 — 501st request in 1 second → 429 rate limit response

2. requests.http — VS Code REST Client collection:
   All 13 scenarios with variables: @baseUrl, @apiKey, @tenantId

3. scripts/seed-db.ts:
   - 1 demo tenant, 2 API keys, 5 sample invoices (all status combinations)
   - npm run db:seed
```

---

## 🚩 Phase 7: AWS Deployment & Observability

### 💬 Prompt 11: AWS Production Deployment
```text
Role: DevOps / Cloud Architect
Task: Configure production AWS deployment on me-central-1 (Saudi CCRF compliance).

Requirements:
1. Dockerfile (multi-stage):
   - Stage 1: node:20-alpine (next build)
   - Stage 2: node:20-alpine runtime (next start --port 3000)
   - Non-root user, minimal attack surface

2. ECS Fargate:
   - CPU: 1024, Memory: 2048 (autoscale on CPU/Memory metrics)
   - Secrets from AWS Secrets Manager (no plaintext env vars)
   - Health check: GET /api/v1/health every 30s

3. Application Load Balancer:
   - HTTPS (ACM certificate) → port 3000
   - Health check: /api/v1/health

4. Amazon RDS PostgreSQL (Multi-AZ):
   - db.r6g.large, automated backups 7-day, AES-256 encryption
   - Read replica for dashboard analytics

5. ElastiCache Redis (cluster mode):
   - BullMQ queues + rate limit counters + tenant config cache (15 min TTL)

6. CloudWatch + Datadog alerts (PagerDuty/Slack):
   - ZATCA clearance failure rate > 0.1%
   - WhatsApp delivery rate < 99.5%
   - API 5xx rate > 0.5%
   - DLQ depth > 100 jobs
   - RDS CPU > 80% / Redis memory > 70%

7. S3 Lifecycle (ZATCA 6-year archival mandate):
   - Standard-IA after 90 days → Glacier after 1 year
   - Versioning enabled, MFA delete protected
```

---

## 📊 KPI Targets (PRD-Aligned)

| KPI | Target | Monitoring |
|:--|:--|:--|
| API Response Time | < 300ms | CloudWatch p99 |
| ZATCA Compliance | 100% pass rate | Dashboard clearance rate |
| Developer Onboarding | < 15 minutes (sandbox → live) | Onboarding analytics |
| WhatsApp Delivery | ≥ 99.5% success rate | Meta webhook tracking |
| API Availability | 99.95% uptime | Multi-AZ + ALB health checks |
| Data Residency | 100% in me-central-1 | AWS region enforcement |

---

## 💰 B2B Pricing Tiers (GTM Reference)

| Tier | Target | Invoices/Month | Price (SAR/mo) | Features |
|:--|:--|:--|:--|:--|
| **Agency Starter** | Freelancers & Small Agencies | ≤ 1,000 | SAR 299 | 3 white-label clients, ZATCA Reporting, Basic WA |
| **Agency Growth** | Mid-size Agencies & POS Vendors | ≤ 10,000 | SAR 899 | 15 white-label clients, Custom WA Branding, Clearance API |
| **Enterprise** | Large ERP Integrators & SaaS | 50,000+ | SAR 2,499 | Unlimited sub-accounts, Dedicated mTLS, Priority Support |

**Agency Revenue Share:** Agency bills client SAR 150/mo → pays platform SAR 50/mo → SAR 100/mo margin per client.

---

## 📌 Master Implementation Checklist

```
Phase 1 — Foundation
  [ ] Next.js 14+ App Router + TypeScript + Tailwind
  [ ] Full directory structure (as defined in Prompt 1)
  [ ] .env.example with all variables
  [ ] GET /api/v1/health endpoint
  [ ] drizzle.config.ts + package.json db:* scripts

Phase 2 — Types & Schema
  [ ] src/types/invoice.ts — Zod InvoicePayload schema
  [ ] src/types/zatca.ts + src/types/whatsapp.ts
  [ ] src/lib/services/interfaces.ts — all 3 service contracts
  [ ] src/lib/db/schema.ts — ALL tables with analyst-validated constraints
  [ ] src/lib/db/index.ts — Drizzle client
  [ ] Initial DB migration (drizzle-kit generate + migrate)

Phase 3 — Mock Services
  [ ] MockZatcaService — UBL XML, hash chain, TLV QR, clearance, reporting
  [ ] mockInvoices.json — 5 scenarios including credit note (typeCode 381)
  [ ] MockWhatsAppService — bilingual template, webhook triggers
  [ ] mockStore.ts — in-memory state
  [ ] serviceLocator.ts — factory with USE_MOCK_API flag
  [ ] keyValidator.ts — SHA-256 hash lookup + RLS
  [ ] rateLimiter.ts — Redis sliding window per tenant

Phase 4 — API Endpoints
  [ ] POST /api/v1/invoices/zatca-whatsapp — full orchestration
  [ ] POST /api/v1/csid/compliance + production
  [ ] POST /api/v1/webhooks/whatsapp — Meta + payment webhooks
  [ ] GET /api/v1/webhooks/whatsapp — Meta challenge verification

Phase 5 — Dashboard UI
  [ ] Dashboard layout — sidebar, ThemeProvider, bilingual toggle
  [ ] Main dashboard — KPI cards, analytics chart, transaction table
  [ ] Invoice detail modal — QR preview, XML viewer, WA chat preview
  [ ] API Key management page
  [ ] Sub-tenant management page

Phase 6 — Live Services (Post-MVP)
  [ ] LiveZatcaService — real mTLS ZATCA portal integration
  [ ] XSD local validator + C14N canonicalization
  [ ] AWS KMS signing (secp256k1 ECDSA)
  [ ] LiveWhatsAppService — Meta Cloud API production
  [ ] Moyasar/PayTabs payment link generation

Phase 7 — Testing & QA
  [ ] scripts/test-api.ts — 13 automated test scenarios
  [ ] requests.http — VS Code REST Client collection
  [ ] scripts/seed-db.ts — demo data seeding

Phase 8 — Deployment
  [ ] Dockerfile (multi-stage, non-root)
  [ ] ECS Fargate + ALB configuration
  [ ] RDS PostgreSQL Multi-AZ (me-central-1)
  [ ] ElastiCache Redis cluster
  [ ] CloudWatch + Datadog monitoring alerts
  [ ] S3 lifecycle policy (6-year ZATCA archival)
  [ ] Security audit + ZATCA compliance run
```

---

> [!TIP]
> **AI Agent Quick Reference — Critical Rules:**
> - Always check `interfaces.ts` before implementing any service
> - Always use `serviceLocator.ts` — never instantiate services directly
> - Always scope DB queries with `tenantId` — RLS enforced at all times
> - Always validate with Zod at API boundary — never trust raw input
> - Credit note invoices (typeCode `381`) CAN have negative `totalAmount` — this is VALID ZATCA behavior (analyst fix #10)
> - `billingCredits` balance: TOPUP + REFUND **add**, DEDUCT **subtracts** (analyst fix #13)
> - `whatsappMessages` is **One-to-Many** with invoices — retry scenarios allowed (analyst fix #11)
> - `auditLogs` has **no `updatedAt`** — immutable by design (analyst fix #12)
> - `invoices.invoiceHash` must be a **44-char Base64 SHA-256** string (analyst fix #14)

