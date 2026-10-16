# Tenant-Wise Product Requirements Document (PRD)

**Platform:** Bizora ERP
**Company:** Bizora Technologies Limited
**Version:** 1.0  
**Date:** 2026-09-27  
**Target Market:** KSA (Primary), GCC, Bangladesh (Secondary)

---

## Table of Contents

1. [Overview & Goals](#1-overview--goals)
2. [Tenant Business Types](#2-tenant-business-types)
3. [Tenant Onboarding Workflow](#3-tenant-onboarding-workflow)
4. [Tenant-Wise Feature Matrix](#4-tenant-wise-feature-matrix)
5. [Product Management by Tenant Type](#5-product-management-by-tenant-type)
6. [Inventory & Stock Management](#6-inventory--stock-management)
7. [CSV / Bulk Product Import](#7-csv--bulk-product-import)
8. [Chart of Accounts (COA) per Tenant](#8-chart-of-accounts-coa-per-tenant)
9. [Compliance by Tenant Type & Region](#9-compliance-by-tenant-type--region)
10. [Database Tables — Creation Order](#10-database-tables--creation-order)
11. [Implementation Plan & Phases](#11-implementation-plan--phases)
12. [API Endpoints Plan](#12-api-endpoints-plan)
13. [Success Metrics](#13-success-metrics)

---

## 1. Overview & Goals

### 1.1 Purpose

This document defines the tenant-wise product requirements for the **Numou ERP multi-tenant SaaS platform**. Each tenant is a business that onboards to the platform, selects its **business type**, and receives a customized ERP experience — with its own product catalog, COA, compliance tracking, and inventory management tailored to that business vertical.

### 1.2 Key Design Principles

| Principle | Description |
|---|---|
| **Tenant Isolation** | All data is scoped per `tenant_id`. No cross-tenant data leakage. |
| **Business-Type Driven UI** | The product form, import template, and compliance fields shown to a tenant are driven by their `business_type`. |
| **Single Catalog, Multi-Location Stock** | Products are defined once at tenant level; stock is tracked per branch/warehouse. |
| **Unified Data Model** | One `product` table handles all tenant types via nullable specialized fields and FK lookups. |
| **Normalized Lookup Tables** | Brands, units, tax categories, colors, etc. are normalized into lookup tables for clean filtering and reporting. |
| **5-Level COA Standard** | A platform-standard, system-seeded Chart of Accounts (Levels 1–3) is inherited by every tenant; Levels 4–5 are tenant-customizable. |

---

## 2. Tenant Business Types

Every tenant selects their business type during onboarding. This selection drives the ERP feature set, product form fields, COA pre-seeding, and compliance requirements.

```
Tenant
│
├── Retail
│     ├── Convenience stores, mini-marts, pharmacies
│     ├── Clothing, footwear, accessories
│     ├── Electronics and mobile phone shops
│     └── Specialty/boutique stores (gifts, books, crafts)
│
├── Food & Beverage (F&B)
│     ├── Restaurants and cafes
│     ├── Fast food and takeaway counters
│     ├── Bakeries and dessert shops
│     └── Kiosks/food stalls
│
├── Services
│     ├── Salons, spas, barbershops
│     ├── Tailoring and laundry services
│     ├── Repair shops (electronics, shoes, tailoring)
│     └── Tutoring/coaching centers
│
├── Professional / Office-Based SMEs
│     ├── Small consultancies (accounting, legal, marketing)
│     ├── Real estate agencies
│     ├── IT/software service providers
│     └── Co-working or shared office tenants
│
├── Healthcare & Wellness
│     ├── Clinics, diagnostic centers
│     ├── Pharmacies
│     └── Fitness studios, gyms
│
├── Trade & Light Manufacturing
│     ├── Small workshops (carpentry, tailoring units)
│     ├── Wholesale/distribution outlets
│     └── Print and packaging shops
│
└── E-commerce / Warehouse-linked
      ├── Small fulfillment or storage units
      └── Dark stores (quick-delivery businesses)
```

---

## 3. Tenant Onboarding Workflow

### 3.1 Flow

```
User lands on website
    → Signs up (email + phone)
    → Receives verification email
    → Clicks link → Tenant Onboarding Page
    → Fills business information:
          • Business Name
          • Business Type (dropdown)
          • Sub-type / Industry vertical
          • Country / Region
          • VAT/Tax Registration Number (optional, mandatory for KSA ZATCA)
          • Number of branches/outlets
          • Primary contact details
    → System creates Tenant record
    → System seeds:
          • Default COA (Levels 1–3 system-seeded + Level 4–5 pre-configured for business type)
          • Default product categories (based on business type)
          • Default lookup values (units, tax categories, storage conditions, etc.)
    → Tenant lands on ERP Dashboard
    → Guided setup wizard (add first branch, import products)
```

### 3.2 Tenant Database Table

```sql
CREATE TABLE tenant (
    tenant_id             BIGSERIAL PRIMARY KEY,
    tenant_name           VARCHAR(150) NOT NULL,
    business_type         VARCHAR(50) NOT NULL,       -- 'RETAIL','F&B','SERVICES','PROFESSIONAL','HEALTHCARE','TRADE','ECOMMERCE'
    business_subtype      VARCHAR(100),               -- e.g., 'PHARMACY', 'ELECTRONICS', 'RESTAURANT'
    country_code          VARCHAR(3) DEFAULT 'SAU',   -- ISO 3166-1 alpha-3
    vat_registration_no   VARCHAR(50),                -- ZATCA / local tax authority
    cr_number             VARCHAR(50),                -- Commercial Registration Number
    plan                  VARCHAR(30) DEFAULT 'STARTER', -- STARTER, GROWTH, ENTERPRISE
    is_active             BOOLEAN DEFAULT TRUE,
    onboarding_status     VARCHAR(30) DEFAULT 'PENDING', -- PENDING, COMPLETED, SUSPENDED
    created_at            TIMESTAMP DEFAULT now(),
    updated_at            TIMESTAMP DEFAULT now()
);
```

---

## 4. Tenant-Wise Feature Matrix

| Feature | Retail / Mini-Mart | Electronics / Mobile | Pharmacy | Apparel | F&B | Services | Professional |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Product Catalog | ✅ | ✅ | ✅ | ✅ | ✅ (Menu) | ✅ (Services) | ✅ (Services) |
| SKU / Barcode | ✅ | ✅ | ✅ | ✅ | ⚠️ Optional | ❌ | ❌ |
| Bulk CSV Import | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ Limited | ❌ |
| Variant Management (Color/Size) | ⚠️ Limited | ✅ (Color/RAM) | ❌ | ✅ | ❌ | ❌ | ❌ |
| Serial / IMEI Tracking | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Batch / Expiry Tracking | ❌ | ❌ | ✅ | ❌ | ✅ (Ingredients) | ❌ | ❌ |
| Multi-Location Inventory | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Stock Transfer (WH → Branch) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Prescription Tracking | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Compliance (SABER/SFDA/BTRC) | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| ZATCA e-Invoice | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| POS Integration | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ |
| Service Booking/Appointments | ❌ | ⚠️ | ⚠️ | ❌ | ✅ (Reservations) | ✅ | ✅ |
| COA (5-Level) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Supplier Management | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ |
| Customer CRM | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 5. Product Management by Tenant Type

### 5.1 Product Field Visibility Matrix

Fields shown in the product creation form are conditional on `business_type` + `business_subtype`:

| Field | FMCG Retail | Electronics | Pharmacy | Apparel |
|---|:---:|:---:|:---:|:---:|
| SKU | ✅ | ✅ | ✅ | ✅ |
| Product Name | ✅ | ✅ | ✅ (trade_name) | ✅ |
| Description | ✅ | ✅ | ✅ | ✅ |
| Category | ✅ | ✅ | ✅ | ✅ |
| Brand | ✅ | ✅ | ✅ (manufacturer) | ✅ |
| Barcode | ✅ | ✅ | ✅ | ✅ |
| Unit | ✅ | ✅ | ✅ (box/strip) | ✅ (pcs) |
| Price / Discounted Price | ✅ | ✅ | ✅ | ✅ |
| Tax Category | ✅ | ✅ | ✅ | ✅ |
| Image URLs | ✅ | ✅ | ⚠️ | ✅ |
| Model Number | ❌ | ✅ | ❌ | ❌ |
| Color | ❌ | ✅ | ❌ | ✅ |
| Storage / RAM | ❌ | ✅ | ❌ | ❌ |
| Warranty (months) | ❌ | ✅ | ❌ | ❌ |
| Serial Tracking | ❌ | ✅ | ❌ | ❌ |
| Generic Name | ❌ | ❌ | ✅ | ❌ |
| Active Ingredient | ❌ | ❌ | ✅ | ❌ |
| Strength | ❌ | ❌ | ✅ | ❌ |
| Dosage Form | ❌ | ❌ | ✅ | ❌ |
| Prescription Required | ❌ | ❌ | ✅ | ❌ |
| Controlled Substance | ❌ | ❌ | ✅ | ❌ |
| Storage Condition | ❌ | ❌ | ✅ | ❌ |
| Batch Tracking | ❌ | ❌ | ✅ | ❌ |
| Apparel Type (Textile/Leather) | ❌ | ❌ | ❌ | ✅ |
| Fiber Composition | ❌ | ❌ | ❌ | ✅ |
| Size | ❌ | ❌ | ❌ | ✅ |
| Gender | ❌ | ❌ | ❌ | ✅ |
| Age Group | ❌ | ❌ | ❌ | ✅ |
| Is Underwear | ❌ | ❌ | ❌ | ✅ |

### 5.2 Product Catalog Rules

- **One SKU per tenant** — products are not duplicated per branch; stock is separate.
- **Discounted price** must always be ≤ `base_selling_price` (enforced at API and DB level).
- **Image URLs** stored as JSONB array; up to 10 images per product.
- **Product status lifecycle**: `DRAFT → PENDING_REVIEW → ACTIVE → INACTIVE / ARCHIVED`

---

## 6. Inventory & Stock Management

### 6.1 Stock Architecture

```
Tenant
├── Products (Catalog) — Single record per SKU
│
├── Warehouse(s) — Bulk storage, no POS
│     └── Inventory rows per product
│
└── Outlet(s) / Branch(es) — Customer-facing, POS-enabled
      └── Inventory rows per product
            └── optional: local_selling_price override
```

### 6.2 Stock Transfer Flow

```
Warehouse → [Stock Transfer created: PENDING]
          → Goods shipped: [IN_TRANSIT]
          → Branch receives: [RECEIVED]
          → Inventory updated at both ends automatically
```

### 6.3 Special Tracking by Tenant Type

| Tenant Type | Tracking Method | Key Table |
|---|---|---|
| FMCG / Retail | Quantity-based (per location) | `inventory` |
| Electronics | Quantity + Serial/IMEI per unit | `inventory` + `product_unit` |
| Pharmacy | Quantity + Batch/Lot + Expiry | `product_batch` + `drug_serial_unit` |
| Apparel | Quantity-based (per location) | `inventory` |
| F&B | Quantity-based (ingredients) | `inventory` |

---

## 7. CSV / Bulk Product Import

### 7.1 Universal Import Flow

```
Step 1: Tenant selects business type → System loads type-specific template
Step 2: Download pre-formatted Excel template (with sample rows)
Step 3: Tenant uploads completed CSV (max 5MB / 5,000 rows, UTF-8)
Step 4: Pre-validation pass (before DB write)
          • Header row check
          • Required fields non-empty
          • Data type checks (price=numeric, stock=integer)
          • Duplicate SKU detection (within file + vs. existing catalog)
          • Category validation against tenant's taxonomy
Step 5: Preview screen → flagged errors shown row by row
Step 6: Tenant: fix & re-upload OR proceed with valid rows only
Step 7: Commit import → valid rows inserted/updated; invalid rows skipped + logged
Step 8: Post-import summary email + dashboard notification
          → X products added, Y updated, Z failed
          → Downloadable error log
```

### 7.2 Template Columns by Tenant Type

#### Retail / FMCG Template

| Column | Required | Notes |
|---|:---:|---|
| SKU | ✅ | Unique per tenant |
| Product Name | ✅ | Max 150 chars |
| Category | ✅ | Must match predefined taxonomy |
| Sub-category | ❌ | |
| Description | ❌ | |
| Price | ✅ | Numeric, 2 decimals |
| Discounted Price | ❌ | Must be ≤ Price |
| Stock Quantity | ✅ | Integer ≥ 0 |
| Unit | ❌ | pcs, kg, box, etc. |
| Barcode/UPC | ❌ | |
| Brand | ❌ | |
| Image URL(s) | ❌ | Comma-separated |
| Tax Category | ❌ | Defaults to STANDARD |
| Status | ❌ | Active/Inactive |

#### Electronics / Mobile Template (adds to above)

| Column | Required | Notes |
|---|:---:|---|
| Model Number | ❌ | |
| Color | ❌ | |
| Storage Capacity | ❌ | e.g., 128GB |
| RAM | ❌ | e.g., 8GB |
| Warranty (months) | ❌ | Default: 12 |
| Requires Serial Tracking | ❌ | TRUE/FALSE |

#### Pharmacy Template (adds to base)

| Column | Required | Notes |
|---|:---:|---|
| Generic Name | ✅ | |
| Active Ingredient | ❌ | |
| Strength | ✅ | e.g., 500mg |
| Dosage Form | ✅ | Tablet, Syrup, Injection |
| Manufacturer | ✅ | |
| Prescription Required | ✅ | TRUE/FALSE |
| Controlled Substance Schedule | ❌ | NULL if not controlled |
| Storage Condition | ❌ | Room Temp / Refrigerated |

#### Apparel Template (adds to base)

| Column | Required | Notes |
|---|:---:|---|
| Apparel Type | ✅ | TEXTILE / LEATHER / FOOTWEAR |
| Fiber Composition | ❌ | e.g., 95% Cotton |
| Color | ❌ | |
| Size | ❌ | S, M, L, XL or numeric |
| Gender | ❌ | Men / Women / Unisex |
| Age Group | ❌ | ADULT / CHILD / INFANT |
| Is Underwear | ❌ | TRUE/FALSE |

### 7.3 Validation Rules

```
ALL TYPES:
  - SKU: unique per tenant (no duplicates in file or DB)
  - Price > 0
  - Stock ≥ 0
  - Category must exist in tenant's taxonomy

PHARMACY ONLY:
  - Expiry date > today (if provided at import)
  - Batch number format validation

ELECTRONICS ONLY:
  - Warranty months: integer ≥ 0

APPAREL ONLY:
  - Apparel type: must be TEXTILE / LEATHER / FOOTWEAR
  - Age group: must be ADULT / CHILD / INFANT
```

---

## 8. Chart of Accounts (COA) per Tenant

### 8.1 COA Seeding Strategy

When a tenant is created, the system **auto-seeds Levels 1–3** (system-owned, read-only) and a **pre-configured Level 4** based on business type. Tenants add Level 5 (detail/posting accounts) for their own outlets, suppliers, etc.

| Level | Owner | Example |
|---|---|---|
| 1 | System | 1 = Assets |
| 2 | System | 1.10 = Current Assets |
| 3 | System | 1.10.01 = Cash & Bank |
| 4 | System-seeded per business type | 1.10.01.001 = Cash on Hand |
| 5 | Tenant-managed | 1.10.01.001.001 = Petty Cash – Outlet A |

### 8.2 Pre-Seeded Level 4 COA by Business Type

#### Retail / FMCG

- `1.10.03.001` → Merchandise Inventory
- `5.10.01.001` → Merchandise Purchases
- `4.10.01.001` → In-Store Product Sales

#### Pharmacy

- `1.10.03.002` → Pharmaceutical Inventory
- `5.10.01.002` → Drug Purchases
- `4.10.01.002` → Pharmaceutical Sales
- `5.20.05.001` → Disposal / Expired Drug Write-off

#### Electronics / Mobile

- `1.10.03.003` → Electronics Inventory
- `5.10.01.003` → Electronics Purchases
- `4.10.01.003` → Electronics Sales
- `2.10.04.001` → Warranty Liability Reserve

#### Apparel

- `1.10.03.004` → Apparel Inventory
- `5.10.01.004` → Apparel Purchases
- `4.10.01.004` → Apparel Sales

#### F&B

- `1.10.03.005` → F&B Inventory / Raw Ingredients
- `5.10.01.005` → Food & Beverage Purchases
- `4.10.01.005` → F&B Revenue
- `5.20.06.001` → Kitchen / Production Costs

#### Services

- `4.10.03.001` → Service Revenue
- `5.20.03.002` → Technician / Staff Labour Cost
- `1.10.02.002` → Receivable – Service Jobs

---

## 9. Compliance by Tenant Type & Region

### 9.1 KSA — Saudi Arabia

| Tenant Type | Compliance Body | Key Requirement |
|---|---|---|
| Electronics / Mobile | SABER (SASO) + CST | PCoC per model + SCoC per shipment + CST Type Approval |
| Pharmacy | SFDA | Drug registration number + batch/lot tracking + RSD serialization |
| Apparel / Textile | SABER (SASO) | PCoC (Type 1A or Type 3) + SCoC per shipment + Arabic label |
| All | ZATCA | Phase 2 e-Invoicing (UBL 2.1 XML, ECDSA, mTLS) |

### 9.2 Bangladesh

| Tenant Type | Compliance Body | Key Requirement |
|---|---|---|
| Electronics / Mobile | BTRC (NEIR) | IMEI registration per unit (NEIR, launched Jan 2026) |
| Pharmacy | DGDA | Drug registration + batch tracking |

### 9.3 Compliance Data Storage

Compliance data is stored in `product_compliance.compliance_data` (JSONB) keyed by country/regulator:

```json
{
  "KSA_SABER": { "pcoc_number": "...", "pcoc_expiry": "2028-02-10" },
  "KSA_CST":   { "type_approval_no": "TA 3312-A", "expiry": "2027-02-15" },
  "KSA_SFDA":  { "registration_no": "SFDA-DRG-2019-004821" },
  "BD_BTRC":   { "btrc_noc": "...", "neir_registered": true }
}
```

---

## 10. Database Tables — Creation Order

The tables must be created in the following dependency order:

```sql
-- Phase 1: System Lookups (no FKs to tenant)
1.  account_class
2.  product_type
3.  apparel_product_type
4.  gender
5.  age_group
6.  country_of_origin

-- Phase 2: Core Tenant
7.  tenant

-- Phase 3: Org Structure
8.  outlet
9.  warehouse
10. cost_center

-- Phase 4: Tenant Lookups (FK to tenant)
11. product_category
12. brand
13. product_unit
14. tax_category
15. color
16. strength
17. dosage_form
18. manufacturer
19. marketing_authorization_holder
20. storage_condition

-- Phase 5: COA
21. chart_of_accounts  (self-referencing, after account_class + tenant)

-- Phase 6: Master Data
22. supplier  (FK to tenant + chart_of_accounts)
23. customer  (FK to tenant + chart_of_accounts)

-- Phase 7: Product Catalog
24. product   (FK to all Phase 4 lookups)
25. product_compliance  (FK to product + country_of_origin)

-- Phase 8: Inventory
26. inventory               (FK to product + outlet + warehouse)
27. product_unit            (alias: product_serial_unit — FK to product + outlet/warehouse)
28. product_batch           (Pharmacy — FK to product + tenant + outlet/warehouse)
29. drug_serial_unit        (Pharmacy RSD — FK to product_batch)

-- Phase 9: Stock Transfers
30. stock_transfer          (FK to tenant + outlet + warehouse)
31. stock_transfer_line     (FK to stock_transfer + product)

-- Phase 10: Accounting
32. journal_entry           (FK to tenant)
33. journal_entry_line      (FK to journal_entry + chart_of_accounts + outlet + cost_center + supplier + customer)
```

---

## 11. Implementation Plan & Phases

### Phase 1 — Foundation (Week 1–2)

**Goal:** Core tenant infrastructure and lookup tables.

- [ ] Create all system-level lookup tables (`product_type`, `gender`, `age_group`, `country_of_origin`, `apparel_product_type`, `account_class`)
- [ ] Create `tenant` table with `business_type`, `business_subtype`, `country_code`, `plan` fields
- [ ] Create `outlet` and `warehouse` tables
- [ ] Create `cost_center` table
- [ ] Seed system-level lookups with standard values
- [ ] API: `POST /tenants/onboard` — create tenant + seed COA + seed categories

---

### Phase 2 — Product Catalog (Week 3–4)

**Goal:** Unified product management across all tenant types.

- [ ] Create all tenant-level lookup tables (`brand`, `product_unit`, `tax_category`, `color`, `strength`, `dosage_form`, `manufacturer`, `marketing_authorization_holder`, `storage_condition`)
- [ ] Create unified `product` table with all tenant-type fields
- [ ] Create `product_category` (self-referencing for sub-categories)
- [ ] Create `product_compliance` table (with JSONB compliance_data)
- [ ] API: `POST /products` — create product (field validation driven by `product_type`)
- [ ] API: `GET /products` — list + filter (by category, brand, type, status)
- [ ] API: `PUT /products/:id` — update product
- [ ] API: `DELETE /products/:id` — soft-delete (set `is_active = false`)
- [ ] Business-type driven product form UI (Flutter)

---

### Phase 3 — Bulk Import (Week 5)

**Goal:** CSV/Excel bulk product import with validation.

- [ ] Excel template generator per business type (with sample rows)
- [ ] CSV upload endpoint: `POST /products/import`
- [ ] Pre-validation pass (header check, required fields, type checks, SKU deduplication)
- [ ] Preview API: returns parsed rows with per-row error flags
- [ ] Commit import: insert valid rows, skip invalid, log failures
- [ ] Error report download endpoint
- [ ] Post-import email + dashboard notification
- [ ] Import job history table (`product_import_job`)

---

### Phase 4 — Inventory Management (Week 6–7)

**Goal:** Multi-location stock tracking with reorder alerts.

- [ ] Create `inventory` table (per product × location)
- [ ] Create `stock_transfer` + `stock_transfer_line`
- [ ] Create `product_unit` table (serial/IMEI — Electronics)
- [ ] Create `product_batch` + `drug_serial_unit` (Pharmacy)
- [ ] API: `GET /inventory` — stock levels by tenant/outlet/warehouse
- [ ] API: `POST /stock-transfers` — create transfer
- [ ] API: `PUT /stock-transfers/:id/receive` — mark received + auto-update inventory
- [ ] Low-stock alert scheduler (cron job, daily)
- [ ] Near-expiry batch alert for pharmacy (cron job, weekly)
- [ ] UI: Inventory dashboard with location filter

---

### Phase 5 — Chart of Accounts (Week 8)

**Goal:** 5-Level COA per tenant, auto-seeded on onboarding.

- [ ] Create `chart_of_accounts` table (self-referencing, 5 levels)
- [ ] Implement COA seeding service triggered on tenant creation
- [ ] API: `GET /coa` — get full tree for a tenant (recursive CTE)
- [ ] API: `POST /coa/accounts` — add Level 4 or 5 account
- [ ] API: `PUT /coa/accounts/:id` — rename/deactivate tenant accounts
- [ ] Tenant protection: block editing of `is_system = TRUE` accounts
- [ ] UI: COA tree browser (collapsible, level-color-coded)

---

### Phase 6 — Compliance Module (Week 9–10)

**Goal:** Regulatory compliance tracking by product type and region.

- [ ] Create `product_compliance` table (JSONB compliance_data)
- [ ] Electronics (KSA): SABER PCoC + CST Type Approval fields
- [ ] Electronics (BD): BTRC NEIR per-unit status on `product_serial_unit`
- [ ] Pharmacy (KSA): SFDA registration + RSD enrollment
- [ ] Apparel (KSA): SASO certification type (Type 1A / Type 3) + Arabic label flags
- [ ] Compliance expiry alert scheduler (60-day warning)
- [ ] API: `GET /compliance/expiring` — products with expiring certs
- [ ] UI: Compliance dashboard with status badges per product

---

### Phase 7 — Accounting Integration (Week 11–12)

**Goal:** Journal entry posting linked to transactions.

- [ ] Create `supplier` + `customer` tables
- [ ] Create `journal_entry` + `journal_entry_line` tables
- [ ] Auto-posting rules: sales → debit AR / credit Sales Revenue
- [ ] Auto-posting rules: purchases → debit Inventory / credit AP
- [ ] API: `POST /journals` — manual journal entry
- [ ] API: `GET /journals` — ledger view per account/date range
- [ ] Supplier subledger view
- [ ] Customer subledger view

---

## 12. API Endpoints Plan

### Tenant & Onboarding

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/tenants/onboard` | Create tenant + auto-seed COA + categories |
| GET | `/api/v1/tenants/:id` | Get tenant details |
| PUT | `/api/v1/tenants/:id` | Update tenant info |

### Lookups

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/lookups/product-types` | All product types |
| GET | `/api/v1/lookups/brands` | Tenant's brands |
| POST | `/api/v1/lookups/brands` | Add brand |
| GET | `/api/v1/lookups/units` | Tenant's units |
| GET | `/api/v1/lookups/tax-categories` | Tenant's tax categories |
| GET | `/api/v1/lookups/colors` | Tenant's colors |

### Products

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/products` | Create product |
| GET | `/api/v1/products` | List products (filter: category, brand, type, status) |
| GET | `/api/v1/products/:id` | Get product detail |
| PUT | `/api/v1/products/:id` | Update product |
| DELETE | `/api/v1/products/:id` | Soft-delete product |
| POST | `/api/v1/products/import` | Upload CSV for import |
| GET | `/api/v1/products/import/template` | Download Excel template by type |
| GET | `/api/v1/products/import/:jobId` | Get import job status + report |

### Inventory

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/inventory` | Stock levels (filter by location/product) |
| PUT | `/api/v1/inventory/:id` | Adjust stock (manual correction) |
| GET | `/api/v1/inventory/low-stock` | Products below reorder level |
| POST | `/api/v1/stock-transfers` | Create stock transfer |
| GET | `/api/v1/stock-transfers` | List transfers |
| PUT | `/api/v1/stock-transfers/:id/receive` | Mark received |

### Chart of Accounts

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/coa` | Get full COA tree for tenant |
| POST | `/api/v1/coa/accounts` | Add tenant account (Level 4 or 5) |
| PUT | `/api/v1/coa/accounts/:id` | Update account name/status |

### Compliance

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/compliance/products` | All products + compliance status |
| PUT | `/api/v1/compliance/products/:id` | Update compliance data |
| GET | `/api/v1/compliance/expiring` | Products with expiring certs (60-day window) |

---

## 13. Success Metrics

| Metric | Target |
|---|---|
| Onboarding completion rate | ≥ 85% of sign-ups complete onboarding |
| Time to first product added | ≤ 5 minutes after onboarding |
| CSV import success rate | ≥ 90% of rows import without error |
| Low-stock alert accuracy | ≤ 5% false positives |
| COA seeding time | < 2 seconds on tenant creation |
| Compliance alert lead time | 60-day advance warning before cert expiry |
| API response time (product list) | ≤ 200ms (p95) |
| Multi-tenant isolation test | Zero cross-tenant data exposure in security audit |
