-- ERP SQLite schema dump
-- Generated from last bootstrap (tax_categories, financial_years, inventory)
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE attendance (
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

CREATE TABLE batch_number_tracking (
    batch_id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    batch_number TEXT NOT NULL,
    received_quantity INTEGER NOT NULL,
    remaining_quantity INTEGER NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE,
    purchase_id TEXT,
    supplier_id TEXT,
    warehouse_id TEXT,
    location_bin TEXT,
    is_expired INTEGER DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_product_batch_number UNIQUE (product_id, batch_number)
  );

CREATE TABLE batch_transactions (
    transaction_id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    document_type TEXT NOT NULL,
    document_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    from_location TEXT,
    to_location TEXT,
    performed_by TEXT,
    transaction_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

CREATE TABLE batch_wise_stock (
    product_id TEXT NOT NULL,
    batch_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    PRIMARY KEY (product_id, batch_id)
  );

CREATE TABLE branches (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  is_main_branch INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE brands (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    brand_name TEXT NOT NULL,
    UNIQUE (tenant_id, brand_name)
  );

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE client_websites (
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

CREATE TABLE clients (
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
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE cloud_gl_ledger (
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

CREATE TABLE cloud_vouchers (
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

CREATE TABLE delivery_drivers (
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

CREATE TABLE delivery_orders (
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

CREATE TABLE departments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
    updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );

CREATE TABLE designations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    department_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
    updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );

CREATE TABLE document_sequences (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    document_type TEXT NOT NULL,
    date_prefix TEXT NOT NULL,
    current_sequence INTEGER DEFAULT 0 NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(tenant_id, document_type, date_prefix)
  );

CREATE TABLE employees (
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

CREATE TABLE financial_periods (
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

CREATE TABLE financial_years (
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

CREATE TABLE fiscal_year_opening_balances (
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

CREATE TABLE inventory_adjustment_items (
    id TEXT PRIMARY KEY,
    adjustment_id TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT NOT NULL,
    adjustment_type TEXT NOT NULL,
    quantity REAL NOT NULL
  );

CREATE TABLE inventory_adjustments (
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

CREATE TABLE inventory_transfer_items (
    id TEXT PRIMARY KEY,
    transfer_id TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT NOT NULL,
    quantity REAL NOT NULL
  );

CREATE TABLE inventory_transfers (
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

CREATE TABLE invoice_line_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  product_id TEXT,
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_code TEXT DEFAULT 'PCE' NOT NULL,
  unit_price REAL NOT NULL,
  discount_amount REAL DEFAULT 0 NOT NULL,
  tax_percent REAL DEFAULT 15 NOT NULL,
  tax_amount REAL NOT NULL,
  line_total REAL NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE invoice_payments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  invoice_id TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  amount REAL NOT NULL,
  reference_number TEXT,
  payment_date INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE invoices (
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
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE leave_requests (
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

CREATE TABLE loans (
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

CREATE TABLE login_attempts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  attempts INTEGER DEFAULT 0 NOT NULL,
  locked_until INTEGER,
  updated_at INTEGER NOT NULL
);

CREATE TABLE onboarding_subscriptions (
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

CREATE TABLE opening_stock (
    opening_stock_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    warehouse_id TEXT,
    location_bin TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_product_opening_stock UNIQUE (product_id, warehouse_id)
  );

CREATE TABLE order_status_logs (
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

CREATE TABLE overtime (
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

CREATE TABLE packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  price REAL NOT NULL,
  billing_cycle TEXT DEFAULT 'MONTHLY' NOT NULL,
  features TEXT NOT NULL,
  is_active INTEGER DEFAULT 1 NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE pay_grades (
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

CREATE TABLE pay_scales (
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

CREATE TABLE payroll (
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

CREATE TABLE product_images (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    color_id TEXT,
    size_id TEXT,
    image_url TEXT NOT NULL,
    is_primary INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

CREATE TABLE product_units (
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

CREATE TABLE product_variant_opening_stock (
    variant_opening_stock_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    product_variant_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    warehouse_id TEXT,
    location_bin TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_product_variant_opening_stock UNIQUE (product_variant_id, warehouse_id)
  );

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  is_category_wise_stock INTEGER DEFAULT 0,
  category_id TEXT,
  is_product_wise_stock INTEGER DEFAULT 0,
  is_parent_product INTEGER DEFAULT 0,
  parent_product_id TEXT,
  sku TEXT,
  name TEXT NOT NULL,
  product_name TEXT,
  description TEXT,
  brand_id TEXT,
  barcode TEXT,
  product_type_id TEXT,
  image_urls TEXT DEFAULT '[]' NOT NULL,
  unit_id TEXT,
  unit_code TEXT DEFAULT 'PCE' NOT NULL,
  is_packet_of_pieces INTEGER DEFAULT 0,
  packet_size INTEGER DEFAULT 1,
  is_weight_based INTEGER DEFAULT 0,
  weight REAL DEFAULT 1,
  cost_price REAL,
  margin_percentage REAL DEFAULT 20,
  price REAL NOT NULL,
  base_selling_price REAL,
  retail_price REAL DEFAULT 1,
  distributor_price REAL DEFAULT 1,
  special_price REAL DEFAULT 1,
  discount_amount REAL DEFAULT 0 NOT NULL,
  discounted_price REAL,
  tax_category_id TEXT,
  stock_quantity INTEGER DEFAULT 0 NOT NULL,
  stock_in_hand INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 5 NOT NULL,
  min_order_qty INTEGER DEFAULT 0,
  is_wholesaler INTEGER DEFAULT 0,
  is_distributor INTEGER DEFAULT 0,
  is_pharmacy INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
, "is_electronics" INTEGER DEFAULT 0, "is_model_number" INTEGER DEFAULT 0, "model_number" TEXT, "is_color_applicable" INTEGER DEFAULT 0, "color_id" TEXT, "is_storage_capacity_applicable" INTEGER DEFAULT 0, "storage_capacity" TEXT, "storage_capacity_id" TEXT, "is_ram_applicable" INTEGER DEFAULT 0, "ram" TEXT, "ram_id" TEXT, "is_warranty_applicable" INTEGER DEFAULT 0, "warranty_months" INTEGER DEFAULT 0, "warrenty_periods_days" INTEGER DEFAULT 0, "warranty_provider_id" TEXT, "is_color_variant" INTEGER DEFAULT 0, "color_variant_id" TEXT, "is_size_variant" INTEGER DEFAULT 0, "size_variant_id" TEXT, "size_variant_ids" TEXT DEFAULT '[]', "is_imei_required" INTEGER DEFAULT 0, "requires_serial_tracking" INTEGER DEFAULT 0, "is_medicine" INTEGER DEFAULT 0, "is_generic_name_applicable" INTEGER DEFAULT 0, "generic_name" TEXT, "is_active_ingredient_applicable" INTEGER DEFAULT 0, "active_ingredient" TEXT, "is_strength_applicable" INTEGER DEFAULT 0, "strength_id" TEXT, "is_dosage_form_applicable" INTEGER DEFAULT 0, "dosage_form_id" TEXT, "is_manufacturer_applicable" INTEGER DEFAULT 0, "manufacturer_id" TEXT, "is_marketing_auth_holder_applicable" INTEGER DEFAULT 0, "marketing_auth_holder_id" TEXT, "is_prescription_required" INTEGER DEFAULT 0, "controlled_substance_schedule" TEXT, "storage_condition_id" TEXT, "requires_batch_tracking" INTEGER DEFAULT 0, "is_apparel" INTEGER DEFAULT 0, "apparel_product_type_id" TEXT, "fiber_composition" TEXT, "gender_id" TEXT, "age_group_id" TEXT, "size_id" TEXT, "is_underwear" INTEGER DEFAULT 0, "is_tax_exempt" INTEGER DEFAULT 0, "is_points_applicable" INTEGER DEFAULT 0, "points_perproduct" INTEGER DEFAULT 0, "is_product_display_pos_app" INTEGER DEFAULT 1, "is_product_display_website_app" INTEGER DEFAULT 0, "is_product_display_rack_label" INTEGER DEFAULT 0, "is_product_display_tag" INTEGER DEFAULT 0, "is_product_display_price_tag" INTEGER DEFAULT 0, "is_product_display_hanging_tag" INTEGER DEFAULT 0, "is_product_display_electronic_scale" INTEGER DEFAULT 0, "is_product_display_weighing_scale" INTEGER DEFAULT 0, "is_verified_by_buyer" INTEGER DEFAULT 0, "is_verified_by_supplier" INTEGER DEFAULT 0, "is_offers" INTEGER DEFAULT 0, "return_days" INTEGER DEFAULT 7, "exchange_days" INTEGER DEFAULT 30, "promised_delivery_days" INTEGER DEFAULT 2, "is_payment_available_cod" INTEGER DEFAULT 1, "is_accelerated_checkout_available" INTEGER DEFAULT 0, "is_subscription_available" INTEGER DEFAULT 0, is_discountable INTEGER DEFAULT 1, is_excizable INTEGER DEFAULT 0);

CREATE TABLE serial_number_tracking (
    serial_id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    supplier_id TEXT,
    shipment_id TEXT,
    invoice_id TEXT,
    return_id TEXT,
    warehouse_id TEXT,
    location_bin TEXT,
    status TEXT DEFAULT 'IN_STOCK',
    sold_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sales_order_id TEXT,
    customer_id TEXT,
    warranty_expiry DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

CREATE TABLE serial_transactions (
    transaction_id TEXT PRIMARY KEY,
    serial_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    document_type TEXT NOT NULL,
    document_id TEXT NOT NULL,
    from_location TEXT,
    to_location TEXT,
    performed_by TEXT,
    transaction_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

CREATE TABLE sub_categories (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT
  );

CREATE TABLE subscription_tracking (
    subscription_id TEXT PRIMARY KEY,
    subscription_tracking_id TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    plan_description TEXT NOT NULL,
    plan_price REAL NOT NULL,
    plan_interval TEXT NOT NULL,
    plan_interval_count INTEGER NOT NULL,
    plan_status TEXT DEFAULT 'ACTIVE',
    plan_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    plan_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  status TEXT DEFAULT 'ACTIVE' NOT NULL,
  current_period_start INTEGER NOT NULL,
  current_period_end INTEGER NOT NULL,
  cancel_at_period_end INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE supplier_bills (
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

CREATE TABLE supplier_quotations (
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

CREATE TABLE supplier_return_items (
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

CREATE TABLE supplier_returns (
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

CREATE TABLE tax_categories (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    category_name TEXT NOT NULL,
    tax_rate REAL NOT NULL,
    UNIQUE (tenant_id, category_name)
  );

CREATE TABLE tenant_settings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,
  business_type TEXT DEFAULT 'Retail' NOT NULL,
  purchase_flow_type TEXT DEFAULT 'NORMAL' NOT NULL,
  product_policy TEXT DEFAULT '{}' NOT NULL,
  receipt_settings TEXT DEFAULT '{}' NOT NULL,
  smtp_settings TEXT DEFAULT '{}' NOT NULL,
  package_plan TEXT DEFAULT 'free' NOT NULL,
  max_branches INTEGER DEFAULT 1 NOT NULL,
  max_users INTEGER DEFAULT 2 NOT NULL,
  monthly_bill_limit INTEGER DEFAULT 300 NOT NULL,
  feature_flags TEXT DEFAULT '{}' NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  parent_tenant_id TEXT,
  name TEXT NOT NULL,
  vat_number TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  subdomain TEXT UNIQUE,
  logo_url TEXT,
  status TEXT DEFAULT 'ACTIVE' NOT NULL,
  whatsapp_number TEXT,
  payment_gateway TEXT DEFAULT 'TAP' NOT NULL,
  stripe_secret_key TEXT,
  tap_secret_key TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
, address TEXT, country_code TEXT DEFAULT 'SA', currency_code TEXT DEFAULT 'SAR', currency_symbol TEXT DEFAULT 'SAR', tax_rate REAL DEFAULT 15, tax_type TEXT DEFAULT 'VAT', timezone TEXT DEFAULT 'Asia/Riyadh', date_format TEXT DEFAULT 'YYYY-MM-DD', decimal_places INTEGER DEFAULT 2, marketing_plan TEXT DEFAULT 'STANDARD');

CREATE TABLE units (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    base_unit INTEGER DEFAULT 1 NOT NULL
  );

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'TENANT_USER' NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE voucher_entry_policies (
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

CREATE TABLE year_end_closing_audit (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    financial_year_id TEXT NOT NULL,
    closing_journal_entry_id TEXT NOT NULL,
    net_income_amount REAL NOT NULL,
    closed_by_user_id TEXT NOT NULL,
    closed_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );

COMMIT;
