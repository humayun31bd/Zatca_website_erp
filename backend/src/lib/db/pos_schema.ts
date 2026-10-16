import { sqliteTable, integer, text, real, blob, unique, check, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { tenants } from "./schema";

export const heldCarts = sqliteTable("held_carts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  cashierId: text("cashier_id"), // The user who held the cart
  customerName: text("customer_name"),
  customerData: text("customer_data", { mode: 'json' }),
  discount: real("discount").default(0),
  deliveryType: text("delivery_type").default('take_away'),
  note: text("note"),
  totalAmount: real("total_amount").notNull(),
  items: text("items", { mode: 'json' }).notNull(), // Storing items as JSONB for simplicity since it's temporary
  createdAt: integer("created_at", { mode: 'timestamp_ms' }).defaultNow().notNull(),
  updatedAt: integer("updated_at", { mode: 'timestamp_ms' }).defaultNow().notNull(),
});

export const cashDrawerTransactions = sqliteTable("cash_drawer_transactions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  cashierId: text("cashier_id"), 
  type: text("type").notNull(), // 'PAY_IN' or 'PAY_OUT'
  amount: real("amount").notNull(),
  reason: text("reason").notNull(),
  createdAt: integer("created_at", { mode: 'timestamp' }).defaultNow().notNull(),
});
