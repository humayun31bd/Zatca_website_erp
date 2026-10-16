tenant onboarding workflow
- user lands on website
- user signs up
- user gets an email with a link to the tenant onboarding page
- tenant onboarding page asks for information about the tenant
- tenant information is saved to the database
- tenant is created and ready to use the ERP
- tenant busuness type 
    Retail
        Convenience stores, mini-marts, pharmacies
        Clothing, footwear, accessories
        Electronics and mobile phone shops
        Specialty/boutique stores (gifts, books, crafts)
    Food & Beverage (F&B)
        Restaurants and cafes
        Fast food and takeaway counters
        Bakeries and dessert shops
        Kiosks/food stalls
    Services
        Salons, spas, barbershops
        Tailoring and laundry services
        Repair shops (electronics, shoes, tailoring)
        Tutoring/coaching centers
    Professional/Office-based SMEs
        Small consultancies (accounting, legal, marketing)
        Real estate agencies
        IT/software service providers
        Co-working or shared office tenants
    Healthcare & Wellness
        Clinics, diagnostic centers
        Pharmacies
        Fitness studios, gyms
    Trade & Light Manufacturing
        Small workshops (carpentry, tailoring units)
        Wholesale/distribution outlets
        Print and packaging shops
    E-commerce/Warehouse-linked
        Small fulfillment or storage units
        Dark stores (for quick delivery businesses)

Standard **CSV product import process** for retail tenants (e.g., in a multi-tenant marketplace or SaaS platform):

## 1. CSV Template Structure

Provide tenants a downloadable template with required and optional columns:

| Column | Required | Notes |
|---|---|---|
| SKU | Yes | Unique per tenant |
| Product Name | Yes | Max 150 chars |
| Category | Yes | Must match predefined taxonomy |
| Sub-category | No | |
| Description | No | |
| Price | Yes | Numeric, 2 decimals |
| Discounted Price | No | Must be ≤ Price |
| Stock Quantity | Yes | Integer, ≥ 0 |
| Unit | No | pcs, kg, box, etc. |
| Barcode/UPC | No | |
| Brand | No | |
| Image URL(s) | No | Comma-separated, publicly accessible |
| Tax Category | No | Defaults to standard rate |
| Status | No | Active/Inactive, defaults Active |

## 2. Upload Flow

1. **Tenant selects business type** (Retail) → system loads the retail-specific template/field set (retail may need Size/Color/Variant fields vs. F&B needing Ingredients/Allergens).
    
2. **File upload** — accept `.csv`, size limit (e.g., 5MB / 5,000 rows), UTF-8 encoding. Download products excell sheet for preformated products columns, excel template should have sample rows. 

3. **Pre-validation pass** (before committing):
   - Header row matches expected columns
   - Required fields not empty
   - Data type checks (price numeric, stock integer)
   - Duplicate SKU detection (within file and against existing catalog)
   - Category validation against system taxonomy
4. **Preview screen** — show parsed rows with flagged errors/warnings before final import (e.g., "Row 12: missing price", "Row 45: duplicate SKU").
5. **Tenant fixes or confirms** — option to download an error report, fix in CSV, re-upload, or proceed with only valid rows.
6. **Commit import** — valid rows inserted/updated; invalid rows skipped and logged.
7. **Post-import summary** — X products added, Y updated, Z failed, with downloadable error log.

## 3. Validation Rules (Retail-specific)
- SKU uniqueness per tenant
- Price > 0
- Stock ≥ 0
- Category must exist in system (or auto-suggest closest match)
- Image URLs checked for valid format/reachability (optional async check)

## 4. Error Handling
- Row-level errors don't block the whole file — only failed rows are rejected
- Clear error messages tied to row/column
- Option to re-import just the corrected rows

## 5. Post-Import
- Products go to "Pending Review" or "Live" depending on platform rules (some marketplaces require admin approval before listing)
- Notify tenant via email/dashboard notification of import result

Here's the **product/inventory structure** spanning Tenant → Branch/Warehouse, designed for mini-mart SKUs (a single catalog, stock tracked separately per location).

## Design Logic

- **Product catalog is tenant-level** (one SKU record, not duplicated per branch) — a can of Coke is the same product everywhere; only **stock quantity** and (optionally) **price** vary by location.
- **Warehouses and Branches are both "stock locations"** — a warehouse holds bulk stock and pushes it to branches via transfers; a branch sells directly to customers. Both need inventory tracking, so they share the same inventory table structure but stay in separate tables since their business attributes differ (a warehouse doesn't need a POS terminal; a branch does).
- **Inventory quantity is a separate table**, keyed by (product, location) — this is what lets the same product exist with different stock levels at Branch A, Branch B, and the central Warehouse simultaneously.**Structure summary:**

| Table | Level | Purpose |
|---|---|---|
| `product_category` | Tenant | Organize SKUs (Beverages, Snacks, etc.) |
| `product` | Tenant | **One record per SKU** — name, barcode, base price, cost |
| `warehouse` | Tenant | Bulk stock holding location, no POS |
| `outlet` (from earlier) | Tenant | Customer-facing branch |
| `inventory` | Branch/Warehouse | **Quantity per location** — same product_id, different row per location |
| `stock_transfer` + lines | — | Moves stock between warehouse ↔ branch, tracked with status |

**Key mechanics:**
- A product is created **once**; every branch and warehouse gets its own `inventory` row referencing that same `product_id` — so stock counts differ, but the SKU, barcode, and base price stay centrally managed.
- `local_selling_price` lets a branch override the default price (e.g., a branch in a pricier location charges more) — if left `NULL`, it falls back to `product.base_selling_price`.
- `stock_transfer` handles warehouse-to-branch restocking, and the same table also supports branch-to-branch transfers if you ever need that.
- Query `(b)` gives you a ready-made **low-stock alert across all branches**, and `(c)` gives total stock visibility company-wide — both common mini-mart operational needs.

One thing worth deciding: do you want **cost_price** (and therefore COGS) tracked centrally per product, or does cost vary by which warehouse/supplier it came from (e.g., different purchase batches at different prices)? If costs vary by batch, you'd want a lightweight **stock lot/batch table** layered on top of `inventory` — let me know if that applies to your mini-marts.

-- ============================================================
-- MINI-MART PRODUCT + MULTI-LOCATION INVENTORY SCHEMA
-- Tenant -> Branch/Warehouse, single catalog, per-location stock
-- ============================================================

-- ------------------------------------------------------------
-- 1. PRODUCT CATEGORY (tenant-level, self-referencing for sub-cats)
-- ------------------------------------------------------------

CREATE TABLE product_category (
    category_id      BIGSERIAL PRIMARY KEY,
    tenant_id         BIGINT NOT NULL REFERENCES tenant(tenant_id),
    parent_category_id BIGINT NULL REFERENCES product_category(category_id),
    category_name     VARCHAR(100) NOT NULL,       -- e.g. 'Beverages', 'Snacks', 'Household'
    is_active         BOOLEAN DEFAULT TRUE
);

-- ------------------------------------------------------------
-- 2. PRODUCT (tenant-level master catalog - ONE record per SKU,
--    regardless of how many branches/warehouses stock it)
-- ------------------------------------------------------------

CREATE TABLE product (
    product_id        BIGSERIAL PRIMARY KEY,
    tenant_id          BIGINT NOT NULL REFERENCES tenant(tenant_id),
    category_id        BIGINT REFERENCES product_category(category_id),

    sku                VARCHAR(50) NOT NULL,
    barcode            VARCHAR(50),
    product_name       VARCHAR(150) NOT NULL,
    brand              VARCHAR(100),

    unit               VARCHAR(20) DEFAULT 'pcs',   -- pcs, kg, box, litre, pack
    pack_size          NUMERIC(10,3),                -- e.g. 0.5 (litre), 24 (pcs per carton)

    cost_price         NUMERIC(14,2) DEFAULT 0,      -- default purchase cost (can be overridden per location)
    base_selling_price NUMERIC(14,2) NOT NULL,       -- default retail price
    tax_category       VARCHAR(30) DEFAULT 'STANDARD',

    is_active          BOOLEAN DEFAULT TRUE,
    created_at         TIMESTAMP DEFAULT now(),
    updated_at         TIMESTAMP DEFAULT now(),

    CONSTRAINT uq_product_sku UNIQUE (tenant_id, sku)
);

CREATE INDEX idx_product_category ON product(category_id);
CREATE INDEX idx_product_barcode ON product(barcode);

-- ------------------------------------------------------------
-- 3. WAREHOUSE (separate from branch/outlet - bulk stock holding,
--    no POS/customer-facing function)
-- ------------------------------------------------------------

CREATE TABLE warehouse (
    warehouse_id      BIGSERIAL PRIMARY KEY,
    tenant_id          BIGINT NOT NULL REFERENCES tenant(tenant_id),
    warehouse_name     VARCHAR(150) NOT NULL,
    address            VARCHAR(255),
    is_active          BOOLEAN DEFAULT TRUE
);

-- NOTE: 'outlet' table (branch) already exists from earlier schema.
-- Both 'outlet' and 'warehouse' are valid stock-holding locations.

-- ------------------------------------------------------------
-- 4. INVENTORY (per-location stock - the table that actually
--    varies by branch/warehouse, while product stays constant)
-- ------------------------------------------------------------

CREATE TABLE inventory (
    inventory_id       BIGSERIAL PRIMARY KEY,
    product_id          BIGINT NOT NULL REFERENCES product(product_id),

    location_type       VARCHAR(10) NOT NULL CHECK (location_type IN ('BRANCH','WAREHOUSE')),
    outlet_id            BIGINT NULL REFERENCES outlet(outlet_id),        -- set if location_type='BRANCH'
    warehouse_id          BIGINT NULL REFERENCES warehouse(warehouse_id),   -- set if location_type='WAREHOUSE'

    quantity_on_hand     NUMERIC(14,3) NOT NULL DEFAULT 0,
    reorder_level        NUMERIC(14,3) DEFAULT 0,        -- trigger restock alert below this
    reorder_qty          NUMERIC(14,3) DEFAULT 0,        -- suggested restock quantity

    -- Optional per-location price override (e.g. Branch A sells slightly higher)
    local_selling_price   NUMERIC(14,2) NULL,

    last_updated          TIMESTAMP DEFAULT now(),

    CHECK (
        (location_type = 'BRANCH' AND outlet_id IS NOT NULL AND warehouse_id IS NULL) OR
        (location_type = 'WAREHOUSE' AND warehouse_id IS NOT NULL AND outlet_id IS NULL)
    ),
    CONSTRAINT uq_inventory_location UNIQUE (product_id, location_type, outlet_id, warehouse_id)
);

CREATE INDEX idx_inv_product   ON inventory(product_id);
CREATE INDEX idx_inv_outlet    ON inventory(outlet_id);
CREATE INDEX idx_inv_warehouse ON inventory(warehouse_id);

-- ------------------------------------------------------------
-- 5. STOCK TRANSFER (Warehouse -> Branch, or Branch -> Branch)
-- ------------------------------------------------------------

CREATE TABLE stock_transfer (
    transfer_id        BIGSERIAL PRIMARY KEY,
    tenant_id           BIGINT NOT NULL REFERENCES tenant(tenant_id),
    transfer_date        DATE NOT NULL,
    reference_no          VARCHAR(50),

    from_location_type    VARCHAR(10) NOT NULL CHECK (from_location_type IN ('BRANCH','WAREHOUSE')),
    from_outlet_id         BIGINT NULL REFERENCES outlet(outlet_id),
    from_warehouse_id       BIGINT NULL REFERENCES warehouse(warehouse_id),

    to_location_type       BIGINT,  -- corrected below
    status                  VARCHAR(20) DEFAULT 'PENDING'  -- PENDING, IN_TRANSIT, RECEIVED, CANCELLED
);

-- Fix: to_location_type should be VARCHAR, not BIGINT (typo correction)
ALTER TABLE stock_transfer ALTER COLUMN to_location_type TYPE VARCHAR(10);
ALTER TABLE stock_transfer ADD CONSTRAINT chk_to_location_type CHECK (to_location_type IN ('BRANCH','WAREHOUSE'));
ALTER TABLE stock_transfer ADD COLUMN to_outlet_id BIGINT NULL REFERENCES outlet(outlet_id);
ALTER TABLE stock_transfer ADD COLUMN to_warehouse_id BIGINT NULL REFERENCES warehouse(warehouse_id);

CREATE TABLE stock_transfer_line (
    line_id            BIGSERIAL PRIMARY KEY,
    transfer_id          BIGINT NOT NULL REFERENCES stock_transfer(transfer_id) ON DELETE CASCADE,
    product_id            BIGINT NOT NULL REFERENCES product(product_id),
    quantity              NUMERIC(14,3) NOT NULL,
    unit_cost             NUMERIC(14,2)
);

-- ------------------------------------------------------------
-- 6. SAMPLE DATA
-- ------------------------------------------------------------

-- One product, defined once at tenant level
INSERT INTO product (product_id, tenant_id, category_id, sku, barcode, product_name, brand, unit, base_selling_price)
VALUES (1, 101, NULL, 'SKU-COKE-500ML', '8901234567890', 'Coca-Cola 500ml', 'Coca-Cola', 'pcs', 60.00);

-- Central warehouse stock
INSERT INTO warehouse (warehouse_id, tenant_id, warehouse_name) VALUES (1, 101, 'Central Warehouse');
INSERT INTO inventory (product_id, location_type, warehouse_id, quantity_on_hand, reorder_level)
VALUES (1, 'WAREHOUSE', 1, 5000, 500);

-- Branch A stock (same product, different quantity, same or overridden price)
INSERT INTO inventory (product_id, location_type, outlet_id, quantity_on_hand, reorder_level, local_selling_price)
VALUES (1, 'BRANCH', 1, 120, 20, 65.00);  -- Branch A sells slightly higher

-- Branch B stock
INSERT INTO inventory (product_id, location_type, outlet_id, quantity_on_hand, reorder_level)
VALUES (1, 'BRANCH', 2, 45, 20);   -- uses base_selling_price (no override)

-- ------------------------------------------------------------
-- 7. USEFUL QUERIES
-- ------------------------------------------------------------

-- (a) Stock levels for one product across ALL locations (branches + warehouses)
SELECT
    p.product_name,
    inv.location_type,
    COALESCE(o.outlet_name, w.warehouse_name) AS location_name,
    inv.quantity_on_hand,
    inv.reorder_level,
    COALESCE(inv.local_selling_price, p.base_selling_price) AS effective_price
FROM inventory inv
JOIN product p ON inv.product_id = p.product_id
LEFT JOIN outlet o ON inv.outlet_id = o.outlet_id
LEFT JOIN warehouse w ON inv.warehouse_id = w.warehouse_id
WHERE p.product_id = 1
ORDER BY inv.location_type, location_name;

-- (b) Low-stock alert across all branches (for restock planning)
SELECT
    p.product_name,
    o.outlet_name,
    inv.quantity_on_hand,
    inv.reorder_level,
    inv.reorder_qty
FROM inventory inv
JOIN product p ON inv.product_id = p.product_id
JOIN outlet o ON inv.outlet_id = o.outlet_id
WHERE inv.location_type = 'BRANCH'
  AND inv.quantity_on_hand <= inv.reorder_level
ORDER BY o.outlet_name, p.product_name;

-- (c) Total stock across the whole tenant (all branches + warehouses combined)
SELECT
    p.product_name,
    SUM(inv.quantity_on_hand) AS total_stock_all_locations
FROM inventory inv
JOIN product p ON inv.product_id = p.product_id
WHERE p.tenant_id = 101
GROUP BY p.product_name;

-- (d) Products never stocked at a specific branch (catalog gap check)
SELECT p.product_id, p.product_name
FROM product p
WHERE p.tenant_id = 101
  AND NOT EXISTS (
      SELECT 1 FROM inventory inv
      WHERE inv.product_id = p.product_id
        AND inv.outlet_id = 1   -- Branch A
  );

  This is a great catch — since the user is Dhaka-based, note that Bangladesh's National Equipment Identity Register (NEIR) — which verifies every mobile handset's legal import/manufacture status — launched on 1 January 2026, replacing the older NAID system. This makes IMEI-level compliance tracking a real, current requirement for any Bangladeshi mobile shop's product schema, not just theoretical. I've built that in below.

## Why Electronics/Mobile products need a different table shape

Unlike mini-mart FMCG items (tracked by quantity only), electronics need:
- **Per-unit serial/IMEI tracking** — each phone is individually identifiable, not just counted
- **Warranty tracking** per unit, not per SKU
- **Regulatory compliance fields** — BTRC NOC/IMEI registration status, HS code for customs, country of origin
- **Variant handling** — same model, different color/storage/RAM combos are technically different SKUs**Key structural change vs. the mini-mart schema:** electronics need a **`product_unit`** table — one row per *physical device* (with its own serial/IMEI), sitting below `product` (one row per *model+variant*). This is the critical difference: a mini-mart just needs "quantity = 45," but a phone shop needs to know exactly *which* unit sold, its IMEI, and its individual warranty clock.

**Compliance highlights relevant to a Bangladesh mobile shop:**
- **`is_btrc_regulated` + `neir_status`** — tracks each unit's registration status in BTRC's National Equipment Identity Register, which fully launched 1 January 2026 and blocks network access for unregistered/illegally-imported handsets. Query (b) gives you a ready compliance audit list of units still pending registration — this is now an operational necessity, not optional.
- **`hs_code` / `country_of_origin` / `import_permit_no`** — standard customs documentation needed at import.
- **`rohs_compliant` / `battery_un38_3_certified`** — safety/environmental certs increasingly required by distributors and for cross-border shipping of lithium batteries.
- **Per-unit warranty** (`warranty_start_date`/`warranty_end_date`) — since warranty clock starts at sale, not at stock arrival, this has to live on the unit, not the product.

One open question: do you want **accessories** (cases, chargers, cables) to skip serial tracking entirely? I set `requires_serial_tracking` as a flag on `product` so you can toggle per-SKU — accessories would just use the simple `inventory` quantity table from before, while phones/tablets use `product_unit`. Let me know if that split matches how you want to run it.

-- ============================================================
-- ELECTRONICS & MOBILE PHONE SHOP - PRODUCT SCHEMA
-- Adds: serial/IMEI-level tracking, warranty, compliance fields
-- (BTRC NEIR/IMEI registration, customs HS code, RoHS, etc.)
-- ============================================================

-- ------------------------------------------------------------
-- 1. PRODUCT (tenant-level catalog - one record per MODEL+VARIANT,
--    e.g. "iPhone 15, 128GB, Black" is a distinct SKU from
--    "iPhone 15, 256GB, Black")
-- ------------------------------------------------------------

CREATE TABLE product (
    product_id          BIGSERIAL PRIMARY KEY,
    tenant_id            BIGINT NOT NULL REFERENCES tenant(tenant_id),
    category_id           BIGINT REFERENCES product_category(category_id),

    sku                  VARCHAR(50) NOT NULL,
    brand                 VARCHAR(100) NOT NULL,       -- Samsung, Apple, Xiaomi
    model_name             VARCHAR(150) NOT NULL,       -- 'Galaxy A55', 'iPhone 15'
    model_number            VARCHAR(100),                -- manufacturer's internal model code (e.g. SM-A556E)

    -- Variant attributes (electronics-specific)
    color                    VARCHAR(50),
    storage_capacity          VARCHAR(20),               -- '128GB', '256GB'
    ram                        VARCHAR(20),                -- '8GB'

    unit                        VARCHAR(20) DEFAULT 'pcs',
    cost_price                   NUMERIC(14,2) DEFAULT 0,
    base_selling_price            NUMERIC(14,2) NOT NULL,
    tax_category                   VARCHAR(30) DEFAULT 'STANDARD',

    warranty_months                 SMALLINT DEFAULT 12,       -- manufacturer warranty period
    requires_serial_tracking          BOOLEAN DEFAULT TRUE,     -- TRUE for phones/electronics, FALSE for accessories

    is_active                          BOOLEAN DEFAULT TRUE,
    created_at                           TIMESTAMP DEFAULT now(),
    updated_at                            TIMESTAMP DEFAULT now(),

    CONSTRAINT uq_product_sku UNIQUE (tenant_id, sku)
);

-- ------------------------------------------------------------
-- 2. PRODUCT COMPLIANCE (regulatory fields - separated from core
--    product info so compliance can be tracked/audited independently)
-- ------------------------------------------------------------

CREATE TABLE product_compliance (
    product_id            BIGINT PRIMARY KEY REFERENCES product(product_id),

    -- Customs / import
    hs_code                 VARCHAR(20),                -- Harmonized System code for customs classification
    country_of_origin         VARCHAR(100),
    import_permit_no            VARCHAR(100),

    -- Bangladesh-specific: BTRC NEIR (mobile handsets only)
    is_btrc_regulated             BOOLEAN DEFAULT FALSE,   -- TRUE for mobile phones/tablets with SIM
    btrc_noc_number                 VARCHAR(100),            -- No Objection Certificate ref, issued to importer
    btrc_import_batch_ref             VARCHAR(100),           -- Batch submission reference to NEIR

    -- General product safety/environmental compliance
    rohs_compliant                     BOOLEAN,               -- Restriction of Hazardous Substances
    battery_un38_3_certified            BOOLEAN,              -- Lithium battery transport safety cert

    certificate_expiry                    DATE,
    compliance_notes                        TEXT,
    last_verified_at                          TIMESTAMP DEFAULT now()
);

-- ------------------------------------------------------------
-- 3. PRODUCT SERIAL / IMEI (per-unit tracking - THIS is what
--    distinguishes electronics from FMCG inventory)
-- ------------------------------------------------------------

CREATE TABLE product_unit (
    unit_id               BIGSERIAL PRIMARY KEY,
    product_id             BIGINT NOT NULL REFERENCES product(product_id),
    tenant_id                BIGINT NOT NULL REFERENCES tenant(tenant_id),

    serial_number             VARCHAR(100),               -- manufacturer serial number
    imei_1                      VARCHAR(20),               -- primary IMEI (phones/tablets with SIM)
    imei_2                        VARCHAR(20),             -- dual-SIM secondary IMEI, if applicable

    -- BTRC NEIR status for THIS specific unit (not the whole SKU)
    neir_status                    VARCHAR(20) DEFAULT 'PENDING'
                                    CHECK (neir_status IN ('PENDING','REGISTERED','FLAGGED','NOT_APPLICABLE')),
    neir_registered_at               TIMESTAMP,

    -- Location + lifecycle
    location_type                     VARCHAR(10) CHECK (location_type IN ('BRANCH','WAREHOUSE')),
    outlet_id                           BIGINT NULL REFERENCES outlet(outlet_id),
    warehouse_id                          BIGINT NULL REFERENCES warehouse(warehouse_id),

    status                                VARCHAR(20) DEFAULT 'IN_STOCK'
                                          CHECK (status IN ('IN_STOCK','SOLD','RETURNED','DEFECTIVE','TRANSFERRED')),

    purchase_cost                          NUMERIC(14,2),      -- actual cost for this specific unit/batch
    received_date                            DATE,

    -- Warranty (per-unit, since warranty start depends on sale date)
    warranty_start_date                       DATE,
    warranty_end_date                           DATE,
    sold_to_customer_id                          BIGINT NULL REFERENCES customer(customer_id),
    sold_date                                     DATE,

    CONSTRAINT uq_imei_1 UNIQUE (imei_1),
    CONSTRAINT uq_serial_per_tenant UNIQUE (tenant_id, serial_number)
);

CREATE INDEX idx_unit_product   ON product_unit(product_id);
CREATE INDEX idx_unit_imei      ON product_unit(imei_1);
CREATE INDEX idx_unit_status    ON product_unit(status);
CREATE INDEX idx_unit_neir      ON product_unit(neir_status);

-- ------------------------------------------------------------
-- 4. SAMPLE DATA
-- ------------------------------------------------------------

INSERT INTO product (product_id, tenant_id, sku, brand, model_name, model_number, color, storage_capacity, ram, base_selling_price, warranty_months)
VALUES (1, 101, 'MOB-SGA55-128-BLK', 'Samsung', 'Galaxy A55', 'SM-A556E', 'Black', '128GB', '8GB', 42000.00, 12);

INSERT INTO product_compliance (product_id, hs_code, country_of_origin, is_btrc_regulated, rohs_compliant, battery_un38_3_certified)
VALUES (1, '8517.12.00', 'Vietnam', TRUE, TRUE, TRUE);

-- Two physical units of the same SKU, each with its own IMEI + warranty
INSERT INTO product_unit (product_id, tenant_id, serial_number, imei_1, neir_status, location_type, outlet_id, status, received_date)
VALUES (1, 101, 'SN-A55-00123', '351234567890123', 'REGISTERED', 'BRANCH', 1, 'IN_STOCK', '2026-09-01');

INSERT INTO product_unit (product_id, tenant_id, serial_number, imei_1, neir_status, location_type, outlet_id, status, received_date)
VALUES (1, 101, 'SN-A55-00124', '351234567890124', 'PENDING', 'BRANCH', 1, 'IN_STOCK', '2026-09-01');

-- ------------------------------------------------------------
-- 5. USEFUL QUERIES
-- ------------------------------------------------------------

-- (a) All units of a model still in stock, with NEIR compliance status
SELECT
    p.model_name, p.color, p.storage_capacity,
    pu.imei_1, pu.neir_status, pu.status, o.outlet_name
FROM product_unit pu
JOIN product p ON pu.product_id = p.product_id
LEFT JOIN outlet o ON pu.outlet_id = o.outlet_id
WHERE pu.status = 'IN_STOCK'
ORDER BY p.model_name;

-- (b) Compliance audit: units NOT yet NEIR-registered (risk/action list)
SELECT p.model_name, pu.imei_1, pu.serial_number, pu.received_date, o.outlet_name
FROM product_unit pu
JOIN product p ON pu.product_id = p.product_id
LEFT JOIN outlet o ON pu.outlet_id = o.outlet_id
WHERE pu.neir_status = 'PENDING'
ORDER BY pu.received_date;

-- (c) Warranty lookup by IMEI (for after-sales/service desk)
SELECT p.model_name, pu.imei_1, pu.warranty_start_date, pu.warranty_end_date,
       CASE WHEN pu.warranty_end_date >= CURRENT_DATE THEN 'ACTIVE' ELSE 'EXPIRED' END AS warranty_status
FROM product_unit pu
JOIN product p ON pu.product_id = p.product_id
WHERE pu.imei_1 = '351234567890123';

-- (d) Compliance certificate expiry check (import permits, etc.)
SELECT p.model_name, pc.import_permit_no, pc.certificate_expiry
FROM product_compliance pc
JOIN product p ON pc.product_id = p.product_id
WHERE pc.certificate_expiry <= CURRENT_DATE + INTERVAL '30 days';

Saudi Arabia has a distinctly different compliance regime from Bangladesh's BTRC/NEIR system — it's built around **SASO's SABER platform** (product certification) plus **CST (Communications, Space & Technology Commission, formerly CITC)** type approval for the radio/telecom component of phones. Both apply to mobile phones since they contain wireless radios.

## Key KSA-specific requirements for mobile/electronics products

- **SABER — Product Certificate of Conformity (PCoC)**: one certificate per product model, required before any import
- **SABER — Shipment Certificate of Conformity (SCoC)**: a *separate* certificate required for **every individual shipment**, validated against the PCoC — this is shipment-level, not product-level
- **12-digit HS code**: Saudi customs now requires a longer HS code than the standard international 6–10 digit code
- **CST Type Approval (TA number)**: mandatory for any device with radio/wireless capability (phones, tablets), renewed periodically
- **CST E-Label**: phones/tablets with a display must have the type-approval number embedded in device software as proof of compliance
- **RoHS compliance**: required as part of SASO technical regulations**Why this splits into two tables (unlike the Bangladesh version):**

| Table | Level | Because |
|---|---|---|
| `product_compliance_ksa` | Per product **model** | PCoC + CST Type Approval are certified **once per model** and reused across all shipments |
| `import_shipment_ksa` | Per **shipment** | SABER requires a **new SCoC for every shipment**, even of an already-certified product — this is the critical difference from Bangladesh's BTRC, where compliance is checked per-unit (IMEI) rather than per-shipment |

**Fields worth flagging:**
- **`e_label_embedded`** — CST requires the Type Approval number to be embedded in the device's own software (not just a physical sticker), so this is something your supplier/importer confirms, not something you print in-house.
- **`local_representative_name`** — foreign manufacturers typically need a KSA-based representative on file for CST certification; useful to track per product if you import directly.
- Query (a) gives you a **renewal alert** for PCoC/Type Approval before they lapse — both carry fixed validity windows (PCoC ~2 years, Type Approval ~12–24 months), so this table earns its keep as an operational compliance dashboard, not just static records.

One thing to check with your customs broker: whether you're importing as the **manufacturer's authorized distributor** (who may already hold the PCoC/TA) versus importing independently (where you'd need to obtain these yourself) — that affects who "owns" the certificate numbers in this table. Also worth deciding: do you want **VAT (15%)** and Zakat-related fields added here too, or handled purely in your accounting/COA layer from earlier?

-- ============================================================
-- ELECTRONICS & MOBILE PHONE SHOP - SAUDI ARABIA COMPLIANCE
-- SABER (SASO) product + shipment certification, CST type
-- approval, 12-digit HS code, RoHS
-- ============================================================

-- ------------------------------------------------------------
-- 1. PRODUCT COMPLIANCE - KSA (one record per product MODEL,
--    since PCoC and Type Approval are issued per model, not per unit)
-- ------------------------------------------------------------

CREATE TABLE product_compliance_ksa (
    product_id                 BIGINT PRIMARY KEY REFERENCES product(product_id),

    -- Customs classification
    hs_code_12digit              VARCHAR(20) NOT NULL,     -- Saudi Customs requires 12-digit HS code
    country_of_origin              VARCHAR(100),

    -- SABER / SASO - Product Certificate of Conformity (product-level, one-time per model)
    saber_pcoc_number                VARCHAR(100),           -- Product Certificate of Conformity ref
    pcoc_issue_date                    DATE,
    pcoc_expiry_date                     DATE,
    conformity_assessment_body             VARCHAR(150),      -- SASO-accredited CAB that issued it (e.g. QIMA, HQTS)

    -- CST (formerly CITC) - Type Approval (mandatory for radio/wireless devices)
    cst_type_approval_no                   VARCHAR(50),       -- format: TA xxxx-y
    cst_ta_issue_date                        DATE,
    cst_ta_expiry_date                         DATE,           -- typically 12-24 months validity
    e_label_embedded                             BOOLEAN DEFAULT FALSE,  -- TA number embedded in device software

    -- Safety / environmental
    rohs_compliant                                 BOOLEAN,
    local_representative_name                        VARCHAR(150),  -- KSA-based rep, often required for foreign manufacturers

    compliance_status                                  VARCHAR(20) DEFAULT 'PENDING'
                                                        CHECK (compliance_status IN ('PENDING','APPROVED','EXPIRED','REJECTED')),
    compliance_notes                                     TEXT,
    last_verified_at                                       TIMESTAMP DEFAULT now()
);

-- ------------------------------------------------------------
-- 2. IMPORT SHIPMENT - SHIPMENT CERTIFICATE OF CONFORMITY (SCoC)
--    SABER requires a NEW certificate for EVERY shipment, validated
--    against the product's existing PCoC. This is shipment-level,
--    not product-level, so it needs its own table.
-- ------------------------------------------------------------

CREATE TABLE import_shipment_ksa (
    shipment_id             BIGSERIAL PRIMARY KEY,
    tenant_id                 BIGINT NOT NULL REFERENCES tenant(tenant_id),
    product_id                  BIGINT NOT NULL REFERENCES product(product_id),

    saber_scoc_number              VARCHAR(100) NOT NULL,   -- Shipment Certificate of Conformity ref
    scoc_issue_date                  DATE,
    linked_pcoc_number                 VARCHAR(100),          -- must match product_compliance_ksa.saber_pcoc_number

    quantity_imported                    NUMERIC(14,3) NOT NULL,
    customs_declaration_no                 VARCHAR(100),
    port_of_entry                            VARCHAR(100),      -- e.g. 'Jeddah Islamic Port', 'King Abdulaziz Airport'
    arrival_date                               DATE,

    fasah_reference                              VARCHAR(100),  -- FASAH is the customs system SABER auto-links to

    status                                         VARCHAR(20) DEFAULT 'PENDING'
                                                    CHECK (status IN ('PENDING','CLEARED','REJECTED','RE_EXPORTED'))
);

CREATE INDEX idx_shipment_product ON import_shipment_ksa(product_id);
CREATE INDEX idx_shipment_status  ON import_shipment_ksa(status);

-- ------------------------------------------------------------
-- 3. SAMPLE DATA
-- ------------------------------------------------------------

-- Product-level KSA compliance (one-time certification for this model)
INSERT INTO product_compliance_ksa (
    product_id, hs_code_12digit, country_of_origin,
    saber_pcoc_number, pcoc_issue_date, pcoc_expiry_date, conformity_assessment_body,
    cst_type_approval_no, cst_ta_issue_date, cst_ta_expiry_date, e_label_embedded,
    rohs_compliant, local_representative_name, compliance_status
)
VALUES (
    1, '851712009000', 'Vietnam',
    'PCOC-2026-KSA-004521', '2026-02-10', '2028-02-10', 'QIMA',
    'TA 3312-A', '2026-02-15', '2027-02-15', TRUE,
    TRUE, 'Al-Rajhi Trading Est.', 'APPROVED'
);

-- Shipment-level certificate (needed again for the NEXT shipment of the same product)
INSERT INTO import_shipment_ksa (
    tenant_id, product_id, saber_scoc_number, scoc_issue_date, linked_pcoc_number,
    quantity_imported, customs_declaration_no, port_of_entry, arrival_date, status
)
VALUES (
    101, 1, 'SCOC-2026-0091823', '2026-09-20', 'PCOC-2026-KSA-004521',
    500, 'CD-KSA-778821', 'Jeddah Islamic Port', '2026-09-25', 'CLEARED'
);

-- ------------------------------------------------------------
-- 4. USEFUL QUERIES
-- ------------------------------------------------------------

-- (a) Products with expiring PCoC or Type Approval (renewal action list)
SELECT
    p.model_name, p.brand,
    pc.saber_pcoc_number, pc.pcoc_expiry_date,
    pc.cst_type_approval_no, pc.cst_ta_expiry_date
FROM product_compliance_ksa pc
JOIN product p ON pc.product_id = p.product_id
WHERE pc.pcoc_expiry_date <= CURRENT_DATE + INTERVAL '60 days'
   OR pc.cst_ta_expiry_date <= CURRENT_DATE + INTERVAL '60 days';

-- (b) Shipments pending SCoC / customs clearance
SELECT p.model_name, s.saber_scoc_number, s.customs_declaration_no, s.status, s.arrival_date
FROM import_shipment_ksa s
JOIN product p ON s.product_id = p.product_id
WHERE s.status = 'PENDING'
ORDER BY s.arrival_date;

-- (c) Full compliance snapshot for one product (before listing it for sale)
SELECT
    p.model_name,
    pc.hs_code_12digit,
    pc.saber_pcoc_number,
    pc.cst_type_approval_no,
    pc.e_label_embedded,
    pc.rohs_compliant,
    pc.compliance_status
FROM product_compliance_ksa pc
JOIN product p ON pc.product_id = p.product_id
WHERE p.product_id = 1;

-- (d) Products imported without a valid PCoC on file (compliance gap / risk)
SELECT p.model_name, p.sku
FROM product p
LEFT JOIN product_compliance_ksa pc ON p.product_id = pc.product_id
WHERE pc.product_id IS NULL
   OR pc.compliance_status != 'APPROVED';

Pharmacies in Saudi Arabia sit under a completely different regulator — the **Saudi Food and Drug Authority (SFDA)** — with requirements that don't overlap much with the electronics compliance we just built. The biggest structural difference: pharmacy inventory **must be tracked by batch/lot and expiry date**, not just by product, and increasingly by **individual serialized pack** under SFDA's Drug Track and Trace System (RSD), which SFDA confirmed in January 2026 it's still actively rolling out with the pharmacy sector.

## Key SFDA-specific requirements

- **SFDA drug registration number** — mandatory marketing authorization per product, not optional
- **Batch/lot + expiry tracking** — this is the single most important structural difference from electronics; pharmacy stock is worthless (and illegal to sell) once expired, so expiry has to be trackable per batch, not per SKU
- **RSD serialization** — SFDA's track-and-trace system requires unique serial numbers on packs, with aggregation up to carton/pallet level, so recalls can trace exactly which units went where
- **Controlled substance scheduling** — narcotics/psychotropics need extra licensing and restricted sale logic
- **Labeling rules** — e.g., generic name must display at ≥50% the size of the trade name, to prevent medication-name confusion**Structural pattern, three levels deep:**

| Table | Level | Why |
|---|---|---|
| `product` | Drug product | One row per trade name + strength + dosage form |
| `product_compliance_sfda` | Per product | SFDA registration is issued once per drug product, reused indefinitely |
| `product_batch` | Per batch | **Every batch has its own expiry date** — the same product can have one batch expiring next month and another expiring in two years, sitting side-by-side on the shelf |
| `drug_serial_unit` | Per pack (optional) | For RSD-enrolled products, each individual pack gets a unique serial, with `parent_serial_id` letting you build the carton→pallet aggregation hierarchy SFDA's system expects |

**Why this matters operationally, not just for compliance:**
- Query **(a)** gives you a near-expiry alert — arguably the single most useful query for a pharmacy, since expired stock is both a financial write-off and an SFDA violation if sold.
- Query **(e)** implements **FEFO (First-Expiry-First-Out)** picking — pharmacies almost universally dispense oldest-expiry stock first, which only works if expiry lives at the batch level, not the product level.
- Query **(b)** is a **recall trace** — if SFDA issues a recall on a specific batch, you can instantly find every serialized unit and which branch it's sitting in.
- **`controlled_substance_schedule`** flags narcotics/psychotropics so your POS/dispensing logic can enforce prescription checks or restricted sale rules separately from ordinary OTC items.

One thing worth deciding: do you want this system to also model **Wasfaty** (Saudi's national e-prescription program) — i.e., a `prescription` table linking a dispensed serial unit to a physician's e-prescription reference — or is that handled by a separate POS/dispensing system that just needs to *read* this product/batch data?

-- ============================================================
-- PHARMACY PRODUCT SCHEMA - SAUDI ARABIA (SFDA COMPLIANCE)
-- Adds: batch/expiry tracking, SFDA registration, RSD serialization,
-- controlled substance scheduling
-- ============================================================

-- ------------------------------------------------------------
-- 1. PRODUCT (tenant-level catalog - one record per DRUG PRODUCT,
--    i.e. same brand+strength+dosage form; batches are tracked separately)
-- ------------------------------------------------------------

CREATE TABLE product (
    product_id             BIGSERIAL PRIMARY KEY,
    tenant_id                BIGINT NOT NULL REFERENCES tenant(tenant_id),
    category_id                BIGINT REFERENCES product_category(category_id),

    sku                     VARCHAR(50) NOT NULL,
    trade_name                VARCHAR(150) NOT NULL,        -- brand name, e.g. 'Panadol'
    generic_name                VARCHAR(150) NOT NULL,       -- e.g. 'Paracetamol' - must be >=50% size of trade name on label
    active_ingredient              VARCHAR(200),
    strength                          VARCHAR(50),            -- e.g. '500mg'
    dosage_form                        VARCHAR(50),           -- Tablet, Syrup, Injection, Cream

    manufacturer                        VARCHAR(150),
    marketing_authorization_holder        VARCHAR(150),        -- may differ from manufacturer

    unit                                   VARCHAR(20) DEFAULT 'box',
    pack_size                                VARCHAR(50),        -- e.g. '10 tablets/strip, 3 strips/box'

    cost_price                                NUMERIC(14,2) DEFAULT 0,
    base_selling_price                          NUMERIC(14,2) NOT NULL,
    tax_category                                  VARCHAR(30) DEFAULT 'STANDARD',

    -- Dispensing controls
    is_prescription_required                        BOOLEAN DEFAULT FALSE,
    controlled_substance_schedule                     VARCHAR(20),  -- NULL if not controlled; else schedule code (per SFDA classification)
    storage_condition                                   VARCHAR(50), -- 'Room Temp', 'Refrigerated 2-8C', 'Frozen'

    is_active                                             BOOLEAN DEFAULT TRUE,
    created_at                                              TIMESTAMP DEFAULT now(),
    updated_at                                                TIMESTAMP DEFAULT now(),

    CONSTRAINT uq_product_sku UNIQUE (tenant_id, sku)
);

-- ------------------------------------------------------------
-- 2. SFDA COMPLIANCE (per product - registration is per drug product,
--    reused across all batches/shipments of that product)
-- ------------------------------------------------------------

CREATE TABLE product_compliance_sfda (
    product_id                 BIGINT PRIMARY KEY REFERENCES product(product_id),

    sfda_registration_no          VARCHAR(100) NOT NULL,     -- marketing authorization number
    registration_issue_date         DATE,
    registration_expiry_date          DATE,

    gs1_gtin                             VARCHAR(20),          -- Global Trade Item Number (barcode standard SFDA requires)
    local_agent_name                       VARCHAR(150),       -- required for foreign manufacturers
    country_of_origin                        VARCHAR(100),

    rsd_enrolled                               BOOLEAN DEFAULT FALSE,  -- enrolled in Drug Track & Trace System
    compliance_status                            VARCHAR(20) DEFAULT 'PENDING'
                                                  CHECK (compliance_status IN ('PENDING','APPROVED','EXPIRED','SUSPENDED')),
    compliance_notes                               TEXT,
    last_verified_at                                 TIMESTAMP DEFAULT now()
);

-- ------------------------------------------------------------
-- 3. PRODUCT BATCH (THE critical pharmacy-specific table - stock
--    must be tracked by batch+expiry, not just product quantity)
-- ------------------------------------------------------------

CREATE TABLE product_batch (
    batch_id                BIGSERIAL PRIMARY KEY,
    product_id                BIGINT NOT NULL REFERENCES product(product_id),
    tenant_id                   BIGINT NOT NULL REFERENCES tenant(tenant_id),

    batch_number               VARCHAR(100) NOT NULL,          -- manufacturer's lot number
    manufacture_date              DATE,
    expiry_date                     DATE NOT NULL,

    quantity_received                 NUMERIC(14,3) NOT NULL,
    quantity_remaining                  NUMERIC(14,3) NOT NULL,

    location_type                         VARCHAR(10) CHECK (location_type IN ('BRANCH','WAREHOUSE')),
    outlet_id                               BIGINT NULL REFERENCES outlet(outlet_id),
    warehouse_id                              BIGINT NULL REFERENCES warehouse(warehouse_id),

    supplier_id                                 BIGINT NULL REFERENCES supplier(supplier_id),
    received_date                                 DATE,

    status                                          VARCHAR(20) DEFAULT 'ACTIVE'
                                                     CHECK (status IN ('ACTIVE','RECALLED','EXPIRED','QUARANTINED')),

    CONSTRAINT uq_batch_per_product UNIQUE (product_id, batch_number)
);

CREATE INDEX idx_batch_product  ON product_batch(product_id);
CREATE INDEX idx_batch_expiry   ON product_batch(expiry_date);
CREATE INDEX idx_batch_status   ON product_batch(status);

-- ------------------------------------------------------------
-- 4. SERIALIZED UNIT (RSD track-and-trace - unique serial per pack,
--    with aggregation hierarchy up to carton/pallet)
-- ------------------------------------------------------------

CREATE TABLE drug_serial_unit (
    serial_id                BIGSERIAL PRIMARY KEY,
    batch_id                   BIGINT NOT NULL REFERENCES product_batch(batch_id),

    serial_number                 VARCHAR(100) NOT NULL,       -- unique pack-level serial (per RSD spec)
    aggregation_level               VARCHAR(20) DEFAULT 'UNIT'
                                     CHECK (aggregation_level IN ('UNIT','CARTON','PALLET')),
    parent_serial_id                  BIGINT NULL REFERENCES drug_serial_unit(serial_id),  -- carton/pallet hierarchy

    status                               VARCHAR(20) DEFAULT 'IN_STOCK'
                                         CHECK (status IN ('IN_STOCK','DISPENSED','RECALLED','DAMAGED','EXPIRED')),

    dispensed_date                          DATE,
    dispensed_to_customer_id                  BIGINT NULL REFERENCES customer(customer_id),

    CONSTRAINT uq_drug_serial UNIQUE (serial_number)
);

CREATE INDEX idx_serial_batch  ON drug_serial_unit(batch_id);
CREATE INDEX idx_serial_parent ON drug_serial_unit(parent_serial_id);
CREATE INDEX idx_serial_status ON drug_serial_unit(status);

-- ------------------------------------------------------------
-- 5. SAMPLE DATA
-- ------------------------------------------------------------

INSERT INTO product (
    product_id, tenant_id, sku, trade_name, generic_name, active_ingredient, strength, dosage_form,
    manufacturer, base_selling_price, is_prescription_required, controlled_substance_schedule, storage_condition
)
VALUES (
    1, 101, 'PHR-PANADOL-500', 'Panadol', 'Paracetamol', 'Paracetamol', '500mg', 'Tablet',
    'GSK', 12.50, FALSE, NULL, 'Room Temp'
);

INSERT INTO product_compliance_sfda (
    product_id, sfda_registration_no, registration_issue_date, registration_expiry_date,
    gs1_gtin, local_agent_name, country_of_origin, rsd_enrolled, compliance_status
)
VALUES (
    1, 'SFDA-DRG-2019-004821', '2019-03-01', '2029-03-01',
    '06285123456789', 'Saudi Pharmaceutical Agencies Co.', 'Ireland', TRUE, 'APPROVED'
);

INSERT INTO product_batch (
    batch_id, product_id, tenant_id, batch_number, manufacture_date, expiry_date,
    quantity_received, quantity_remaining, location_type, outlet_id, received_date, status
)
VALUES
(1, 1, 101, 'LOT-2026-A118', '2026-01-15', '2028-01-15', 5000, 4200, 'BRANCH', 1, '2026-02-01', 'ACTIVE'),
(2, 1, 101, 'LOT-2025-B902', '2025-06-10', '2027-06-10', 3000, 150,  'BRANCH', 1, '2025-07-01', 'ACTIVE');

INSERT INTO drug_serial_unit (batch_id, serial_number, aggregation_level, status)
VALUES (1, 'SN-PAN500-0000451', 'UNIT', 'IN_STOCK');

-- ------------------------------------------------------------
-- 6. USEFUL QUERIES
-- ------------------------------------------------------------

-- (a) Near-expiry batches (critical pharmacy operation - flag for discount/return before waste)
SELECT
    p.trade_name, p.generic_name, pb.batch_number, pb.expiry_date, pb.quantity_remaining, o.outlet_name
FROM product_batch pb
JOIN product p ON pb.product_id = p.product_id
LEFT JOIN outlet o ON pb.outlet_id = o.outlet_id
WHERE pb.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
  AND pb.status = 'ACTIVE'
ORDER BY pb.expiry_date;

-- (b) Recall trace: find every serialized unit tied to a specific batch
SELECT p.trade_name, pb.batch_number, dsu.serial_number, dsu.status, o.outlet_name
FROM drug_serial_unit dsu
JOIN product_batch pb ON dsu.batch_id = pb.batch_id
JOIN product p ON pb.product_id = p.product_id
LEFT JOIN outlet o ON pb.outlet_id = o.outlet_id
WHERE pb.batch_number = 'LOT-2026-A118';

-- (c) SFDA registration expiry check (renewal planning)
SELECT p.trade_name, pc.sfda_registration_no, pc.registration_expiry_date
FROM product_compliance_sfda pc
JOIN product p ON pc.product_id = p.product_id
WHERE pc.registration_expiry_date <= CURRENT_DATE + INTERVAL '180 days';

-- (d) Controlled substances currently in stock (for restricted-storage/audit reporting)
SELECT p.trade_name, p.controlled_substance_schedule, pb.batch_number, pb.quantity_remaining, o.outlet_name
FROM product_batch pb
JOIN product p ON pb.product_id = p.product_id
LEFT JOIN outlet o ON pb.outlet_id = o.outlet_id
WHERE p.controlled_substance_schedule IS NOT NULL
  AND pb.status = 'ACTIVE';

-- (e) FEFO (First-Expiry-First-Out) pick order for dispensing - standard pharmacy practice
SELECT p.trade_name, pb.batch_number, pb.expiry_date, pb.quantity_remaining
FROM product_batch pb
JOIN product p ON pb.product_id = p.product_id
WHERE p.product_id = 1 AND pb.status = 'ACTIVE' AND pb.quantity_remaining > 0
ORDER BY pb.expiry_date ASC;

Apparel falls under **SASO's Textile Technical Regulation** (for anything ≥80% textile fiber) or a separate **Leather Products regulation**, and footwear has its own rules again — plus there's a distinct compliance dimension here that didn't apply to electronics or pharma: **content/labeling review against public morals**, since Saudi regulation explicitly requires that "products, their images, and packaging" not violate public law and Islamic values.

## Key differences from the previous schemas

- **Certification tier depends on product type**: children's wear and underwear require the stricter **Type 3** (lab testing + factory audit); everything else gets **Type 1a** (testing only)
- **PCoC validity is 1 year** (vs. ~2 years for electronics) — shorter renewal cycle
- **Chemical/safety lab tests** are specific to textiles: pH, formaldehyde, azo dyes, color fastness — not relevant to phones or drugs
- **Labels must be Arabic** (or Arabic+English), and footwear labels specifically must be "difficult to remove"**How it fits together:**

| Field | Purpose |
|---|---|
| `product_type` (TEXTILE/LEATHER/FOOTWEAR/MIXED) | Routes to the correct SASO technical regulation — textile, leather, and footwear are each governed separately |
| `is_underwear` + `age_group = 'CHILD'` | Automatically flags which items need the stricter **Type 3** certification (query (a) catches any gaps) |
| `lab_test_*` fields | Captures the specific chemical/safety tests SASO requires for textiles — pH, formaldehyde, azo dyes, color fastness |
| `arabic_label_verified` | Since Arabic labeling is non-negotiable, this acts as a gate before a product goes live in-store |
| `decency_review_status` | Saudi regulation explicitly requires that products, images, and packaging not violate public morals/Islamic values — this gives you an auditable checkpoint, separate from technical compliance |
| `footwear_label_permanently_attached` | Footwear labels specifically must be hard to remove — a distinct rule from general apparel labeling |

**Two compliance gates worth calling out before you go live with a product:**
1. Query (c) — catches anything missing Arabic labeling *or* decency review sign-off
2. Query (a) — catches children's/underwear items that slipped in with only Type 1a certification when Type 3 was required

One open question: are you sourcing any of these as **private label** (your own brand manufactured overseas) versus **branded resale** (Nike, Zara, etc. bought from an authorized local distributor)? If it's the latter, your distributor typically already holds the PCoC, and your compliance table would just need to *reference* their certificate rather than obtain one independently — similar to the distinction I flagged for electronics.

-- ============================================================
-- CLOTHING, FOOTWEAR & ACCESSORIES - SAUDI ARABIA COMPLIANCE
-- SASO Textile / Leather Technical Regulations, SABER, Arabic
-- labeling, chemical/safety testing
-- ============================================================

-- ------------------------------------------------------------
-- 1. PRODUCT (tenant-level catalog - one record per style+variant,
--    e.g. same design in different size/color = separate SKUs)
-- ------------------------------------------------------------

CREATE TABLE product (
    product_id             BIGSERIAL PRIMARY KEY,
    tenant_id                 BIGINT NOT NULL REFERENCES tenant(tenant_id),
    category_id                 BIGINT REFERENCES product_category(category_id),

    sku                       VARCHAR(50) NOT NULL,
    product_name                VARCHAR(150) NOT NULL,       -- e.g. 'Men's Casual Shirt'
    brand                          VARCHAR(100),

    product_type                    VARCHAR(20) NOT NULL
                                     CHECK (product_type IN ('TEXTILE','LEATHER','FOOTWEAR','MIXED')),

    fiber_composition                  VARCHAR(200),           -- e.g. '95% Cotton, 5% Elastane'
    color                                 VARCHAR(50),
    size                                    VARCHAR(20),         -- 'M', '42', 'One Size'
    gender                                    VARCHAR(20),        -- Men, Women, Unisex
    age_group                                  VARCHAR(20) DEFAULT 'ADULT'
                                                CHECK (age_group IN ('ADULT','CHILD','INFANT')),
    is_underwear                                 BOOLEAN DEFAULT FALSE,   -- triggers stricter cert type

    unit                                           VARCHAR(20) DEFAULT 'pcs',
    cost_price                                       NUMERIC(14,2) DEFAULT 0,
    base_selling_price                                 NUMERIC(14,2) NOT NULL,
    tax_category                                         VARCHAR(30) DEFAULT 'STANDARD',

    is_active                                              BOOLEAN DEFAULT TRUE,
    created_at                                               TIMESTAMP DEFAULT now(),
    updated_at                                                 TIMESTAMP DEFAULT now(),

    CONSTRAINT uq_product_sku UNIQUE (tenant_id, sku)
);

-- ------------------------------------------------------------
-- 2. SASO/SABER COMPLIANCE (per product - certification type
--    depends on whether it's children's wear / underwear)
-- ------------------------------------------------------------

CREATE TABLE product_compliance_ksa_apparel (
    product_id                 BIGINT PRIMARY KEY REFERENCES product(product_id),

    hs_code_12digit               VARCHAR(20) NOT NULL,
    country_of_origin               VARCHAR(100),

    certification_type                 VARCHAR(10) NOT NULL
                                        CHECK (certification_type IN ('TYPE_1A','TYPE_3')),
                                        -- TYPE_1A = testing only; TYPE_3 = testing + factory audit
                                        -- (required for children's wear and underwear)

    saber_pcoc_number                     VARCHAR(100),        -- Product Certificate of Conformity
    pcoc_issue_date                         DATE,
    pcoc_expiry_date                          DATE,             -- typically 1-year validity for textiles
    conformity_assessment_body                  VARCHAR(150),

    -- Chemical/safety lab test results (SASO Technical Regulation for Textile/Leather Products)
    lab_test_ph_value                             NUMERIC(4,2),
    lab_test_formaldehyde_result                    VARCHAR(50),  -- e.g. 'Pass - <75ppm'
    lab_test_azo_dyes_result                          VARCHAR(50),
    lab_test_color_fastness_result                      VARCHAR(50),

    -- Labeling compliance
    arabic_label_verified                                 BOOLEAN DEFAULT FALSE,
    label_includes_fiber_content                            BOOLEAN DEFAULT FALSE,
    label_includes_care_instructions                          BOOLEAN DEFAULT FALSE,
    footwear_label_permanently_attached                         BOOLEAN,  -- NULL if not footwear

    -- Content/decency review (products, images, packaging must not violate public morals/Islamic values)
    decency_review_status                                         VARCHAR(20) DEFAULT 'PENDING'
                                                                   CHECK (decency_review_status IN ('PENDING','APPROVED','REJECTED')),
    decency_review_notes                                            TEXT,

    compliance_status                                                 VARCHAR(20) DEFAULT 'PENDING'
                                                                       CHECK (compliance_status IN ('PENDING','APPROVED','EXPIRED','REJECTED')),
    last_verified_at                                                    TIMESTAMP DEFAULT now()
);

-- ------------------------------------------------------------
-- 3. SHIPMENT CERTIFICATE (SCoC required per shipment, same
--    pattern as electronics - validated against the PCoC above)
-- ------------------------------------------------------------

CREATE TABLE import_shipment_apparel_ksa (
    shipment_id             BIGSERIAL PRIMARY KEY,
    tenant_id                 BIGINT NOT NULL REFERENCES tenant(tenant_id),
    product_id                  BIGINT NOT NULL REFERENCES product(product_id),

    saber_scoc_number              VARCHAR(100) NOT NULL,
    scoc_issue_date                  DATE,
    linked_pcoc_number                  VARCHAR(100),

    quantity_imported                     NUMERIC(14,3) NOT NULL,
    customs_declaration_no                  VARCHAR(100),
    arrival_date                              DATE,

    status                                      VARCHAR(20) DEFAULT 'PENDING'
                                                 CHECK (status IN ('PENDING','CLEARED','REJECTED','RE_EXPORTED'))
);

-- ------------------------------------------------------------
-- 4. SAMPLE DATA
-- ------------------------------------------------------------

INSERT INTO product (
    product_id, tenant_id, sku, product_name, brand, product_type,
    fiber_composition, color, size, gender, age_group, is_underwear, base_selling_price
)
VALUES (
    1, 101, 'APP-SHIRT-M-BLU-M', 'Men''s Casual Shirt', 'HouseBrand', 'TEXTILE',
    '95% Cotton, 5% Elastane', 'Blue', 'M', 'Men', 'ADULT', FALSE, 89.00
);

INSERT INTO product_compliance_ksa_apparel (
    product_id, hs_code_12digit, country_of_origin, certification_type,
    saber_pcoc_number, pcoc_issue_date, pcoc_expiry_date, conformity_assessment_body,
    lab_test_ph_value, lab_test_formaldehyde_result, lab_test_azo_dyes_result, lab_test_color_fastness_result,
    arabic_label_verified, label_includes_fiber_content, label_includes_care_instructions,
    decency_review_status, compliance_status
)
VALUES (
    1, '620520009000', 'Bangladesh', 'TYPE_1A',
    'PCOC-2026-KSA-APP-1187', '2026-03-01', '2027-03-01', 'Intertek',
    6.8, 'Pass - <75ppm', 'Pass - Not Detected', 'Pass - Grade 4',
    TRUE, TRUE, TRUE, 'APPROVED', 'APPROVED'
);

-- Example: children's item requiring stricter certification
INSERT INTO product (
    product_id, tenant_id, sku, product_name, brand, product_type,
    fiber_composition, color, size, gender, age_group, is_underwear, base_selling_price
)
VALUES (
    2, 101, 'APP-KIDSSET-4Y', 'Kids Cotton Pajama Set', 'HouseBrand', 'TEXTILE',
    '100% Cotton', 'Yellow', '4Y', 'Unisex', 'CHILD', TRUE, 55.00
);

INSERT INTO product_compliance_ksa_apparel (
    product_id, hs_code_12digit, certification_type, saber_pcoc_number,
    pcoc_issue_date, pcoc_expiry_date, compliance_status
)
VALUES (
    2, '611120009000', 'TYPE_3', 'PCOC-2026-KSA-APP-1188',
    '2026-04-10', '2027-04-10', 'APPROVED'
);

-- ------------------------------------------------------------
-- 5. USEFUL QUERIES
-- ------------------------------------------------------------

-- (a) Products missing required Type 3 certification (children's wear/underwear risk check)
SELECT p.product_name, p.age_group, p.is_underwear, pc.certification_type, pc.compliance_status
FROM product p
JOIN product_compliance_ksa_apparel pc ON p.product_id = pc.product_id
WHERE (p.age_group = 'CHILD' OR p.is_underwear = TRUE)
  AND pc.certification_type != 'TYPE_3';

-- (b) PCoC renewal alert (1-year validity - shorter cycle than electronics)
SELECT p.product_name, pc.saber_pcoc_number, pc.pcoc_expiry_date
FROM product_compliance_ksa_apparel pc
JOIN product p ON pc.product_id = p.product_id
WHERE pc.pcoc_expiry_date <= CURRENT_DATE + INTERVAL '60 days';

-- (c) Products pending Arabic label or decency review before listing for sale
SELECT p.product_name, pc.arabic_label_verified, pc.decency_review_status
FROM product_compliance_ksa_apparel pc
JOIN product p ON pc.product_id = p.product_id
WHERE pc.arabic_label_verified = FALSE OR pc.decency_review_status != 'APPROVED';

-- (d) Footwear-specific label attachment check
SELECT p.product_name, pc.footwear_label_permanently_attached
FROM product p
JOIN product_compliance_ksa_apparel pc ON p.product_id = pc.product_id
WHERE p.product_type = 'FOOTWEAR' AND (pc.footwear_label_permanently_attached IS NULL OR pc.footwear_label_permanently_attached = FALSE);

