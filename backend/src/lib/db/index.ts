import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as baseSchema from './schema';
import * as hrSchema from './hr_schema';
import * as accSchema from './accounting_schema';
import * as productSchema from './product_schema';
import * as posSchema from './pos_schema';
import * as deliveryOrdersSchema from './delivery_orders_schema';
import * as cloudSchema from './cloud_schema';

const globalForDb = globalThis as unknown as {
  conn: Database.Database | undefined;
};

const dbPath = process.env.SQLITE_DB_PATH || 'sqlite.db';
const sqlite = globalForDb.conn ?? new Database(dbPath);

// Ensure supplier_returns, supplier_return_items, onboarding_subscriptions and other tables exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS supplier_returns (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    return_number TEXT NOT NULL,
    debit_note_number TEXT,
    supplier_id TEXT NOT NULL,
    supplier_name TEXT,
    original_bill_id TEXT,
    bill_number TEXT,
    return_date TEXT NOT NULL,
    reason TEXT DEFAULT 'DEFECTIVE' NOT NULL,
    subtotal_amount REAL DEFAULT 0 NOT NULL,
    vat_amount REAL DEFAULT 0 NOT NULL,
    total_amount REAL DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'DRAFT' NOT NULL,
    refund_status TEXT DEFAULT 'PENDING' NOT NULL,
    remarks TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
  );

  CREATE TABLE IF NOT EXISTS supplier_return_items (
    id TEXT PRIMARY KEY,
    return_id TEXT NOT NULL REFERENCES supplier_returns(id) ON DELETE CASCADE,
    product_id TEXT,
    item_description TEXT NOT NULL,
    unit_price REAL DEFAULT 0 NOT NULL,
    quantity REAL DEFAULT 1 NOT NULL,
    vat_rate REAL DEFAULT 15.0 NOT NULL,
    vat_amount REAL DEFAULT 0 NOT NULL,
    total_amount REAL DEFAULT 0 NOT NULL,
    reason TEXT
  );

  CREATE TABLE IF NOT EXISTS voucher_entry_policies (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL UNIQUE,
    require_cashier_approval INTEGER DEFAULT 1 NOT NULL,
    pos_voucher_control TEXT DEFAULT 'ACCOUNTANT_APPROVAL' NOT NULL,
    direct_post_system_vouchers INTEGER DEFAULT 1 NOT NULL,
    numbering_formula TEXT DEFAULT '{TYPE}-{YYYY}-{MM}-{DD}-{SEQ}' NOT NULL,
    reset_period TEXT DEFAULT 'YEARLY' NOT NULL,
    pv_code TEXT DEFAULT 'PV' NOT NULL,
    rv_code TEXT DEFAULT 'RV' NOT NULL,
    cv_code TEXT DEFAULT 'CV' NOT NULL,
    jv_code TEXT DEFAULT 'JV' NOT NULL,
    seq_padding INTEGER DEFAULT 6 NOT NULL,
    updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    price REAL NOT NULL,
    billing_cycle TEXT DEFAULT 'MONTHLY' NOT NULL,
    features TEXT NOT NULL,
    is_active INTEGER DEFAULT 1 NOT NULL,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    package_id TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE' NOT NULL,
    current_period_start INTEGER NOT NULL,
    current_period_end INTEGER NOT NULL,
    cancel_at_period_end INTEGER DEFAULT 0 NOT NULL,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
    updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    client_id TEXT,
    counter_id TEXT,
    branch_id TEXT,
    cost_center_id TEXT,
    original_invoice_id TEXT,
    invoice_number TEXT NOT NULL,
    invoice_type TEXT NOT NULL,
    invoice_type_code TEXT DEFAULT '388' NOT NULL,
    seller_name TEXT NOT NULL,
    seller_vat TEXT NOT NULL,
    seller_address TEXT NOT NULL,
    buyer_name TEXT,
    buyer_vat TEXT,
    buyer_address TEXT,
    subtotal_amount REAL NOT NULL,
    total_vat_amount REAL NOT NULL,
    total_amount REAL NOT NULL,
    currency_code TEXT DEFAULT 'SAR' NOT NULL,
    issue_datetime INTEGER NOT NULL,
    invoice_hash TEXT,
    previous_hash TEXT,
    ubl_xml_s3_key TEXT,
    pdf_s3_key TEXT,
    qr_code_base64 TEXT,
    zatca_status TEXT DEFAULT 'PENDING' NOT NULL,
    zatca_warnings TEXT,
    zatca_errors TEXT,
    zatca_cleared_at INTEGER,
    whatsapp_status TEXT DEFAULT 'PENDING' NOT NULL,
    payment_status TEXT DEFAULT 'UNPAID' NOT NULL,
    payment_gateway TEXT,
    paid_at INTEGER,
    delivery_type TEXT DEFAULT 'take_away',
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
    updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    vat_number TEXT,
    address TEXT,
    email TEXT,
    phone_number TEXT,
    country TEXT,
    state TEXT,
    city TEXT,
    customer_type TEXT DEFAULT 'newCustomer',
    funds REAL DEFAULT 0,
    dues REAL DEFAULT 0,
    permit_credit INTEGER DEFAULT 0 NOT NULL,
    credit_limit REAL DEFAULT 0 NOT NULL,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
    updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS onboarding_subscriptions (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    subdomain TEXT NOT NULL UNIQUE,
    package_plan TEXT NOT NULL,
    billing_cycle TEXT DEFAULT 'annual' NOT NULL,
    payment_status TEXT DEFAULT 'pending' NOT NULL,
    email_verified INTEGER DEFAULT 0 NOT NULL,
    verification_token TEXT,
    vps_provisioned INTEGER DEFAULT 0 NOT NULL,
    client_url TEXT,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
    updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS client_websites (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    client_id TEXT,
    domain_name TEXT NOT NULL UNIQUE,
    app_type TEXT NOT NULL,
    app_port INTEGER,
    document_root TEXT,
    php_version TEXT,
    status TEXT DEFAULT 'pending' NOT NULL,
    ssl_active INTEGER DEFAULT 0 NOT NULL,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
    updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS supplier_quotations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    quotation_number TEXT NOT NULL,
    supplier_ref_no TEXT,
    document_url TEXT,
    issue_date INTEGER NOT NULL,
    valid_until INTEGER,
    subtotal_amount REAL NOT NULL,
    total_vat_amount REAL NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'SUBMITTED' NOT NULL,
    remarks TEXT,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
    updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cloud_vouchers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    branch_id TEXT,
    voucher_number TEXT NOT NULL,
    voucher_type TEXT NOT NULL,
    voucher_date INTEGER NOT NULL,
    fiscal_year TEXT NOT NULL,
    period_number INTEGER NOT NULL,
    fund_id TEXT,
    cost_center_id TEXT,
    narration TEXT NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT NOT NULL,
    maker_id TEXT NOT NULL,
    checker_id TEXT,
    approver_id TEXT,
    local_device_id TEXT,
    synced_at INTEGER,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
    updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cloud_gl_ledger (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    voucher_id TEXT NOT NULL REFERENCES cloud_vouchers(id),
    voucher_number TEXT NOT NULL,
    voucher_date INTEGER NOT NULL,
    account_id TEXT NOT NULL,
    cost_center_id TEXT,
    fund_id TEXT,
    debit_amount REAL NOT NULL,
    credit_amount REAL NOT NULL,
    posted_at INTEGER,
    fiscal_year TEXT NOT NULL,
    period_number INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pay_grades (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    grade_code TEXT NOT NULL,
    grade_name TEXT NOT NULL,
    min_salary REAL DEFAULT 0 NOT NULL,
    max_salary REAL DEFAULT 0 NOT NULL,
    housing_allowance_percent REAL DEFAULT 25 NOT NULL,
    transport_allowance_percent REAL DEFAULT 10 NOT NULL,
    description TEXT,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
    updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pay_scales (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    grade_id TEXT REFERENCES pay_grades(id) ON DELETE CASCADE,
    grade_code TEXT,
    scale_name TEXT NOT NULL,
    basic_salary REAL DEFAULT 0 NOT NULL,
    housing_allowance REAL DEFAULT 0 NOT NULL,
    transport_allowance REAL DEFAULT 0 NOT NULL,
    medical_allowance REAL DEFAULT 0 NOT NULL,
    other_allowances REAL DEFAULT 0 NOT NULL,
    total_package REAL DEFAULT 0 NOT NULL,
    increment_rate REAL DEFAULT 0,
    description TEXT,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
    updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS financial_years (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    from_date INTEGER NOT NULL,
    to_date INTEGER NOT NULL,
    is_active INTEGER DEFAULT 0 NOT NULL,
    is_closed INTEGER DEFAULT 0 NOT NULL,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
    updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS financial_periods (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    financial_year_id TEXT NOT NULL,
    period_number INTEGER NOT NULL,
    period_name TEXT NOT NULL,
    from_date INTEGER NOT NULL,
    to_date INTEGER NOT NULL,
    is_locked INTEGER DEFAULT 0 NOT NULL,
    locked_at INTEGER,
    locked_by TEXT,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS fiscal_year_opening_balances (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    financial_year_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    opening_debit REAL DEFAULT 0 NOT NULL,
    opening_credit REAL DEFAULT 0 NOT NULL,
    opening_net REAL DEFAULT 0 NOT NULL,
    is_genesis INTEGER DEFAULT 0 NOT NULL,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
    updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
    UNIQUE(tenant_id, financial_year_id, account_id)
  );

  CREATE TABLE IF NOT EXISTS year_end_closing_audit (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    financial_year_id TEXT NOT NULL,
    closing_journal_entry_id TEXT NOT NULL,
    net_income_amount REAL NOT NULL,
    closed_by_user_id TEXT NOT NULL,
    closed_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS document_sequences (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    document_type TEXT NOT NULL,
    date_prefix TEXT NOT NULL,
    current_sequence INTEGER DEFAULT 0 NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(tenant_id, document_type, date_prefix)
  );

  CREATE TABLE IF NOT EXISTS supplier_bills (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    bill_number TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    supplier_name TEXT,
    po_id TEXT,
    grn_id TEXT,
    issue_date TEXT NOT NULL,
    due_date TEXT,
    subtotal_amount REAL DEFAULT 0 NOT NULL,
    discount_amount REAL DEFAULT 0 NOT NULL,
    vat_amount REAL DEFAULT 0 NOT NULL,
    total_amount REAL DEFAULT 0 NOT NULL,
    paid_amount REAL DEFAULT 0 NOT NULL,
    payment_status TEXT DEFAULT 'UNPAID' NOT NULL,
    reference_doc_url TEXT,
    reference_doc_name TEXT,
    remarks TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
  );

  CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
    updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS designations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    department_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
    updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT,
    department_id TEXT,
    designation_id TEXT,
    branch_id TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    father_name TEXT,
    mother_name TEXT,
    address TEXT,
    email TEXT,
    phone TEXT,
    department_name TEXT,
    designation_name TEXT,
    manager_id TEXT,
    manager_name TEXT,
    job_responsibility TEXT,
    working_hours TEXT,
    off_day TEXT,
    shift_info TEXT,
    yearly_benefits TEXT,
    national_id TEXT,
    iqama_expiry_date INTEGER,
    passport_number TEXT,
    passport_expiry_date INTEGER,
    gosi_number TEXT,
    joining_date INTEGER,
    basic_salary REAL DEFAULT 0,
    pay_grade TEXT,
    pay_scale TEXT,
    housing_allowance REAL DEFAULT 0,
    transport_allowance REAL DEFAULT 0,
    other_allowance REAL DEFAULT 0,
    profile_picture TEXT,
    experiences TEXT,
    skills TEXT,
    educations TEXT,
    documents TEXT,
    payment_method TEXT DEFAULT 'BANK' NOT NULL,
    status TEXT DEFAULT 'ACTIVE' NOT NULL,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
    updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    date INTEGER NOT NULL,
    check_in INTEGER,
    check_out INTEGER,
    status TEXT DEFAULT 'PRESENT' NOT NULL,
    notes TEXT,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS leave_requests (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    leave_type TEXT NOT NULL,
    start_date INTEGER NOT NULL,
    end_date INTEGER NOT NULL,
    duration_days REAL NOT NULL,
    status TEXT DEFAULT 'PENDING' NOT NULL,
    reason TEXT,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
    updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS overtime (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    date INTEGER NOT NULL,
    hours REAL NOT NULL,
    status TEXT DEFAULT 'PENDING' NOT NULL,
    reason TEXT,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
    updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payroll (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    basic_salary REAL DEFAULT 0 NOT NULL,
    housing_allowance REAL DEFAULT 0,
    transport_allowance REAL DEFAULT 0,
    other_allowance REAL DEFAULT 0,
    allowances REAL DEFAULT 0 NOT NULL,
    overtime_hours REAL DEFAULT 0,
    overtime_pay REAL DEFAULT 0,
    present_days INTEGER DEFAULT 0,
    absent_days INTEGER DEFAULT 0,
    late_days INTEGER DEFAULT 0,
    fines_penalties REAL DEFAULT 0,
    loan_deduction REAL DEFAULT 0,
    gosi_deduction REAL DEFAULT 0,
    deductions REAL DEFAULT 0 NOT NULL,
    net_salary REAL DEFAULT 0 NOT NULL,
    start_date TEXT,
    end_date TEXT,
    payment_date INTEGER,
    payment_method TEXT,
    status TEXT DEFAULT 'DRAFT' NOT NULL,
    department_name TEXT,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
    updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    amount REAL NOT NULL,
    monthly_installment REAL NOT NULL,
    remaining_amount REAL NOT NULL,
    status TEXT DEFAULT 'PENDING' NOT NULL,
    reason TEXT,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
    updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );
`);

try { sqlite.exec(`ALTER TABLE voucher_entry_policies ADD COLUMN numbering_formula TEXT DEFAULT '{TYPE}-{YYYY}-{MM}-{DD}-{SEQ}' NOT NULL;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE voucher_entry_policies ADD COLUMN reset_period TEXT DEFAULT 'YEARLY' NOT NULL;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE voucher_entry_policies ADD COLUMN pv_code TEXT DEFAULT 'PV' NOT NULL;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE voucher_entry_policies ADD COLUMN rv_code TEXT DEFAULT 'RV' NOT NULL;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE voucher_entry_policies ADD COLUMN cv_code TEXT DEFAULT 'CV' NOT NULL;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE voucher_entry_policies ADD COLUMN jv_code TEXT DEFAULT 'JV' NOT NULL;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE voucher_entry_policies ADD COLUMN seq_padding INTEGER DEFAULT 6 NOT NULL;`); } catch (e) {}

try { sqlite.exec(`ALTER TABLE tenants ADD COLUMN address TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE tenants ADD COLUMN country_code TEXT DEFAULT 'SA';`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE tenants ADD COLUMN currency_code TEXT DEFAULT 'SAR';`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE tenants ADD COLUMN currency_symbol TEXT DEFAULT 'SAR';`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE tenants ADD COLUMN tax_rate REAL DEFAULT 15;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE tenants ADD COLUMN tax_type TEXT DEFAULT 'VAT';`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE tenants ADD COLUMN timezone TEXT DEFAULT 'Asia/Riyadh';`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE tenants ADD COLUMN date_format TEXT DEFAULT 'YYYY-MM-DD';`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE tenants ADD COLUMN decimal_places INTEGER DEFAULT 2;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE tenants ADD COLUMN marketing_plan TEXT DEFAULT 'STANDARD';`); } catch (e) {}

try {
  sqlite.exec(`ALTER TABLE tenant_settings ADD COLUMN smtp_settings TEXT DEFAULT '{}' NOT NULL;`);
} catch (e) {}

try { sqlite.exec(`ALTER TABLE tenant_settings ADD COLUMN package_plan TEXT DEFAULT 'free' NOT NULL;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE tenant_settings ADD COLUMN max_branches INTEGER DEFAULT 1 NOT NULL;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE tenant_settings ADD COLUMN max_users INTEGER DEFAULT 2 NOT NULL;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE tenant_settings ADD COLUMN monthly_bill_limit INTEGER DEFAULT 300 NOT NULL;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE tenant_settings ADD COLUMN feature_flags TEXT DEFAULT '{}' NOT NULL;`); } catch (e) {}

try { sqlite.exec(`ALTER TABLE supplier_quotations ADD COLUMN supplier_ref_no TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE supplier_quotations ADD COLUMN document_url TEXT;`); } catch (e) {}

try { sqlite.exec(`ALTER TABLE supplier_bills ADD COLUMN discount_amount REAL DEFAULT 0;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE supplier_bills ADD COLUMN reference_doc_url TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE supplier_bills ADD COLUMN reference_doc_name TEXT;`); } catch (e) {}

try { sqlite.exec(`ALTER TABLE employees ADD COLUMN father_name TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE employees ADD COLUMN mother_name TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE employees ADD COLUMN address TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE employees ADD COLUMN department_name TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE employees ADD COLUMN designation_name TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE employees ADD COLUMN job_responsibility TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE employees ADD COLUMN working_hours TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE employees ADD COLUMN off_day TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE employees ADD COLUMN shift_info TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE employees ADD COLUMN yearly_benefits TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE employees ADD COLUMN experiences TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE employees ADD COLUMN skills TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE employees ADD COLUMN educations TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE employees ADD COLUMN manager_id TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE employees ADD COLUMN manager_name TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE employees ADD COLUMN documents TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE employees ADD COLUMN pay_grade TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE employees ADD COLUMN pay_scale TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE employees ADD COLUMN housing_allowance REAL DEFAULT 0;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE employees ADD COLUMN transport_allowance REAL DEFAULT 0;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE employees ADD COLUMN other_allowance REAL DEFAULT 0;`); } catch (e) {}

try { sqlite.exec(`ALTER TABLE payroll ADD COLUMN housing_allowance REAL DEFAULT 0;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE payroll ADD COLUMN transport_allowance REAL DEFAULT 0;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE payroll ADD COLUMN other_allowance REAL DEFAULT 0;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE payroll ADD COLUMN overtime_hours REAL DEFAULT 0;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE payroll ADD COLUMN overtime_pay REAL DEFAULT 0;`); } catch (e) {}

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS brands (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    brand_name TEXT NOT NULL,
    UNIQUE (tenant_id, brand_name)
  );
`);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS tax_categories (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    category_name TEXT NOT NULL,
    tax_rate REAL NOT NULL,
    UNIQUE (tenant_id, category_name)
  );
`);

try { sqlite.exec(`ALTER TABLE products ADD COLUMN is_discountable INTEGER DEFAULT 1;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE products ADD COLUMN is_excizable INTEGER DEFAULT 0;`); } catch (e) {}

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS sub_categories (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT
  );
`);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS units (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    base_unit INTEGER DEFAULT 1 NOT NULL
  );
`);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS product_units (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    unit_code TEXT NOT NULL,
    conversion_factor REAL NOT NULL,
    barcode TEXT,
    price REAL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS inventory_transfers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    transfer_number TEXT NOT NULL,
    from_warehouse_id TEXT NOT NULL,
    from_warehouse_name TEXT,
    to_warehouse_id TEXT NOT NULL,
    to_warehouse_name TEXT,
    status TEXT DEFAULT 'COMPLETED' NOT NULL,
    transfer_date TEXT NOT NULL,
    remarks TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
  );
`);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS inventory_transfer_items (
    id TEXT PRIMARY KEY,
    transfer_id TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT NOT NULL,
    quantity REAL NOT NULL
  );
`);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    adjustment_number TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    warehouse_name TEXT,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'APPROVED' NOT NULL,
    adjusted_by TEXT,
    adjustment_date TEXT NOT NULL,
    remarks TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
  );
`);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS inventory_adjustment_items (
    id TEXT PRIMARY KEY,
    adjustment_id TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT NOT NULL,
    adjustment_type TEXT NOT NULL,
    quantity REAL NOT NULL
  );
`);
try { sqlite.exec(`ALTER TABLE payroll ADD COLUMN present_days INTEGER DEFAULT 0;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE payroll ADD COLUMN absent_days INTEGER DEFAULT 0;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE payroll ADD COLUMN late_days INTEGER DEFAULT 0;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE payroll ADD COLUMN fines_penalties REAL DEFAULT 0;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE payroll ADD COLUMN loan_deduction REAL DEFAULT 0;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE payroll ADD COLUMN gosi_deduction REAL DEFAULT 0;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE payroll ADD COLUMN department_name TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE payroll ADD COLUMN start_date TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE payroll ADD COLUMN end_date TEXT;`); } catch (e) {}

try { sqlite.exec(`ALTER TABLE cost_centers ADD COLUMN code TEXT DEFAULT 'CC-001' NOT NULL;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE cost_centers ADD COLUMN source_type TEXT DEFAULT 'GENERAL' NOT NULL;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE cost_centers ADD COLUMN source_id TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE cost_centers ADD COLUMN category TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE cost_centers ADD COLUMN monthly_budget REAL DEFAULT 0 NOT NULL;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE accounts ADD COLUMN has_cost_center INTEGER DEFAULT 0 NOT NULL;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE voucher_lines ADD COLUMN cost_center_id TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE journal_entry_lines ADD COLUMN cost_center_id TEXT;`); } catch (e) {}

const productColumns = [
  ['is_electronics', 'INTEGER DEFAULT 0'],
  ['is_model_number', 'INTEGER DEFAULT 0'],
  ['model_number', 'TEXT'],
  ['is_color_applicable', 'INTEGER DEFAULT 0'],
  ['color_id', 'TEXT'],
  ['is_storage_capacity_applicable', 'INTEGER DEFAULT 0'],
  ['storage_capacity', 'TEXT'],
  ['storage_capacity_id', 'TEXT'],
  ['is_ram_applicable', 'INTEGER DEFAULT 0'],
  ['ram', 'TEXT'],
  ['ram_id', 'TEXT'],
  ['is_warranty_applicable', 'INTEGER DEFAULT 0'],
  ['warranty_months', 'INTEGER DEFAULT 0'],
  ['warrenty_periods_days', 'INTEGER DEFAULT 0'],
  ['warranty_provider_id', 'TEXT'],
  ['is_imei_required', 'INTEGER DEFAULT 0'],
  ['requires_serial_tracking', 'INTEGER DEFAULT 0'],
  ['is_color_variant', 'INTEGER DEFAULT 0'],
  ['color_variant_id', 'TEXT'],
  ['is_size_variant', 'INTEGER DEFAULT 0'],
  ['size_variant_id', 'TEXT'],
  ['size_variant_ids', "TEXT DEFAULT '[]'"],
  ['is_medicine', 'INTEGER DEFAULT 0'],
  ['is_generic_name_applicable', 'INTEGER DEFAULT 0'],
  ['generic_name', 'TEXT'],
  ['is_active_ingredient_applicable', 'INTEGER DEFAULT 0'],
  ['active_ingredient', 'TEXT'],
  ['is_strength_applicable', 'INTEGER DEFAULT 0'],
  ['strength_id', 'TEXT'],
  ['is_dosage_form_applicable', 'INTEGER DEFAULT 0'],
  ['dosage_form_id', 'TEXT'],
  ['is_manufacturer_applicable', 'INTEGER DEFAULT 0'],
  ['manufacturer_id', 'TEXT'],
  ['is_marketing_auth_holder_applicable', 'INTEGER DEFAULT 0'],
  ['marketing_auth_holder_id', 'TEXT'],
  ['is_prescription_required', 'INTEGER DEFAULT 0'],
  ['controlled_substance_schedule', 'TEXT'],
  ['storage_condition_id', 'TEXT'],
  ['requires_batch_tracking', 'INTEGER DEFAULT 0'],
  ['is_apparel', 'INTEGER DEFAULT 0'],
  ['apparel_product_type_id', 'TEXT'],
  ['fiber_composition', 'TEXT'],
  ['gender_id', 'TEXT'],
  ['age_group_id', 'TEXT'],
  ['size_id', 'TEXT'],
  ['is_underwear', 'INTEGER DEFAULT 0'],
  ['is_tax_exempt', 'INTEGER DEFAULT 0'],
  ['is_points_applicable', 'INTEGER DEFAULT 0'],
  ['points_perproduct', 'INTEGER DEFAULT 0'],
  ['is_product_display_pos_app', 'INTEGER DEFAULT 1'],
  ['is_product_display_website_app', 'INTEGER DEFAULT 0'],
  ['is_product_display_rack_label', 'INTEGER DEFAULT 0'],
  ['is_product_display_tag', 'INTEGER DEFAULT 0'],
  ['is_product_display_price_tag', 'INTEGER DEFAULT 0'],
  ['is_product_display_hanging_tag', 'INTEGER DEFAULT 0'],
  ['is_product_display_electronic_scale', 'INTEGER DEFAULT 0'],
  ['is_product_display_weighing_scale', 'INTEGER DEFAULT 0'],
  ['is_verified_by_buyer', 'INTEGER DEFAULT 0'],
  ['is_verified_by_supplier', 'INTEGER DEFAULT 0'],
  ['is_offers', 'INTEGER DEFAULT 0'],
  ['return_days', 'INTEGER DEFAULT 7'],
  ['exchange_days', 'INTEGER DEFAULT 30'],
  ['promised_delivery_days', 'INTEGER DEFAULT 2'],
  ['is_payment_available_cod', 'INTEGER DEFAULT 1'],
  ['is_accelerated_checkout_available', 'INTEGER DEFAULT 0'],
  ['is_subscription_available', 'INTEGER DEFAULT 0']
];
for (const [colName, colType] of productColumns) {
  try { sqlite.exec(`ALTER TABLE products ADD COLUMN "${colName}" ${colType}`); } catch (e) {}
}

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS delivery_drivers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle_type TEXT DEFAULT 'bike' NOT NULL,
    vehicle_plate TEXT,
    is_active INTEGER DEFAULT 1 NOT NULL,
    is_available INTEGER DEFAULT 1 NOT NULL,
    current_latitude REAL,
    current_longitude REAL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS delivery_orders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    order_number TEXT NOT NULL UNIQUE,
    invoice_id TEXT,
    order_type TEXT NOT NULL DEFAULT 'take_away',
    channel TEXT NOT NULL DEFAULT 'pos',
    status TEXT NOT NULL DEFAULT 'WFC',
    aggregator TEXT,
    aggregator_reference TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    delivery_address TEXT,
    delivery_latitude REAL,
    delivery_longitude REAL,
    table_number TEXT,
    driver_id TEXT,
    driver_name TEXT,
    driver_phone TEXT,
    vehicle_info TEXT,
    delivery_fee REAL DEFAULT 0 NOT NULL,
    subtotal REAL DEFAULT 0 NOT NULL,
    tax_amount REAL DEFAULT 0 NOT NULL,
    discount_amount REAL DEFAULT 0 NOT NULL,
    total_amount REAL DEFAULT 0 NOT NULL,
    items TEXT NOT NULL,
    note TEXT,
    estimated_time_minutes INTEGER DEFAULT 30 NOT NULL,
    confirmed_at INTEGER,
    cooking_started_at INTEGER,
    ready_at INTEGER,
    dispatched_at INTEGER,
    delivered_at INTEGER,
    cancelled_at INTEGER,
    cancel_reason TEXT,
    cancelled_by TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS order_status_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by TEXT,
    actor_role TEXT DEFAULT 'cashier' NOT NULL,
    note TEXT,
    created_at INTEGER NOT NULL
  );
`);

if (process.env.NODE_ENV !== 'production') {
  globalForDb.conn = sqlite;
}

const schema = { ...baseSchema, ...hrSchema, ...accSchema, ...productSchema, ...posSchema, ...deliveryOrdersSchema, ...cloudSchema };

export const db = drizzle(sqlite, { schema });

