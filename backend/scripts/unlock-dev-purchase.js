const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'sqlite.db');
const db = new Database(dbPath);

const flags = JSON.stringify({
  multiBranch: true,
  zatcaPhase2: true,
  posModule: true,
  purchases: true,
  purchaseModule: true,
  purchaseOrders: true,
  goodsReceived: true,
  qualityCheck: true,
  quotationCs: true,
  quotations: true,
  batchExpiry: true,
  deliveryChallans: true,
  customerPortal: true,
  loyaltyPoints: true,
  kotRestaurant: true,
  tableQrMenu: true,
  serialWarranty: true,
  bomManufacturing: true,
  forexRevaluation: true,
  recurringVouchers: true,
  wpsPayroll: true,
  aiAssistant: true,
  apiAccess: true,
  whatsappIntegration: true,
});

console.log('--- Unlocking Purchase Module & SaaS Plan in Development ---');

// Update all existing tenant_settings rows
const updateResult = db.prepare(`
  UPDATE tenant_settings
  SET package_plan = 'agency',
      max_branches = 999,
      max_users = 999,
      monthly_bill_limit = -1,
      feature_flags = ?
`).run(flags);

console.log(`Updated ${updateResult.changes} tenant_settings records to Agency plan.`);

// Also check all tenants in `tenants` table; if any don't have a tenant_settings row, insert one
const allTenants = db.prepare('SELECT id FROM tenants').all();
const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO tenant_settings (id, tenant_id, package_plan, max_branches, max_users, monthly_bill_limit, feature_flags, business_type, purchase_flow_type, product_policy, receipt_settings, smtp_settings)
  VALUES (?, ?, 'agency', 999, 999, -1, ?, 'Retail', 'COMPLEX', '{}', '{}', '{}')
`);

for (const t of allTenants) {
  insertStmt.run(require('crypto').randomUUID(), t.id, flags);
}

const currentSettings = db.prepare('SELECT tenant_id, package_plan, purchase_flow_type FROM tenant_settings').all();
console.log('Current Tenant Settings:', currentSettings);
console.log('✅ Purchase module unlocked successfully in development!');
