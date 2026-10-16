const { drizzle } = require('drizzle-orm/postgres-js');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const postgres = require('postgres');
require('dotenv').config();

async function run() {
  try {
    console.log("Connecting to", process.env.DATABASE_URL.replace('6543', '5432'));
    const sql = postgres(process.env.DATABASE_URL.replace('6543', '5432'), { max: 1, ssl: false });
    const db = drizzle(sql);
    console.log("Running migrations...");
    await migrate(db, { migrationsFolder: 'drizzle' });
    console.log("Done.");
    process.exit(0);
  } catch (err) {
    console.error("MIGRATION ERROR:", err);
    process.exit(1);
  }
}
run();
