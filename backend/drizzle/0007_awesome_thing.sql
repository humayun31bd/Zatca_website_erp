CREATE TABLE "counter_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"counter_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"opening_balance" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"closing_balance" numeric(12, 2),
	"cash_sales" numeric(12, 2) DEFAULT '0.00',
	"transfer_amount" numeric(12, 2) DEFAULT '0.00',
	"status" varchar(20) DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_status_check" CHECK ("counter_sessions"."status" IN ('OPEN','CLOSED'))
);
--> statement-breakpoint
CREATE TABLE "invoice_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"payment_method" varchar(20) NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"reference_number" varchar(255),
	"payment_date" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_method_check" CHECK ("invoice_payments"."payment_method" IN ('CASH','CARD','BANK','CREDIT')),
	CONSTRAINT "amount_check" CHECK ("invoice_payments"."amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "counter_sessions" ADD CONSTRAINT "counter_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counter_sessions" ADD CONSTRAINT "counter_sessions_counter_id_counters_id_fk" FOREIGN KEY ("counter_id") REFERENCES "public"."counters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counter_sessions" ADD CONSTRAINT "counter_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;