import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL!.replace('6543', '5432'), { ssl: 'require' });

async function run() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "tenant_translations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "key" varchar(255) NOT NULL,
        "en_value" text NOT NULL,
        "ar_value" text NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `;
    await sql`
      DO $$ BEGIN
       ALTER TABLE "tenant_translations" ADD CONSTRAINT "tenant_translations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "tenant_key_idx" ON "tenant_translations" ("tenant_id","key");
    `;
    console.log("Table created successfully");
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}
run();
