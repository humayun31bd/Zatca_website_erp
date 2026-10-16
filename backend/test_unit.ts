import 'dotenv/config';
import { db } from './src/lib/db/index.js';
import { units } from './src/lib/db/schema.js';

async function test() {
  try {
    const res = await db.insert(units).values({
      tenantId: '60679c62-034b-40b3-b267-e7b765790a4b',
      name: 'Test Unit',
      shortName: 'TU',
      baseUnit: true,
    }).returning();
    console.log(res);
  } catch (e) {
    console.error('Error inserting unit:', e);
  }
  process.exit();
}

test();
