import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import 'dotenv/config';

const migrationClient = postgres(process.env.DATABASE_URL!.replace('6543', '5432'), { max: 1, ssl: 'require' });

async function main() {
  await migrate(drizzle(migrationClient), { migrationsFolder: './drizzle' });
  await migrationClient.end();
}
main();
