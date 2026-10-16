import 'dotenv/config';
import { encrypt } from './src/lib/auth/session.js';

async function generate() {
  const token = await encrypt({
    userId: 'dummy-user-id',
    role: 'TENANT_ADMIN',
    email: 'owner@demo-client.com',
    tenantId: '336eaf82-a524-4b0a-9326-7197b1e5459e'
  });
  console.log("GENERATED TOKEN:");
  console.log(token);
  process.exit();
}

generate();
