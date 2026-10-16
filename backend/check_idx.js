const db = require('better-sqlite3')('sqlite.db');
const item = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'uq_tenant_product_unit_barcode'").get();
console.log(item);
