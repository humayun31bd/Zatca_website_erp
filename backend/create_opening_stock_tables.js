const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'sqlite.db');
const db = new Database(dbPath);

console.log('Creating opening_stock tables in sqlite.db...');

db.exec(`
CREATE TABLE IF NOT EXISTS "opening_stock" (
  "opening_stock_id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL,
  "product_id" text NOT NULL,
  "quantity" integer NOT NULL,
  "warehouse_id" text,
  "location_bin" text,
  "created_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  "updated_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade,
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "product_variant_opening_stock" (
  "variant_opening_stock_id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL,
  "product_variant_id" text NOT NULL,
  "quantity" integer NOT NULL,
  "warehouse_id" text,
  "location_bin" text,
  "created_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  "updated_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade
);
`);

console.log('✅ Successfully created opening_stock tables in SQLite.');
db.close();
