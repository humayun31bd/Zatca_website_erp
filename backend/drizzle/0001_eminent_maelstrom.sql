CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"vat_number" char(15),
	"address" text,
	"email" varchar(255),
	"phone_number" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_tenant_client_name" UNIQUE("tenant_id","name"),
	CONSTRAINT "client_vat_check" CHECK ("clients"."vat_number" IS NULL OR "clients"."vat_number" ~ '^3[0-9]{13}3$')
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "payment_gateway" varchar(20) DEFAULT 'TAP' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "stripe_secret_key" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "tap_secret_key" text;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "gateway_check" CHECK ("tenants"."payment_gateway" IN ('TAP','STRIPE'));