// @ts-nocheck
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "../src/lib/db";

async function run() {
  try {
    console.log("Running migrations...");
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("Migrations applied successfully!");
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    await pool.end();
    process.exit(1);
  }
}

run();
