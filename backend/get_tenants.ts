import 'dotenv/config';
import { db } from './src/lib/db/index.js';
import { tenants } from './src/lib/db/schema.js';

async function test() {
  try {
    const res = await db.select().from(tenants);
    console.log(res);
  } catch (e) {
    console.error(e);
  }
  process.exit();
}

test();
