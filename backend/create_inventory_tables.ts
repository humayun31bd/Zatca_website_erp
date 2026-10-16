// @ts-nocheck
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from './src/lib/db';

async function main() {
  try {
    console.log("Creating variation_templates table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "variation_templates" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
        "name" varchar(255) NOT NULL
      );
    `);

    console.log("Creating variation_values table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "variation_values" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
        "template_id" uuid NOT NULL REFERENCES "variation_templates"("id") ON DELETE cascade,
        "value" varchar(255) NOT NULL
      );
    `);
    
    console.log("Successfully created variation tables.");
    process.exit(0);
  } catch (error) {
    console.error("Error creating tables:", error);
    process.exit(1);
  }
}

main();
