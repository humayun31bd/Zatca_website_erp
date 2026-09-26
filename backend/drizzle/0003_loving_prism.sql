CREATE TABLE "cash_book_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" varchar(10) NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"category" varchar(100),
	"description" text,
	"reference_id" uuid,
	"entry_date" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cash_book_type_check" CHECK ("cash_book_entries"."type" IN ('IN','OUT'))
);
--> statement-breakpoint
CREATE TABLE "purchase_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"invoice_number" varchar(100) NOT NULL,
	"issue_date" timestamp with time zone NOT NULL,
	"due_date" timestamp with time zone,
	"subtotal_amount" numeric(18, 2) NOT NULL,
	"total_vat_amount" numeric(18, 2) NOT NULL,
	"total_amount" numeric(18, 2) NOT NULL,
	"payment_status" varchar(20) DEFAULT 'UNPAID' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_payment_status_check" CHECK ("purchase_invoices"."payment_status" IN ('UNPAID','PAID','PARTIAL'))
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"vat_number" char(15),
	"cr_number" varchar(50),
	"address" text,
	"email" varchar(255),
	"phone_number" varchar(20),
	"bank_details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_tenant_supplier_name" UNIQUE("tenant_id","name")
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "original_invoice_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "unit_code" varchar(10) DEFAULT 'PCE' NOT NULL;--> statement-breakpoint
ALTER TABLE "cash_book_entries" ADD CONSTRAINT "cash_book_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;