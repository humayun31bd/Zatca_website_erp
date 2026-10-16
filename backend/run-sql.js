const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
require('dotenv').config();

async function run() {
  try {
    const sql = postgres(process.env.DATABASE_URL.replace('6543', '5432'), { ssl: 'require' });
    
    await sql.unsafe(`
CREATE TABLE IF NOT EXISTS "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"level" integer NOT NULL,
	"parent_id" uuid,
	"is_control" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_type_check" CHECK ("accounts"."type" IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')),
	CONSTRAINT "account_level_check" CHECK ("accounts"."level" BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS "cost_centers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entry_number" varchar(100) NOT NULL,
	"reference_type" varchar(50),
	"reference_id" uuid,
	"entry_date" timestamp with time zone NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "je_status_check" CHECK ("journal_entries"."status" IN ('DRAFT','POSTED','VOID'))
);

CREATE TABLE IF NOT EXISTS "journal_entry_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_entry_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"debit" numeric(18, 2) DEFAULT '0.00' NOT NULL,
	"credit" numeric(18, 2) DEFAULT '0.00' NOT NULL,
	"description" text,
	"branch_id" uuid,
	"cost_center_id" uuid,
	"category_id" uuid,
	"supplier_id" uuid,
	"client_id" uuid,
	"counter_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "debit_credit_check" CHECK ("journal_entry_lines"."debit" >= 0 AND "journal_entry_lines"."credit" >= 0 AND ("journal_entry_lines"."debit" > 0 OR "journal_entry_lines"."credit" > 0))
);
    `);

    console.log("Done.");
    process.exit(0);
  } catch (err) {
    console.error("ERROR:", err);
    process.exit(1);
  }
}
run();
