// @ts-nocheck
import { db } from '../src/lib/db/index';
import { sql } from 'drizzle-orm';
async function main() {
  await db.execute(sql`ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id);`);
  console.log('Done');
  process.exit(0);
}
main();
