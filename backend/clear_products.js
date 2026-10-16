const Database = require('better-sqlite3');
const db = new Database('sqlite.db');

try {
  db.exec('BEGIN TRANSACTION');
  
  // Disable foreign key constraints temporarily if needed, though PRAGMA foreign_keys is usually off by default in sqlite unless enabled.
  // It's safer to just delete from child tables first.
  console.log('Deleting from product_units...');
  db.prepare('DELETE FROM product_units').run();
  
  console.log('Deleting from branch_inventory...');
  db.prepare('DELETE FROM branch_inventory').run();
  
  console.log('Deleting from unified_product_modifier_groups...');
  db.prepare('DELETE FROM unified_product_modifier_groups').run();
  
  console.log('Deleting from product_bundle_items...');
  db.prepare('DELETE FROM product_bundle_items').run();
  
  console.log('Deleting from product_batches...');
  db.prepare('DELETE FROM product_batches').run();
  
  console.log('Deleting from product_compliances...');
  db.prepare('DELETE FROM product_compliances').run();

  console.log('Deleting from unified_products...');
  db.prepare('DELETE FROM unified_products').run();

  console.log('Deleting from products...');
  db.prepare('DELETE FROM products').run();

  db.exec('COMMIT');
  console.log('Successfully deleted all products and reference data.');
} catch (e) {
  db.exec('ROLLBACK');
  console.error('Error deleting products:', e);
} finally {
  db.close();
}
