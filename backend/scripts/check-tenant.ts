import 'dotenv/config';
import { db } from '../src/lib/db/index';
import { users } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function check() {
  const user = await db.query.users.findFirst({
    where: eq(users.email, 'owner@demo-client.com')
  });
  console.log("Tenant ID:", user?.tenantId);
  process.exit(0);
}
check();
