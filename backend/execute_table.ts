import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL!.replace('6543', '5432'), { max: 1, ssl: 'require' });

async function main() {
  await sql`
    ALTER TABLE "invoices"
    ADD COLUMN IF NOT EXISTS "client_id" uuid,
    ADD COLUMN IF NOT EXISTS "counter_id" uuid;
  `;
  
  console.log('Columns added successfully');
  await sql.end();
}

main().catch(console.error);
