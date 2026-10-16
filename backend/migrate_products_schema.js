const Database = require('better-sqlite3');
const db = new Database('sqlite.db');

const columnsToAdd = [
  ['is_category_wise_stock', 'INTEGER DEFAULT 0'],
  ['is_product_wise_stock', 'INTEGER DEFAULT 0'],
  ['is_parent_product', 'INTEGER DEFAULT 0'],
  ['parent_product_id', 'TEXT'],
  ['sku', 'TEXT'],
  ['product_name', 'TEXT'],
  ['brand_id', 'TEXT'],
  ['product_type_id', 'TEXT'],
  ['image_urls', "TEXT DEFAULT '[]'"],
  ['unit_id', 'TEXT'],
  ['is_packet_of_pieces', 'INTEGER DEFAULT 0'],
  ['packet_size', 'INTEGER DEFAULT 1'],
  ['is_weight_based', 'INTEGER DEFAULT 0'],
  ['weight', 'REAL DEFAULT 1'],
  ['margin_percentage', 'REAL DEFAULT 20'],
  ['base_selling_price', 'REAL'],
  ['retail_price', 'REAL DEFAULT 1'],
  ['distributor_price', 'REAL DEFAULT 1'],
  ['special_price', 'REAL DEFAULT 1'],
  ['discounted_price', 'REAL'],
  ['tax_category_id', 'TEXT'],
  ['stock_in_hand', 'INTEGER DEFAULT 0'],
  ['min_order_qty', 'INTEGER DEFAULT 0'],
  ['is_wholesaler', 'INTEGER DEFAULT 0'],
  ['is_distributor', 'INTEGER DEFAULT 0'],
  ['is_pharmacy', 'INTEGER DEFAULT 0'],
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
  ['is_color_variant', 'INTEGER DEFAULT 0'],
  ['color_variant_id', 'TEXT'],
  ['is_size_variant', 'INTEGER DEFAULT 0'],
  ['size_variant_id', 'TEXT'],
  ['size_variant_ids', "TEXT DEFAULT '[]'"],
  ['is_imei_required', 'INTEGER DEFAULT 0'],
  ['requires_serial_tracking', 'INTEGER DEFAULT 0'],
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
  ['is_subscription_available', 'INTEGER DEFAULT 0'],
  ['is_active', 'INTEGER DEFAULT 1']
];

const existingCols = new Set(db.prepare("PRAGMA table_info('products')").all().map(c => c.name));

for (const [colName, colType] of columnsToAdd) {
  if (!existingCols.has(colName)) {
    try {
      db.exec(`ALTER TABLE products ADD COLUMN "${colName}" ${colType}`);
      console.log(`Added column: ${colName}`);
    } catch (err) {
      console.error(`Error adding ${colName}:`, err.message);
    }
  }
}

// Create auxiliary product and tracking tables
db.exec(`
  CREATE TABLE IF NOT EXISTS product_images (
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

  CREATE TABLE IF NOT EXISTS serial_number_tracking (
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

  CREATE TABLE IF NOT EXISTS serial_transactions (
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

  CREATE TABLE IF NOT EXISTS batch_number_tracking (
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

  CREATE TABLE IF NOT EXISTS batch_transactions (
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

  CREATE TABLE IF NOT EXISTS batch_wise_stock (
    product_id TEXT NOT NULL,
    batch_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    PRIMARY KEY (product_id, batch_id)
  );

  CREATE TABLE IF NOT EXISTS subscription_tracking (
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

  CREATE TABLE IF NOT EXISTS opening_stock (
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

  CREATE TABLE IF NOT EXISTS product_variant_opening_stock (
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
`);
console.log("Created auxiliary product tables if not exist.");

console.log("Migration complete!");
