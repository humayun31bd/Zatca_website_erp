CREATE TABLE "branch_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"min_stock_level" integer DEFAULT 5 NOT NULL,
	"shelf_location" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_tenant_branch_product" UNIQUE("tenant_id","branch_id","product_id"),
	CONSTRAINT "branch_stock_check" CHECK ("branch_inventory"."stock_quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"is_main_branch" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_units" (
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
--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD COLUMN "product_id" uuid;--> statement-breakpoint
ALTER TABLE "branch_inventory" ADD CONSTRAINT "branch_inventory_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_inventory" ADD CONSTRAINT "branch_inventory_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_inventory" ADD CONSTRAINT "branch_inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_units" ADD CONSTRAINT "product_units_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_units" ADD CONSTRAINT "product_units_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;