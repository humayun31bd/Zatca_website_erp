# PRD Gap Analysis: erp_prd.md vs prd_validation.md

## Summary

The `prd_validation.md` defines **6 critical requirement categories** for a ZATCA-compliant ERP targeting Riyadh shops. Below is a category-by-category gap analysis.

---

## ✅ What's Well-Covered in erp_prd.md

| Validation Requirement | PRD Coverage |
|---|---|
| UBL 2.1 XML generation | ✅ Section 7.1 & 10.1 |
| ECDSA cryptographic signing (CSID, X.509) | ✅ Section 7.1 & 10.1 |
| Invoice UUID + hash chaining | ✅ Section 7.1 ("PIH chain maintenance") |
| QR code TLV (B2C) | ✅ Section 7.1 & 10.1 |
| ZATCA Fatoora API: B2B clearance + B2C reporting | ✅ Section 7.1 & 10.1 |
| Arabic-first RTL UI | ✅ Section 8 |
| WhatsApp invoice delivery | ✅ Section 10.2 |
| Payment reminders via WhatsApp | ✅ Section 10.2 |
| POS with barcode scanner | ✅ Section 10.4 |
| Low-stock alerts, inventory tracking | ✅ Section 10.4 |
| VAT return reports (ZATCA format) | ✅ Section 10.3 |
| Agency/partner program | ✅ Section 11 |
| Mobile app (Flutter Android + iOS) | ✅ Section 5 |
| AWS Riyadh data residency | ✅ Section 12.3 |
| Bank reconciliation | ✅ Section 10.3 |
| SAR currency | ✅ Section 9.1 |

---

## 🔴 Critical Gaps (Missing or Incomplete)

### 1. ZATCA Tamper Resistance & Audit Log
**Validation requires:** Invoices cannot be deleted/modified after generation; full audit log. Secure archiving for **at least 6 years**.

**PRD status:** ❌ **Completely missing.**
- No mention of invoice immutability / tamper resistance policies
- No data archiving/retention policy (6-year requirement)
- No audit trail system documented
- Database table `invoices` doesn't mention immutable/append-only design

> **Add to:** Section 10.1 (ZATCA Engine) and Section 13 (Database Schema)

---

### 2. Credit/Debit Notes (Returns) with ZATCA Compliance
**Validation requires:** Returns, credit/debit notes with ZATCA compliance.

**PRD status:** ❌ **Not mentioned anywhere.**
- Invoicing module only covers: Create, List, Detail, QR, Share PDF, WhatsApp send
- No credit note / debit note / return invoice flow described
- ZATCA requires compliant XML for credit/debit notes too

> **Add to:** Section 5.3 (ERP Modules - Invoicing) and Section 6.1 (API endpoints)

---

### 3. Purchases & Supplier Management
**Validation requires:** Supplier ledger, purchase invoices, payment tracking and due dates.

**PRD status:** ❌ **Completely absent as a feature module.**
- Section 5.3 lists 8 modules — none cover Purchases/Suppliers
- No `suppliers` or `purchase_invoices` table in Section 13 (Database Schema)
- No API endpoints for purchases in Section 6.1

> **Add as:** New Module 10.6 — Purchases & Supplier Management

---

### 4. Cash Book & Daily Cash Summary
**Validation requires:** Cash book, bank reconciliation, **daily cash summary** (described as "very important for small shops").

**PRD status:** ⚠️ **Partially missing.**
- Bank reconciliation is mentioned in Section 10.3 (AI Copilot)
- Cash book / daily cash summary is **not mentioned**
- No dedicated cash flow module

> **Add to:** Section 10.3 or as a dedicated Cash Management sub-module

---

### 5. Profit & Loss Report (Monthly)
**Validation requires:** Profit & loss by month, top selling items, customer balances.

**PRD status:** ⚠️ **Partially covered.**
- Section 10.3 mentions "double-entry bookkeeping with auto-journal entries" and "VAT return reports"
- Section 5.3 Reports module mentions "Revenue by period" and "Export CSV/PDF"
- Explicit **P&L report, top-selling items report, and customer balance report** are not defined

> **Add to:** Section 5.3 (Reports module) and Section 10.3

---

### 6. Hijri Calendar Support
**Validation requires:** Hijri + Gregorian date display (Hijri is described as a "plus" but important for Saudi shops).

**PRD status:** ❌ **Not mentioned at all.**
- Section 8 covers i18n thoroughly (AR/EN/UR) but no date format handling
- No Hijri date library or formatting utility mentioned (e.g., `intl` or `hijri` package)

> **Add to:** Section 8.3 (ERP App i18n) and Section 9 (Design System)

---

### 7. Multi-Unit Inventory Support
**Validation requires:** Multi-unit support (piece, carton, kg) in inventory.

**PRD status:** ✅ **Implemented.**
- Section 10.4 now includes "Multi-Unit of Measure (UoM)" with unit conversions.
- Database schema updated with `product_units` table to support unit conversions, alternative barcodes, and prices per unit.

---

### 7.5 Multi-Branch & Product Locations
**Validation requires:** Inventory tracked across multiple branches/stores and specific product locations (e.g. shelves).

**PRD status:** ✅ **Implemented.**
- Section 10.4 includes "Multi-Branch Inventory & Product Locations".
- Database schema updated with `branches` and `branch_inventory` tables.

---

### 8. Pricing Plans Missing "Starter" Tier for Shops
**Validation requires:**
- Starter: 1 user, basic sales + inventory + ZATCA e-invoices
- Standard: + purchases, VAT reports, WhatsApp, 2–3 users
- Pro: + multi-branch, advanced inventory, API, more users

**PRD status:** ✅ **Implemented.**
- Section 11.1 includes a full pricing table for the Track A (SME/Service Business) segment.
- Free trial duration is explicitly set to 30 days.
- Per-branch pricing for chains is defined at SAR 99/branch/mo.

---

### 9. Go-to-Market Strategy
**Validation requires:** GTM tactics — local accountant partnerships, POS hardware vendor partnerships, on-ground demos (Batha, Olaya), Arabic content marketing (YouTube, checklists), Google Ads on Arabic ZATCA keywords.

**PRD status:** ✅ **Implemented.**
- Section 16.2 documents all required GTM tactics.

---

### 10. Competitive Positioning Strategy
**Validation requires:** Explicit differentiation from Qoyod, Daftra, Zoho Books, Odoo KSA, QuickBooks, Xero. Niche focus: "Accounting for Riyadh retail shops."

**PRD status:** ✅ **Implemented.**
- Section 16.1 includes the complete positioning statement and a competitor differentiation matrix.

---

### 11. Arabic Number Formatting
**Validation requires:** Arabic number formatting on invoices and UI.

**PRD status:** ✅ **Implemented.**
- Section 8.4 explicitly documents Hijri Calendar & Arabic-Indic Number Formatting support (`٠١٢٣٤٥٦٧٨٩`) alongside currency display.

---

### 12. Pre-Configured Chart of Accounts by Industry
**Validation requires:** Pre-configured chart of accounts for grocery, spare parts, fashion shops (one-click ZATCA setup wizard).

**PRD status:** ✅ **Implemented.**
- Section 16.3 details Industry-Specific Chart of Accounts templates (Retail, Services, Logistics, F&B) provided during the onboarding setup wizard.

---

## 📊 Gap Summary Table

| # | Missing Requirement | Severity | Validation Section |
|---|---|---|---|
| 1 | Invoice tamper resistance & 6-year archiving | ✅ Implemented | §1 ZATCA |
| 2 | Credit/debit notes with ZATCA compliance | ✅ Implemented | §2 Core Accounting |
| 3 | Purchases & supplier management module | ✅ Implemented | §2 Core Accounting |
| 4 | Cash book & daily cash summary | ✅ Implemented | §2 Core Accounting |
| 5 | P&L, top-selling items, customer balance reports | ✅ Implemented | §2 Core Accounting |
| 6 | Hijri calendar support | ✅ Implemented | §3 Localization |
| 7 | Multi-unit inventory (piece/carton/kg) | ✅ Implemented | §2 Core Accounting |
| 8 | SME pricing tiers + free trial policy | ✅ Implemented | §4 Pricing |
| 9 | Go-to-market strategy | ✅ Implemented | §5 GTM |
| 10 | Competitive positioning vs. Qoyod/Daftra/Zoho | ✅ Implemented | §6 Positioning |
| 11 | Arabic number formatting (Indic numerals) | ✅ Implemented | §3 Localization |
| 12 | Industry-specific chart of accounts templates | ✅ Implemented | §6 Positioning |


