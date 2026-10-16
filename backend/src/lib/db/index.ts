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
`);

try { sqlite.exec(`ALTER TABLE voucher_entry_policies ADD COLUMN numbering_formula TEXT DEFAULT '{TYPE}-{YYYY}-{MM}-{DD}-{SEQ}' NOT NULL;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE voucher_entry_policies ADD COLUMN reset_period TEXT DEFAULT 'YEARLY' NOT NULL;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE voucher_entry_policies ADD COLUMN pv_code TEXT DEFAULT 'PV' NOT NULL;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE voucher_entry_policies ADD COLUMN rv_code TEXT DEFAULT 'RV' NOT NULL;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE voucher_entry_policies ADD COLUMN cv_code TEXT DEFAULT 'CV' NOT NULL;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE voucher_entry_policies ADD COLUMN jv_code TEXT DEFAULT 'JV' NOT NULL;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE voucher_entry_policies ADD COLUMN seq_padding INTEGER DEFAULT 6 NOT NULL;`); } catch (e) {}

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

if (process.env.NODE_ENV !== 'production') {
  globalForDb.conn = sqlite;
}

const schema = { ...baseSchema, ...hrSchema, ...accSchema, ...productSchema, ...posSchema, ...deliveryOrdersSchema, ...cloudSchema };

export const db = drizzle(sqlite, { schema });

