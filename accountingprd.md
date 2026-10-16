

##Standard for tenants accounts chart of accounts predefined    

##Standard 5 level Chart of Accounts for Tenants    

Here's a **5-level Chart of Accounts (COA)** structure suitable for SME retail tenants (e.g., for a leasing platform, marketplace, or standalone accounting setup):

## Level Structure & Coding Convention

| Level | Name | Digits | Example |
|---|---|---|---|
| 1 | Account Class | 1 digit | 1 = Assets |
| 2 | Account Group | 2 digits | 11 = Current Assets |
| 3 | Account Category | 2 digits | 1101 = Cash & Bank |
| 4 | Control Account | 3 digits | 1101.001 = Cash on Hand |
| 5 | Sub-Account / Detail | 3 digits | 1101.001.001 = Petty Cash - Store 1 |

**Code format:** `X-XX-XX-XXX-XXX` (Class-Group-Category-Control-Detail)

---

## Sample Chart

### 1. ASSETS

| Code | Level | Description |
|---|---|---|
| 1 | 1 | Assets |
| 1.10 | 2 | Current Assets |
| 1.10.01 | 3 | Cash & Bank |
| 1.10.01.001 | 4 | Cash on Hand |
| 1.10.01.001.001 | 5 | Petty Cash – Outlet A |
| 1.10.01.001.002 | 5 | Petty Cash – Outlet B |
| 1.10.01.002 | 4 | Bank Account |
| 1.10.01.002.001 | 5 | Bank – Operating Account |
| 1.10.01.002.002 | 5 | Bank – Reserve Account |
| 1.10.02 | 3 | Accounts Receivable |
| 1.10.02.001 | 4 | Trade Receivables |
| 1.10.02.001.001 | 5 | Receivable – POS Sales |
| 1.10.02.001.002 | 5 | Receivable – Marketplace/Online Sales |
| 1.10.03 | 3 | Inventory |
| 1.10.03.001 | 4 | Merchandise Inventory |
| 1.10.03.001.001 | 5 | Inventory – Category A (e.g. Apparel) |
| 1.10.03.001.002 | 5 | Inventory – Category B (e.g. Electronics) |
| 1.20 | 2 | Fixed Assets |
| 1.20.01 | 3 | Furniture & Fixtures |
| 1.20.01.001 | 4 | Store Fixtures |
| 1.20.01.001.001 | 5 | Shelving – Outlet A |
| 1.20.02 | 3 | Equipment |
| 1.20.02.001 | 4 | POS Equipment |
| 1.20.02.001.001 | 5 | POS Terminal – Outlet A |

---

### 2. LIABILITIES

| Code | Level | Description |
|---|---|---|
| 2 | 1 | Liabilities |
| 2.10 | 2 | Current Liabilities |
| 2.10.01 | 3 | Accounts Payable |
| 2.10.01.001 | 4 | Trade Payables |
| 2.10.01.001.001 | 5 | Payable – Supplier X |
| 2.10.02 | 3 | Lease Obligations |
| 2.10.02.001 | 4 | Rent Payable |
| 2.10.02.001.001 | 5 | Rent Payable – Landlord/Platform |
| 2.10.03 | 3 | Taxes Payable |
| 2.10.03.001 | 4 | Sales Tax / VAT Payable |
| 2.10.03.001.001 | 5 | VAT Output |

---

### 3. EQUITY

| Code | Level | Description |
|---|---|---|
| 3 | 1 | Equity |
| 3.10 | 2 | Owner's Equity |
| 3.10.01 | 3 | Capital |
| 3.10.01.001 | 4 | Owner Contribution |
| 3.10.01.001.001 | 5 | Initial Capital |
| 3.10.02 | 3 | Retained Earnings |
| 3.10.02.001 | 4 | Accumulated Profit/Loss |
| 3.10.02.001.001 | 5 | Current Year Earnings |

---

### 4. REVENUE

| Code | Level | Description |
|---|---|---|
| 4 | 1 | Revenue |
| 4.10 | 2 | Sales Revenue |
| 4.10.01 | 3 | In-Store Sales |
| 4.10.01.001 | 4 | Category A Sales |
| 4.10.01.001.001 | 5 | Sales – Outlet A |
| 4.10.02 | 3 | Online/Marketplace Sales |
| 4.10.02.001 | 4 | Platform Channel Sales |
| 4.10.02.001.001 | 5 | Sales – App Orders |
| 4.20 | 2 | Other Income |
| 4.20.01 | 3 | Discounts/Rebates Received |
| 4.20.01.001 | 4 | Supplier Rebates |
| 4.20.01.001.001 | 5 | Rebate – Supplier X |

---

### 5. EXPENSES

| Code | Level | Description |
|---|---|---|
| 5 | 1 | Expenses |
| 5.10 | 2 | Cost of Goods Sold |
| 5.10.01 | 3 | Purchase Cost |
| 5.10.01.001 | 4 | Merchandise Purchases |
| 5.10.01.001.001 | 5 | Purchases – Category A |
| 5.20 | 2 | Operating Expenses |
| 5.20.01 | 3 | Occupancy Costs |
| 5.20.01.001 | 4 | Rent Expense |
| 5.20.01.001.001 | 5 | Rent – Outlet A |
| 5.20.02 | 3 | Utilities |
| 5.20.02.001 | 4 | Electricity |
| 5.20.02.001.001 | 5 | Electricity – Outlet A |
| 5.20.03 | 3 | Staff Costs |
| 5.20.03.001 | 4 | Salaries & Wages |
| 5.20.03.001.001 | 5 | Salaries – Sales Staff |
| 5.20.04 | 3 | Marketing & Platform Fees |
| 5.20.04.001 | 4 | Commission/Platform Fees |
| 5.20.04.001.001 | 5 | Marketplace Commission |

---

## Notes on Design
- **Level 1–3** are usually standardized system-wide (same for all tenants) so reporting can be consolidated across tenants.
- **Level 4–5** can be tenant-customizable (e.g., adding their own outlets, product categories, or cost centers) without breaking the parent structure.
- If tenants operate multiple outlets, consider adding an **outlet/cost-center dimension** as a separate tag rather than embedding it purely in the account code — keeps the COA cleaner for consolidated reporting.

-- ============================================================
-- CHART OF ACCOUNTS (COA) - PARENT-CHILD SCHEMA
-- Multi-tenant, self-referencing tree structure, 5 levels
-- ============================================================

-- ------------------------------------------------------------
-- 1. LOOKUP TABLES
-- ------------------------------------------------------------

CREATE TABLE account_class (
    class_id        SMALLINT PRIMARY KEY,        -- 1=Assets,2=Liabilities,3=Equity,4=Revenue,5=Expenses
    class_name      VARCHAR(50) NOT NULL,
    normal_balance  VARCHAR(6) NOT NULL CHECK (normal_balance IN ('DEBIT','CREDIT'))
);

INSERT INTO account_class (class_id, class_name, normal_balance) VALUES
 (1,'Assets','DEBIT'),
 (2,'Liabilities','CREDIT'),
 (3,'Equity','CREDIT'),
 (4,'Revenue','CREDIT'),
 (5,'Expenses','DEBIT');

CREATE TABLE tenant (
    tenant_id       BIGSERIAL PRIMARY KEY,
    tenant_name     VARCHAR(150) NOT NULL,
    business_type   VARCHAR(50),                 -- Retail, F&B, Services, etc.
    created_at      TIMESTAMP DEFAULT now()
);

-- ------------------------------------------------------------
-- 2. CORE COA TABLE (self-referencing, 5 levels)
-- ------------------------------------------------------------

CREATE TABLE chart_of_accounts (
    account_id       BIGSERIAL PRIMARY KEY,
    tenant_id        BIGINT NULL REFERENCES tenant(tenant_id),
                     -- NULL tenant_id = system-wide/shared account (levels 1-3)
                     -- NOT NULL tenant_id = tenant-specific account (levels 4-5)

    parent_id        BIGINT NULL REFERENCES chart_of_accounts(account_id),
                     -- NULL only for Level 1 (root class) rows

    level            SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 5),
    class_id         SMALLINT NOT NULL REFERENCES account_class(class_id),

    account_code     VARCHAR(30) NOT NULL,       -- e.g. '1.10.01.001.001'
    account_name     VARCHAR(150) NOT NULL,      -- e.g. 'Petty Cash - Outlet A'

    is_system        BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE = platform-defined, not tenant-editable
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    is_postable      BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE only for lowest-level (transaction) accounts

    created_at       TIMESTAMP DEFAULT now(),
    updated_at       TIMESTAMP DEFAULT now(),

    CONSTRAINT uq_account_code_per_tenant UNIQUE (tenant_id, account_code)
);

-- Indexes for tree traversal & lookups
CREATE INDEX idx_coa_parent_id   ON chart_of_accounts(parent_id);
CREATE INDEX idx_coa_tenant_id   ON chart_of_accounts(tenant_id);
CREATE INDEX idx_coa_class_id    ON chart_of_accounts(class_id);
CREATE INDEX idx_coa_level       ON chart_of_accounts(level);

-- ------------------------------------------------------------
-- 3. OPTIONAL: OUTLET / COST-CENTER DIMENSION
--    (keeps multi-outlet tagging separate from the COA tree)
-- ------------------------------------------------------------

CREATE TABLE outlet (
    outlet_id       BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL REFERENCES tenant(tenant_id),
    outlet_name     VARCHAR(150) NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE
);

-- Link table: which accounts are tagged to which outlet (for reporting)
CREATE TABLE account_outlet_map (
    account_id      BIGINT NOT NULL REFERENCES chart_of_accounts(account_id),
    outlet_id       BIGINT NOT NULL REFERENCES outlet(outlet_id),
    PRIMARY KEY (account_id, outlet_id)
);

-- ------------------------------------------------------------
-- 4. SAMPLE DATA (Level 1 -> Level 5 chain for Cash on Hand)
-- ------------------------------------------------------------

-- Level 1 (system, shared across all tenants)
INSERT INTO chart_of_accounts (account_id, tenant_id, parent_id, level, class_id, account_code, account_name, is_system, is_postable)
VALUES (1, NULL, NULL, 1, 1, '1', 'Assets', TRUE, FALSE);

-- Level 2 (system)
INSERT INTO chart_of_accounts (account_id, tenant_id, parent_id, level, class_id, account_code, account_name, is_system, is_postable)
VALUES (2, NULL, 1, 2, 1, '1.10', 'Current Assets', TRUE, FALSE);

-- Level 3 (system)
INSERT INTO chart_of_accounts (account_id, tenant_id, parent_id, level, class_id, account_code, account_name, is_system, is_postable)
VALUES (3, NULL, 2, 3, 1, '1.10.01', 'Cash & Bank', TRUE, FALSE);

-- Level 4 (tenant-specific control account, tenant #101)
INSERT INTO chart_of_accounts (account_id, tenant_id, parent_id, level, class_id, account_code, account_name, is_system, is_postable)
VALUES (4, 101, 3, 4, 1, '1.10.01.001', 'Cash on Hand', FALSE, FALSE);

-- Level 5 (tenant-specific detail/posting account)
INSERT INTO chart_of_accounts (account_id, tenant_id, parent_id, level, class_id, account_code, account_name, is_system, is_postable)
VALUES (5, 101, 4, 5, 1, '1.10.01.001.001', 'Petty Cash - Outlet A', FALSE, TRUE);

-- ------------------------------------------------------------
-- 5. USEFUL QUERIES
-- ------------------------------------------------------------

-- (a) Recursive CTE: get full tree for a tenant (system levels + their own)
WITH RECURSIVE coa_tree AS (
    SELECT account_id, parent_id, level, account_code, account_name, tenant_id
    FROM chart_of_accounts
    WHERE parent_id IS NULL   -- roots (Level 1)

    UNION ALL

    SELECT c.account_id, c.parent_id, c.level, c.account_code, c.account_name, c.tenant_id
    FROM chart_of_accounts c
    INNER JOIN coa_tree t ON c.parent_id = t.account_id
    WHERE c.tenant_id IS NULL OR c.tenant_id = 101   -- filter: system rows OR this tenant's rows
)
SELECT * FROM coa_tree ORDER BY account_code;

-- (b) Get only postable (transaction-level) accounts for a tenant
SELECT account_id, account_code, account_name
FROM chart_of_accounts
WHERE is_postable = TRUE
  AND (tenant_id = 101 OR tenant_id IS NULL)
ORDER BY account_code;

-- (c) Get full ancestor path for a given account (breadcrumb, e.g. for UI display)
WITH RECURSIVE ancestors AS (
    SELECT account_id, parent_id, account_name, account_code
    FROM chart_of_accounts
    WHERE account_id = 5   -- starting account

    UNION ALL

    SELECT c.account_id, c.parent_id, c.account_name, c.account_code
    FROM chart_of_accounts c
    INNER JOIN ancestors a ON c.account_id = a.parent_id
)
SELECT * FROM ancestors;

-- (d) Prevent tenants from editing system-level accounts (app-layer or trigger check)
-- Example trigger stub:
-- CREATE OR REPLACE FUNCTION block_system_account_edit() RETURNS TRIGGER AS $$
-- BEGIN
--     IF OLD.is_system = TRUE THEN
--         RAISE EXCEPTION 'System-level accounts cannot be modified by tenants';
--     END IF;
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;


-- ============================================================
-- EXTENSION: ORG HIERARCHY + DIMENSIONS + TRANSACTION TAGGING
-- Builds on coa_parent_child_schema.sql
--
-- Hierarchy relationships:
--   Tenant --------------------> Branch/Outlet --------> Cost Center   (TRUE parent-child)
--   Supplier  (tenant-level master data, NOT nested under cost center)
--   Customer  (tenant-level master data, NOT nested under cost center)
--
-- A transaction line can independently tag: Account + Branch + Cost
-- Center + Supplier (if purchase) + Customer (if sale)
-- ============================================================

-- ------------------------------------------------------------
-- 1. BRANCH / OUTLET (already exists - shown here with parent link
--    added in case branches themselves have sub-branches; optional)
-- ------------------------------------------------------------

ALTER TABLE outlet ADD COLUMN parent_outlet_id BIGINT NULL REFERENCES outlet(outlet_id);
-- Use only if you need Region > Sub-branch nesting; otherwise leave NULL for flat branches.

-- ------------------------------------------------------------
-- 2. COST CENTER (true child of Branch/Outlet)
-- ------------------------------------------------------------

CREATE TABLE cost_center (
    cost_center_id   BIGSERIAL PRIMARY KEY,
    tenant_id         BIGINT NOT NULL REFERENCES tenant(tenant_id),
    outlet_id         BIGINT NOT NULL REFERENCES outlet(outlet_id),  -- parent branch
    cost_center_code  VARCHAR(30) NOT NULL,
    cost_center_name  VARCHAR(150) NOT NULL,   -- e.g. 'Sales Floor', 'Warehouse', 'Delivery Team'
    is_active         BOOLEAN DEFAULT TRUE,

    CONSTRAINT uq_costcenter_code UNIQUE (tenant_id, cost_center_code)
);

CREATE INDEX idx_cc_outlet ON cost_center(outlet_id);

-- ------------------------------------------------------------
-- 3. SUPPLIER (independent master data, tenant-level, NOT nested
--    under branch or cost center)
-- ------------------------------------------------------------

CREATE TABLE supplier (
    supplier_id       BIGSERIAL PRIMARY KEY,
    tenant_id          BIGINT NOT NULL REFERENCES tenant(tenant_id),
    supplier_code      VARCHAR(30) NOT NULL,
    supplier_name      VARCHAR(150) NOT NULL,
    control_account_id BIGINT REFERENCES chart_of_accounts(account_id),
                       -- links to the AP control account (Level 4, e.g. 'Trade Payables')
                       -- so subledger totals roll up into the GL automatically
    payment_terms      VARCHAR(50),
    is_active          BOOLEAN DEFAULT TRUE,

    CONSTRAINT uq_supplier_code UNIQUE (tenant_id, supplier_code)
);

-- ------------------------------------------------------------
-- 4. CUSTOMER (independent master data, tenant-level, NOT nested
--    under branch or cost center)
-- ------------------------------------------------------------

CREATE TABLE customer (
    customer_id        BIGSERIAL PRIMARY KEY,
    tenant_id           BIGINT NOT NULL REFERENCES tenant(tenant_id),
    customer_code       VARCHAR(30) NOT NULL,
    customer_name       VARCHAR(150) NOT NULL,
    control_account_id  BIGINT REFERENCES chart_of_accounts(account_id),
                        -- links to the AR control account (Level 4, e.g. 'Trade Receivables')
    credit_limit        NUMERIC(14,2) DEFAULT 0,
    is_active           BOOLEAN DEFAULT TRUE,

    CONSTRAINT uq_customer_code UNIQUE (tenant_id, customer_code)
);

-- ------------------------------------------------------------
-- 5. TRANSACTION HEADER + LINE (this is where dimensions meet)
-- ------------------------------------------------------------

CREATE TABLE journal_entry (
    journal_id       BIGSERIAL PRIMARY KEY,
    tenant_id         BIGINT NOT NULL REFERENCES tenant(tenant_id),
    entry_date        DATE NOT NULL,
    reference_no      VARCHAR(50),
    description       VARCHAR(255),
    source_type       VARCHAR(30),   -- 'PURCHASE','SALE','PAYMENT','RECEIPT','MANUAL', etc.
    created_at        TIMESTAMP DEFAULT now()
);

CREATE TABLE journal_entry_line (
    line_id           BIGSERIAL PRIMARY KEY,
    journal_id        BIGINT NOT NULL REFERENCES journal_entry(journal_id) ON DELETE CASCADE,

    account_id        BIGINT NOT NULL REFERENCES chart_of_accounts(account_id),  -- WHAT (COA)

    -- Dimensions: all optional/nullable, tagged independently per line
    outlet_id         BIGINT NULL REFERENCES outlet(outlet_id),        -- WHERE (branch)
    cost_center_id    BIGINT NULL REFERENCES cost_center(cost_center_id), -- WHICH team/function
    supplier_id       BIGINT NULL REFERENCES supplier(supplier_id),    -- WHO (if purchase-related)
    customer_id       BIGINT NULL REFERENCES customer(customer_id),    -- WHO (if sale-related)

    debit             NUMERIC(14,2) DEFAULT 0,
    credit            NUMERIC(14,2) DEFAULT 0,

    CHECK (debit >= 0 AND credit >= 0),
    CHECK (NOT (debit > 0 AND credit > 0))   -- a line is either debit or credit, not both
);

CREATE INDEX idx_jel_account   ON journal_entry_line(account_id);
CREATE INDEX idx_jel_outlet    ON journal_entry_line(outlet_id);
CREATE INDEX idx_jel_costcenter ON journal_entry_line(cost_center_id);
CREATE INDEX idx_jel_supplier  ON journal_entry_line(supplier_id);
CREATE INDEX idx_jel_customer  ON journal_entry_line(customer_id);

-- ------------------------------------------------------------
-- 6. SAMPLE TRANSACTION
--    "Bought inventory worth 5000 from Supplier X, at Outlet A,
--     Cost Center = Warehouse"
-- ------------------------------------------------------------

INSERT INTO journal_entry (journal_id, tenant_id, entry_date, reference_no, description, source_type)
VALUES (1001, 101, '2026-09-27', 'PINV-0001', 'Inventory purchase - Supplier X', 'PURCHASE');

-- Debit: Inventory (Level 5 posting account)
INSERT INTO journal_entry_line (journal_id, account_id, outlet_id, cost_center_id, supplier_id, debit, credit)
VALUES (1001, 5, 1, 1, 1, 5000.00, 0);

-- Credit: Accounts Payable (Level 4/5 control account for that supplier)
INSERT INTO journal_entry_line (journal_id, account_id, outlet_id, cost_center_id, supplier_id, debit, credit)
VALUES (1001, 4, 1, 1, 1, 0, 5000.00);

-- ------------------------------------------------------------
-- 7. USEFUL QUERIES ACROSS DIMENSIONS
-- ------------------------------------------------------------

-- (a) Spend by supplier, broken down by branch and cost center
SELECT
    s.supplier_name,
    o.outlet_name,
    cc.cost_center_name,
    SUM(jel.debit) AS total_purchases
FROM journal_entry_line jel
JOIN supplier s      ON jel.supplier_id = s.supplier_id
JOIN outlet o        ON jel.outlet_id = o.outlet_id
JOIN cost_center cc  ON jel.cost_center_id = cc.cost_center_id
GROUP BY s.supplier_name, o.outlet_name, cc.cost_center_name
ORDER BY total_purchases DESC;

-- (b) Revenue by customer, per branch (e.g. which outlet sells most to which customer)
SELECT
    c.customer_name,
    o.outlet_name,
    SUM(jel.credit) AS total_sales
FROM journal_entry_line jel
JOIN customer c   ON jel.customer_id = c.customer_id
JOIN outlet o     ON jel.outlet_id = o.outlet_id
GROUP BY c.customer_name, o.outlet_name
ORDER BY total_sales DESC;

-- (c) Cost center performance (expenses only), rolled up per branch
SELECT
    o.outlet_name,
    cc.cost_center_name,
    ac.class_name,
    SUM(jel.debit) AS total_expense
FROM journal_entry_line jel
JOIN cost_center cc      ON jel.cost_center_id = cc.cost_center_id
JOIN outlet o            ON jel.outlet_id = o.outlet_id
JOIN chart_of_accounts coa ON jel.account_id = coa.account_id
JOIN account_class ac    ON coa.class_id = ac.class_id
WHERE ac.class_id = 5   -- Expenses
GROUP BY o.outlet_name, cc.cost_center_name, ac.class_name
ORDER BY total_expense DESC;

-- (d) Supplier ledger (subledger detail feeding the AP control account)
SELECT
    s.supplier_name,
    je.entry_date,
    je.reference_no,
    jel.debit,
    jel.credit
FROM journal_entry_line jel
JOIN journal_entry je ON jel.journal_id = je.journal_id
JOIN supplier s ON jel.supplier_id = s.supplier_id
WHERE s.supplier_id = 1
ORDER BY je.entry_date;


