import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL!.replace('6543', '5432'), { max: 1, ssl: 'require' });

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS "product_units" (
    	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    	"tenant_id" uuid NOT NULL,
    	"product_id" uuid NOT NULL,
    	"unit_code" varchar(10) NOT NULL,
    	"conversion_factor" numeric(12, 4) NOT NULL,
    	"barcode" varchar(100),
    	"price" numeric(12, 2),
    	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
    	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    	CONSTRAINT "uq_tenant_product_unit_barcode" UNIQUE("tenant_id","barcode"),
    	CONSTRAINT "conversion_factor_check" CHECK ("product_units"."conversion_factor" > 0),
    	CONSTRAINT "unit_price_check" CHECK ("product_units"."price" IS NULL OR "product_units"."price" >= 0)
    );
  `;
  
  await sql`
  DO $$ BEGIN
   ALTER TABLE "product_units" ADD CONSTRAINT "product_units_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  `;
  
  await sql`
  DO $$ BEGIN
   ALTER TABLE "product_units" ADD CONSTRAINT "product_units_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  `;
  
  console.log('product_units created successfully');
  await sql.end();
}

main().catch(console.error);
