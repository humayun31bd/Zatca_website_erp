CREATE TABLE "purchase_invoice_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_invoice_id" uuid NOT NULL,
	"product_id" uuid,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_price" numeric(18, 2) NOT NULL,
	"vat_rate" numeric(5, 2) DEFAULT '15.00' NOT NULL,
	"subtotal_amount" numeric(18, 2) NOT NULL,
	"vat_amount" numeric(18, 2) NOT NULL,
	"total_amount" numeric(18, 2) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "purchase_invoice_line_items" ADD CONSTRAINT "purchase_invoice_line_items_purchase_invoice_id_purchase_invoices_id_fk" FOREIGN KEY ("purchase_invoice_id") REFERENCES "public"."purchase_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoice_line_items" ADD CONSTRAINT "purchase_invoice_line_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;