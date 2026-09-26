CREATE TYPE "public"."role" AS ENUM('SUPERADMIN', 'TENANT_ADMIN', 'TENANT_USER');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"key_hash" char(64) NOT NULL,
	"prefix" char(12) NOT NULL,
	"scopes" jsonb DEFAULT '["INVOICE:READ"]'::jsonb NOT NULL,
	"rate_limit" integer DEFAULT 500 NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"actor_type" varchar(20) NOT NULL,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(50),
	"resource_id" uuid,
	"metadata" jsonb,
	"ip_address" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "actor_type_check" CHECK ("audit_logs"."actor_type" IN ('TENANT','ADMIN','SYSTEM'))
);
--> statement-breakpoint
CREATE TABLE "billing_credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"transaction_type" varchar(20) NOT NULL,
	"amount" numeric(12, 4) NOT NULL,
	"balance_after" numeric(12, 4) NOT NULL,
	"description" text,
	"invoice_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transaction_type_check" CHECK ("billing_credits"."transaction_type" IN ('TOPUP','DEDUCT','REFUND'))
);
--> statement-breakpoint
CREATE TABLE "csid_certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"compliance_request_id" varchar(255),
	"binary_security_token" text NOT NULL,
	"secret" text NOT NULL,
	"kms_key_id" varchar(255),
	"issued_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "type_check" CHECK ("csid_certificates"."type" IN ('COMPLIANCE','PRODUCTION'))
);
--> statement-breakpoint
CREATE TABLE "invoice_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"line_number" integer NOT NULL,
	"description" varchar(500) NOT NULL,
	"quantity" numeric(12, 4) NOT NULL,
	"unit_code" varchar(10) DEFAULT 'PCE' NOT NULL,
	"unit_price" numeric(18, 4) NOT NULL,
	"discount_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"tax_percent" numeric(5, 2) DEFAULT '15.00' NOT NULL,
	"tax_amount" numeric(18, 2) NOT NULL,
	"line_total" numeric(18, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quantity_check" CHECK ("invoice_line_items"."quantity" > 0),
	CONSTRAINT "unit_price_check" CHECK ("invoice_line_items"."unit_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_number" varchar(100) NOT NULL,
	"invoice_type" varchar(20) NOT NULL,
	"invoice_type_code" char(3) DEFAULT '388' NOT NULL,
	"seller_name" varchar(255) NOT NULL,
	"seller_vat" char(15) NOT NULL,
	"seller_address" text NOT NULL,
	"buyer_name" varchar(255),
	"buyer_vat" char(15),
	"buyer_address" text,
	"subtotal_amount" numeric(18, 2) NOT NULL,
	"total_vat_amount" numeric(18, 2) NOT NULL,
	"total_amount" numeric(18, 2) NOT NULL,
	"currency_code" char(3) DEFAULT 'SAR' NOT NULL,
	"issue_datetime" timestamp with time zone NOT NULL,
	"invoice_hash" char(44),
	"previous_hash" char(44),
	"ubl_xml_s3_key" text,
	"pdf_s3_key" text,
	"qr_code_base64" text,
	"zatca_status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"zatca_warnings" jsonb,
	"zatca_errors" jsonb,
	"zatca_cleared_at" timestamp with time zone,
	"whatsapp_status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"payment_status" varchar(20) DEFAULT 'UNPAID' NOT NULL,
	"payment_gateway" varchar(50),
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_tenant_invoice_number" UNIQUE("tenant_id","invoice_number"),
	CONSTRAINT "invoice_type_check" CHECK ("invoices"."invoice_type" IN ('STANDARD','SIMPLIFIED')),
	CONSTRAINT "invoice_type_code_check" CHECK ("invoices"."invoice_type_code" IN ('388','381','383')),
	CONSTRAINT "seller_vat_check" CHECK ("invoices"."seller_vat" ~ '^3[0-9]{13}3$'),
	CONSTRAINT "zatca_status_check" CHECK ("invoices"."zatca_status" IN ('PENDING','CLEARED','REPORTED','FAILED','QUEUED')),
	CONSTRAINT "whatsapp_status_check" CHECK ("invoices"."whatsapp_status" IN ('PENDING','QUEUED','SENT','DELIVERED','READ','FAILED')),
	CONSTRAINT "payment_status_check" CHECK ("invoices"."payment_status" IN ('UNPAID','PAID','REFUNDED','PARTIAL'))
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "login_attempts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"billing_cycle" varchar(20) DEFAULT 'MONTHLY' NOT NULL,
	"features" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "type_check" CHECK ("packages"."type" IN ('AGENCY','END_USER')),
	CONSTRAINT "billing_cycle_check" CHECK ("packages"."billing_cycle" IN ('MONTHLY','YEARLY'))
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "status_check" CHECK ("subscriptions"."status" IN ('ACTIVE','CANCELED','PAST_DUE','TRIAL'))
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_tenant_id" uuid,
	"name" varchar(255) NOT NULL,
	"vat_number" char(15) NOT NULL,
	"email" varchar(255) NOT NULL,
	"subdomain" varchar(100),
	"logo_url" text,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"whatsapp_number" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_email_unique" UNIQUE("email"),
	CONSTRAINT "tenants_subdomain_unique" UNIQUE("subdomain"),
	CONSTRAINT "vat_check" CHECK ("tenants"."vat_number" ~ '^3[0-9]{13}3$'),
	CONSTRAINT "status_check" CHECK ("tenants"."status" IN ('ACTIVE','SUSPENDED','PENDING'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'TENANT_USER' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"source" varchar(30) NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"reference_id" varchar(255),
	"payload" jsonb NOT NULL,
	"is_processed" boolean DEFAULT false NOT NULL,
	"processed_at" timestamp with time zone,
	"error_message" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_check" CHECK ("webhook_events"."source" IN ('META','MOYASAR','PAYTABS','ZATCA'))
);
--> statement-breakpoint
CREATE TABLE "whatsapp_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"wa_message_id" varchar(255),
	"phone_number" varchar(20) NOT NULL,
	"template_name" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'QUEUED' NOT NULL,
	"error_code" varchar(50),
	"error_message" text,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_messages_wa_message_id_unique" UNIQUE("wa_message_id"),
	CONSTRAINT "status_check" CHECK ("whatsapp_messages"."status" IN ('QUEUED','SENT','DELIVERED','READ','FAILED'))
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_credits" ADD CONSTRAINT "billing_credits_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_credits" ADD CONSTRAINT "billing_credits_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csid_certificates" ADD CONSTRAINT "csid_certificates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_parent_tenant_id_tenants_id_fk" FOREIGN KEY ("parent_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;