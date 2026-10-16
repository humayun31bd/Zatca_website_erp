-- Comments
-- not implete not now will implemet in phase 2
# Unified Product Table Schema for Multi-Tenant ERP

This schema normalizes product attributes into separate lookup tables and relates them to a unified `product` table. This allows robust filtering, reporting, and standardization across Retail, Electronics, Pharmacy, and Apparel tenants.

## 1. Lookup Tables

First, we define lookup tables for shared and tenant-specific attributes. System-level lookup tables (like gender or product_type) don't need a `tenant_id`, while tenant-customizable lookups (like brands or colors) should be scoped to a `tenant_id`.

```sql
-- ============================================================
-- SYSTEM-LEVEL LOOKUP TABLES (Shared across all tenants)
-- ============================================================

CREATE TABLE product_type (
    product_type_id BIGSERIAL PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL UNIQUE -- e.g., 'FMCG', 'ELECTRONICS', 'PHARMACY', 'APPAREL'
);

CREATE TABLE apparel_product_type (
    apparel_type_id BIGSERIAL PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL UNIQUE -- 'TEXTILE', 'LEATHER', 'FOOTWEAR'
);

CREATE TABLE gender (
    gender_id BIGSERIAL PRIMARY KEY,
    gender_name VARCHAR(20) NOT NULL UNIQUE -- 'Men', 'Women', 'Unisex'
);

CREATE TABLE age_group (
    age_group_id BIGSERIAL PRIMARY KEY,
    age_group_name VARCHAR(20) NOT NULL UNIQUE -- 'ADULT', 'CHILD', 'INFANT'
);

CREATE TABLE country_of_origin (
    country_id BIGSERIAL PRIMARY KEY,
    country_name VARCHAR(100) NOT NULL UNIQUE,
    country_code VARCHAR(3) UNIQUE
);

-- ============================================================
-- TENANT-LEVEL LOOKUP TABLES (Customizable per tenant)
-- ============================================================

CREATE TABLE product_category (
    category_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant(tenant_id),
    parent_category_id BIGINT REFERENCES product_category(category_id), -- For Sub-categories
    category_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT uq_category_tenant UNIQUE(tenant_id, category_name)
);

CREATE TABLE brand (
    brand_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant(tenant_id),
    brand_name VARCHAR(100) NOT NULL,
    CONSTRAINT uq_brand_tenant UNIQUE(tenant_id, brand_name)
);

CREATE TABLE product_unit (
    unit_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant(tenant_id),
    unit_name VARCHAR(20) NOT NULL, -- 'pcs', 'kg', 'box', etc.
    CONSTRAINT uq_unit_tenant UNIQUE(tenant_id, unit_name)
);

CREATE TABLE tax_category (
    tax_category_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant(tenant_id),
    category_name VARCHAR(50) NOT NULL,
    tax_rate NUMERIC(5,2) NOT NULL,
    CONSTRAINT uq_tax_category_tenant UNIQUE(tenant_id, category_name)
);

CREATE TABLE color (
    color_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant(tenant_id),
    color_name VARCHAR(50) NOT NULL,
    CONSTRAINT uq_color_tenant UNIQUE(tenant_id, color_name)
);

CREATE TABLE strength (
    strength_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant(tenant_id),
    strength_value VARCHAR(50) NOT NULL, -- e.g., '500mg'
    CONSTRAINT uq_strength_tenant UNIQUE(tenant_id, strength_value)
);

CREATE TABLE dosage_form (
    dosage_form_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant(tenant_id),
    form_name VARCHAR(50) NOT NULL, -- e.g., 'Tablet', 'Syrup'
    CONSTRAINT uq_dosage_form_tenant UNIQUE(tenant_id, form_name)
);

CREATE TABLE manufacturer (
    manufacturer_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant(tenant_id),
    manufacturer_name VARCHAR(150) NOT NULL,
    CONSTRAINT uq_manufacturer_tenant UNIQUE(tenant_id, manufacturer_name)
);

CREATE TABLE marketing_authorization_holder (
    holder_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant(tenant_id),
    holder_name VARCHAR(150) NOT NULL,
    CONSTRAINT uq_mah_tenant UNIQUE(tenant_id, holder_name)
);

CREATE TABLE storage_condition (
    storage_condition_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant(tenant_id),
    condition_name VARCHAR(50) NOT NULL, -- e.g., 'Room Temp', 'Refrigerated 2-8C'
    CONSTRAINT uq_storage_cond_tenant UNIQUE(tenant_id, condition_name)
);
```

## 2. Unified `product` Table

The unified product table now references all the lookup tables via foreign keys and includes generic fields for e-commerce needs.

```sql
CREATE TABLE product (
    product_id                      BIGSERIAL PRIMARY KEY,
    tenant_id                       BIGINT NOT NULL REFERENCES tenant(tenant_id),
    is_category_wise_stock          BOOLEAN DEFAULT FALSE,       -- TRUE if categorywise stock, FALSE if productwise stock
    category_id                     BIGINT REFERENCES product_category(category_id),
    is_product_wise_stock           BOOLEAN DEFAULT FALSE,       -- TRUE if productwise stock, FALSE if categorywise stock
    is_parent_product               BOOLEAN DEFAULT FALSE,       -- TRUE if parent product, FALSE if sub product
    parent_product_id               BIGINT REFERENCES product(product_id),     
    -- Common Fields (All Tenant Types)
    sku                             VARCHAR(50) NOT NULL,
    product_name                    VARCHAR(150) NOT, 
    description                     TEXT,                        -- E-commerce description
    brand_id                        BIGINT REFERENCES brand(brand_id),
    barcode                         VARCHAR(50),
    product_type_id                 BIGINT NOT NULL REFERENCES product_type(product_type_id),
    image_urls                      JSONB DEFAULT '[]'::jsonb,   -- Array of image URLs for e-commerce
    
    unit_id                         BIGINT REFERENCES product_unit(unit_id),
    is_packet_of_pieces           BOOLEAN DEFAULT FALSE,       -- TRUE if packet of pieces, 
    packet_size                       INT DEFAULT 1,               -- Number of pieces in a packet
    is_weight_based                   BOOLEAN DEFAULT FALSE,       -- TRUE if weight based
    weight                            NUMERIC(14,2) DEFAULT 1,    -- Weight of the product

    cost_price                      NUMERIC(14,2) DEFAULT 1,
    mergin_percentage               NUMERIC(14,2) DEFAULT 20,
    base_selling_price              NUMERIC(14,2) DEFAULT 1.20,
    retail_price                    NUMERIC(14,2) DEFAULT 1,
    distributor_price               NUMERIC(14,2) DEFAULT 1,
    special_price                   NUMERIC(14,2) DEFAULT 1,
    discounted_price                NUMERIC(14,2) DEFAULT 1,               -- E-commerce sale price
    tax_category_id                 BIGINT REFERENCES tax_category(tax_category_id),
    stock_in_hand                   INT DEFAULT 0,                       -- Stock in hand
    min_order_qty                   INT DEFAULT 0,                       -- Order qty
    is_wholesaler                   BOOLEAN DEFAULT FALSE,       -- TRUE if wholesaler, FALSE otherwise
    is_distributor                  BOOLEAN DEFAULT FALSE,       -- TRUE if distributor, FALSE otherwise
    is_pharmacy                     BOOLEAN DEFAULT FALSE,       -- TRUE if pharmacy, FALSE otherwise

    -- Electronics / Mobile Phone Specific Fields
    is_electronics                  BOOLEAN DEFAULT FALSE,       -- TRUE if electronics, FALSE otherwise
    is_model_number                 BOOLEAN DEFAULT FALSE,       -- TRUE if model number is required, FALSE otherwise
    model_number                    VARCHAR(100),
    -- Storage Capacity
    storage_capacity_id             BIGINT REFERENCES storage_capacity(storage_capacity_id), -- For storage capacity

    -- RAM
    ram_id                          BIGINT REFERENCES ram(ram_id), -- For ram

    is_warranty_applicable          BOOLEAN DEFAULT FALSE,       -- TRUE if warranty is applicable, FALSE otherwise
    warrenty_periods_days           INT DEFAULT 0,               -- For warranty period
    warranty_provider_id            BIGINT REFERENCES warranty_provider(warranty_provider_id), -- For warranty provider

    -- For variants of a product
    is_color_variant                BOOLEAN DEFAULT FALSE,       -- TRUE if color variant, FALSE otherwise
    color_variant_id                BIGINT REFERENCES color_variant(color_variant_id), -- For color variant

    -- For variants of a product
    is_size_variant                 BOOLEAN DEFAULT FALSE,       -- TRUE if size variant, FALSE otherwise
    size_variant_id                 BIGINT REFERENCES size_variant(size_variant_id), -- For size variant

    -- Pharmacy / Medical Specific Fields
    is_medicine                     BOOLEAN DEFAULT FALSE,       -- TRUE if medicine, FALSE otherwise
    is_generic_name_applicable      BOOLEAN DEFAULT FALSE,       -- TRUE if generic name is required, FALSE otherwise
    generic_name                    VARCHAR(150),
    is_active_ingredient_applicable BOOLEAN DEFAULT FALSE,       -- TRUE if active ingredient is required, FALSE otherwise
    active_ingredient               VARCHAR(200),
    is_strength_applicable          BOOLEAN DEFAULT FALSE,       -- TRUE if strength is required, FALSE otherwise
    strength_id                     BIGINT REFERENCES strength(strength_id),
    is_dosage_form_applicable       BOOLEAN DEFAULT FALSE,       -- TRUE if dosage form is required, FALSE otherwise
    dosage_form_id                  BIGINT REFERENCES dosage_form(dosage_form_id),
    is_manufacturer_applicable      BOOLEAN DEFAULT FALSE,       -- TRUE if manufacturer is required, FALSE otherwise
    manufacturer_id                 BIGINT REFERENCES manufacturer(manufacturer_id),
    is_marketing_auth_holder_applicable BOOLEAN DEFAULT FALSE,       -- TRUE if marketing auth holder is required, FALSE otherwise
    marketing_auth_holder_id        BIGINT REFERENCES marketing_authorization_holder(holder_id),
    is_prescription_required        BOOLEAN DEFAULT FALSE,
    controlled_substance_schedule   VARCHAR(20),                 -- NULL if not controlled
    storage_condition_id            BIGINT REFERENCES storage_condition(storage_condition_id),
    requires_batch_tracking         BOOLEAN DEFAULT FALSE,       -- TRUE for medicines (requires expiry tracking)
    
    -- Apparel / Footwear Specific Fields
    is_apparel                      BOOLEAN DEFAULT FALSE,       -- TRUE if apparel, FALSE otherwise
    apparel_product_type_id         BIGINT REFERENCES apparel_product_type(apparel_type_id),
    fiber_composition               VARCHAR(200),
    gender_id                       BIGINT REFERENCES gender(gender_id),
    age_group_id                    BIGINT REFERENCES age_group(age_group_id),
    is_underwear                    BOOLEAN DEFAULT FALSE,       -- Triggers stricter Type 3 certification in KSA
    is_tax_exempt                   BOOLEAN DEFAULT FALSE,       -- TRUE if sales tax is exempt, FALSE otherwise
    
    is_points_applicable            BOOLEAN DEFAULT FALSE,       -- TRUE if points are applicable, FALSE otherwise
    points_perproduct               INT DEFAULT 0,               -- Points for the product
    is_product_display_pos_app      BOOLEAN DEFAULT TRUE,       -- TRUE if product is displayed on the pos app,  FALSE otherwise
    is_product_display_website_app  BOOLEAN DEFAULT FALSE,       -- TRUE if product is displayed on the website app, FALSE otherwise
    is_product_display_rack_label   BOOLEAN DEFAULT FALSE,       -- TRUE if product is displayed on the rack label, FALSE otherwise
    is_product_display_tag          BOOLEAN DEFAULT FALSE,       -- TRUE if product is displayed on the tag, FALSE otherwise
    is_product_display_price_tag  BOOLEAN DEFAULT FALSE,       -- TRUE if product is displayed on the price tag, FALSE otherwise
    is_product_display_hanging_tag  BOOLEAN DEFAULT FALSE,       -- TRUE if product is displayed on the hanging tag, FALSE otherwise    
    is_product_display_electronic_scale BOOLEAN DEFAULT FALSE,   -- TRUE if product is displayed on the electronic scale, FALSE otherwise
    is_product_display_weighing_scale BOOLEAN DEFAULT FALSE,     -- TRUE if product is displayed on the weighing scale, FALSE otherwise
    
    is_verified_by_buyer            BOOLEAN DEFAULT FALSE,       -- TRUE if product is verified by the buyer, FALSE otherwise
    is_verified_by_supplier         BOOLEAN DEFAULT FALSE,       -- TRUE if product is verified by the supplier, FALSE otherwise
    is_offers                       BOOLEAN DEFAULT FALSE,       -- TRUE if product is offers, FALSE otherwise
    
    return_days                     INT DEFAULT 7,               -- Return days for the product
    exchange_days                   INT DEFAULT 30,              -- Exchange days for the product
    promised_delivery_days          INT DEFAULT 2,               -- Promised delivery days for the product
    is_payment_available_cod        BOOLEAN DEFAULT TRUE,        -- TRUE if payment available COD, FALSE otherwise    
    is_accelerated_checkout_available BOOLEAN DEFAULT FALSE,     -- TRUE if accelerated checkout is available, FALSE otherwise
    is_subscription_available       BOOLEAN DEFAULT FALSE,       -- TRUE if subscription is available, FALSE otherwise    
    
    requires_serial_tracking BOOLEAN NOT NULL DEFAULT FALSE,
    requires_batch_tracking  BOOLEAN NOT NULL DEFAULT FALSE,


    -- Size Variant is required measurement
    size_variant_id                 BIGINT REFERENCES size_variant(size_variant_id),
    size_variant_ids                JSONB DEFAULT '[]'::jsonb,

    is_active                       BOOLEAN DEFAULT TRUE,
    created_at                      TIMESTAMP DEFAULT now(),
    updated_at                      TIMESTAMP DEFAULT now(),

    CONSTRAINT uq_product_sku UNIQUE (tenant_id, sku)
);
```

```sql
CREATE TABLE serial_number_tracking (
    serial_id          BIGINT PRIMARY KEY,
    product_id         BIGINT NOT NULL REFERENCES products(product_id),
    serial_number      VARCHAR(100) NOT NULL,
    purchase_id        BIGINT REFERENCES purchase(purchase_id),
    supplier_id        BIGINT REFERENCES suppliers(supplier_id),

    shipment_id        BIGINT REFERENCES shipments(shipment_id),
    invoice_id         BIGINT REFERENCES sales(sales_id),
    return_id          BIGINT REFERENCES returns(return_id),

    warehouse_id       BIGINT REFERENCES warehouse(warehouse_id),
    location_bin       VARCHAR(50) NULL,
    status             VARCHAR(30) NOT NULL DEFAULT 'IN_STOCK',
    received_at        TIMESTAMP DEFAULT now(),
    sold_at            TIMESTAMP DEFAULT now(),

    sales_order_id     BIGINT REFERENCES sales(sales_id),
    customer_id        BIGINT REFERENCES customers(customer_id),
    warranty_expiry    DATE NULL,

    created_at         TIMESTAMP DEFAULT now(),
    updated_at         TIMESTAMP DEFAULT now(),

    CONSTRAINT uq_product_serial UNIQUE (product_id, serial_number)
);

CREATE INDEX idx_serial_number ON serial_number_tracking (serial_number);
CREATE INDEX idx_product_status ON serial_number_tracking (product_id, status);
```


```sql
CREATE TABLE serial_transactions (
    transaction_id     BIGINT PRIMARY KEY,
    serial_id          BIGINT NOT NULL REFERENCES serial_number_tracking(serial_id),
    transaction_type   VARCHAR(30) NOT NULL REFERENCES transaction_type(transaction_type_id),
    document_type      VARCHAR(30) NOT NULL REFERENCES document_type(document_type_id), -- sales, purchase, return
    document_id        BIGINT NOT NULL REFERENCES document_type(document_id),
    from_location      VARCHAR(50) NULL,
    to_location        VARCHAR(50) NULL,
    performed_by       BIGINT NULL REFERENCES users(user_id),
    transaction_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

```sql
CREATE TABLE batch_number_tracking (
    batch_id               BIGINT PRIMARY KEY,
    product_id             BIGINT NOT NULL REFERENCES products(product_id),
    batch_number           VARCHAR(100) NOT NULL,
    received_quantity      INT NOT NULL,
    remaining_quantity     INT NOT NULL,
    manufacturing_date   DATE,
    expiry_date          DATE,
    purchase_id            BIGINT REFERENCES purchase(purchase_id),
    supplier_id            BIGINT REFERENCES suppliers(supplier_id),
    warehouse_id           BIGINT REFERENCES warehouse(warehouse_id),
    location_bin           VARCHAR(50) NULL,
    is_expired             BOOLEAN NOT NULL DEFAULT FALSE,
    status                 VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at             TIMESTAMP DEFAULT now(),
    updated_at             TIMESTAMP DEFAULT now(),

    CONSTRAINT uq_product_batch UNIQUE (product_id, batch_number)
);

CREATE INDEX idx_batch_number ON batch_number_tracking (batch_number);
CREATE INDEX idx_product_batch ON batch_number_tracking (product_id, batch_number);
CREATE INDEX idx_expiry_date ON batch_number_tracking (expiry_date);
```

```sql
CREATE TABLE batch_transactions (
    transaction_id     BIGINT PRIMARY KEY,
    batch_id           BIGINT NOT NULL REFERENCES batch_number_tracking(batch_id),
    transaction_type   VARCHAR(30) NOT NULL REFERENCES transaction_type(transaction_type_id),
    document_type      VARCHAR(30) NOT NULL REFERENCES document_type(document_type_id), -- sales, purchase, return
    document_id        BIGINT NOT NULL REFERENCES document_type(document_id),
    quantity           INT NOT NULL,
    from_location      VARCHAR(50) NULL,
    to_location        VARCHAR(50) NULL,
    performed_by       BIGINT NULL REFERENCES users(user_id),
    transaction_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```



```sql
CREATE TABLE batch_wise_stock (
    product_id            BIGINT NOT NULL REFERENCES products(product_id),
    batch_id              BIGINT REFERENCES batch_number_tracking(batch_id),
    quantity              INT NOT NULL,
    
    CONSTRAINT uq_batch_wise_stock UNIQUE (product_id, batch_id)
);
```

-- subscription_plans

```sql
CREATE TABLE subscription_plans (
    plan_id              BIGINT PRIMARY KEY,
    subscription_id     BIGINT NOT NULL REFERENCES subscription(subscription_id),
    plan_name            VARCHAR(100) NOT NULL,
    plan_description     VARCHAR(500) NOT NULL,
    plan_price           DECIMAL(10, 2) NOT NULL,
    plan_interval        VARCHAR(20) NOT NULL,
    plan_interval_count  INT NOT NULL,
    plan_status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    plan_created_at      TIMESTAMP DEFAULT now(),
    plan_updated_at      TIMESTAMP DEFAULT now(),

    CONSTRAINT uq_subscription_plan UNIQUE (product_id, plan_name)
);
```

```sql
CREATE TABLE subscription_tracking (
    subscription_id              BIGINT PRIMARY KEY,
    subscription_tracking_id     BIGINT NOT NULL REFERENCES subscription(subscription_id),
    plan_name            VARCHAR(100) NOT NULL,
    plan_description     VARCHAR(500) NOT NULL,
    plan_price           DECIMAL(10, 2) NOT NULL,
    plan_interval        VARCHAR(20) NOT NULL,
    plan_interval_count  INT NOT NULL,
    plan_status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    plan_created_at      TIMESTAMP DEFAULT now(),
    plan_updated_at      TIMESTAMP DEFAULT now(),

    CONSTRAINT uq_subscription_plan UNIQUE (product_id, plan_name)
);
```

## 3. Unified Compliance Table

The compliance table is updated to map the country of origin to the normalized lookup table. Custom/complex compliance documents remain in a flexible JSONB field.

```sql
CREATE TABLE product_compliance (
    product_id                      BIGINT PRIMARY KEY REFERENCES product(product_id),
    
    -- Common Customs Fields
    hs_code                         VARCHAR(20),
    country_of_origin_id            BIGINT REFERENCES country_of_origin(country_id),
    
    -- Flexible Compliance Document (JSONB)
    -- Electronics (KSA): {"saber_pcoc": "...", "cst_type_approval": "..."}
    -- Pharmacy (KSA): {"sfda_registration_no": "...", "rsd_enrolled": true}
    -- Electronics (BD): {"btrc_noc": "...", "is_btrc_regulated": true}
    -- Apparel (KSA): {"lab_test_ph": "7.0", "arabic_label_verified": true}
    compliance_data                 JSONB DEFAULT '{}'::jsonb,
    
    compliance_status               VARCHAR(20) DEFAULT 'PENDING',
    last_verified_at                TIMESTAMP DEFAULT now()
);
```

## Product Opening Stock
CREATE TABLE opening_stock (
    opening_stock_id      BIGINT PRIMARY KEY,
    product_id            BIGINT NOT NULL REFERENCES product(product_id),
    quantity              INT NOT NULL,
    warehouse_id          BIGINT REFERENCES warehouse(warehouse_id),
    location_bin          VARCHAR(50) NULL,
    created_at            TIMESTAMP DEFAULT now(),
    updated_at            TIMESTAMP DEFAULT now(),

    CONSTRAINT uq_product_opening_stock UNIQUE (product_id, warehouse_id)
);

## Product varient Opening Stock
CREATE TABLE product_variant_opening_stock (
    variant_opening_stock_id      BIGINT PRIMARY KEY,
    product_variant_id            BIGINT NOT NULL REFERENCES product_variants(variant_id),
    quantity                      INT NOT NULL,
    warehouse_id                  BIGINT REFERENCES warehouse(warehouse_id),
    location_bin                  VARCHAR(50) NULL,
    created_at                    TIMESTAMP DEFAULT now(),
    updated_at                    TIMESTAMP DEFAULT now(),

    CONSTRAINT uq_product_variant_opening_stock UNIQUE (product_variant_id, warehouse_id)
);
