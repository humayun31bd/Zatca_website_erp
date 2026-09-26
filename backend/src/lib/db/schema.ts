import { pgTable, pgEnum, serial, text, timestamp, boolean, uuid, integer, decimal, unique, check, jsonb, varchar, char } from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';

export const roleEnum = pgEnum('role', ['SUPERADMIN', 'TENANT_ADMIN', 'TENANT_USER']);

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentTenantId: uuid('parent_tenant_id').references((): any => tenants.id), // For Agency model (null = root/agency)
  name: varchar('name', { length: 255 }).notNull(),
  vatNumber: char('vat_number', { length: 15 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  subdomain: varchar('subdomain', { length: 100 }).unique(),
  logoUrl: text('logo_url'),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  whatsappNumber: varchar('whatsapp_number', { length: 20 }),
  
  // Multi-Gateway settings
  paymentGateway: varchar('payment_gateway', { length: 20 }).default('TAP').notNull(),
  stripeSecretKey: text('stripe_secret_key'),
  tapSecretKey: text('tap_secret_key'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check('vat_check', sql`${t.vatNumber} ~ '^3[0-9]{13}3$'`),
  check('status_check', sql`${t.status} IN ('ACTIVE','SUSPENDED','PENDING')`),
  check('gateway_check', sql`${t.paymentGateway} IN ('TAP','STRIPE')`)
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').default('TENANT_USER').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  keyHash: char('key_hash', { length: 64 }).notNull().unique(),
  prefix: char('prefix', { length: 12 }).notNull(),
  scopes: jsonb('scopes').$type<string[]>().default(['INVOICE:READ']).notNull(),
  rateLimit: integer('rate_limit').default(500).notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const csidCertificates = pgTable('csid_certificates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  complianceRequestId: varchar('compliance_request_id', { length: 255 }),
  binarySecurityToken: text('binary_security_token').notNull(),
  secret: text('secret').notNull(),
  kmsKeyId: varchar('kms_key_id', { length: 255 }),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check('type_check', sql`${t.type} IN ('COMPLIANCE','PRODUCTION')`)
]);

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
});

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  categoryId: uuid('category_id').references(() => categories.id),
  name: varchar('name', { length: 255 }).notNull(),
  barcode: varchar('barcode', { length: 100 }),
  unitCode: varchar('unit_code', { length: 10 }).default('PCE').notNull(),
  description: text('description'),
  price: decimal('price', { precision: 12, scale: 2 }).notNull(),
  costPrice: decimal('cost_price', { precision: 12, scale: 2 }),
  stockQuantity: integer('stock_quantity').default(0).notNull(),
  minStockLevel: integer('min_stock_level').default(5).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('uq_tenant_product_barcode').on(t.tenantId, t.barcode),
  check('price_check', sql`${t.price} >= 0`),
  check('stock_check', sql`${t.stockQuantity} >= 0`),
]);

export const productUnits = pgTable('product_units', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  unitCode: varchar('unit_code', { length: 10 }).notNull(), // e.g., 'CT' (Carton)
  conversionFactor: decimal('conversion_factor', { precision: 12, scale: 4 }).notNull(), // How many base units in this unit (e.g., 12.0000)
  barcode: varchar('barcode', { length: 100 }), // Optional specific barcode for this unit (e.g., scanning a carton)
  price: decimal('price', { precision: 12, scale: 2 }), // Optional specific price for this unit (overrides base price * factor)
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('uq_tenant_product_unit_barcode').on(t.tenantId, t.barcode),
  check('conversion_factor_check', sql`${t.conversionFactor} > 0`),
  check('unit_price_check', sql`${t.price} IS NULL OR ${t.price} >= 0`)
]);

export const branches = pgTable('branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address'),
  isMainBranch: boolean('is_main_branch').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const counters = pgTable('counters', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(), // e.g. "Counter 1", "Main Register"
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const counterSessions = pgTable('counter_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  counterId: uuid('counter_id').references(() => counters.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(), // The cashier opening the session
  openedAt: timestamp('opened_at', { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  openingBalance: decimal('opening_balance', { precision: 12, scale: 2 }).default('0.00').notNull(),
  closingBalance: decimal('closing_balance', { precision: 12, scale: 2 }), // calculated when closed
  cashSales: decimal('cash_sales', { precision: 12, scale: 2 }).default('0.00'), // updated iteratively or at close
  transferAmount: decimal('transfer_amount', { precision: 12, scale: 2 }).default('0.00'), // amount taken out/dropped
  status: varchar('status', { length: 20 }).default('OPEN').notNull(), // OPEN, CLOSED
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check('session_status_check', sql`${t.status} IN ('OPEN','CLOSED')`)
]);

export const branchInventory = pgTable('branch_inventory', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  stockQuantity: integer('stock_quantity').default(0).notNull(),
  minStockLevel: integer('min_stock_level').default(5).notNull(),
  shelfLocation: varchar('shelf_location', { length: 100 }), // e.g., 'Aisle 3, Shelf B'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('uq_tenant_branch_product').on(t.tenantId, t.branchId, t.productId),
  check('branch_stock_check', sql`${t.stockQuantity} >= 0`),
]);

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  vatNumber: char('vat_number', { length: 15 }),
  address: text('address'),
  email: varchar('email', { length: 255 }),
  phoneNumber: varchar('phone_number', { length: 20 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('uq_tenant_client_name').on(t.tenantId, t.name),
  check('client_vat_check', sql`${t.vatNumber} IS NULL OR ${t.vatNumber} ~ '^3[0-9]{13}3$'`)
]);

export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  vatNumber: char('vat_number', { length: 15 }),
  crNumber: varchar('cr_number', { length: 50 }),
  address: text('address'),
  email: varchar('email', { length: 255 }),
  phoneNumber: varchar('phone_number', { length: 20 }),
  bankDetails: text('bank_details'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('uq_tenant_supplier_name').on(t.tenantId, t.name)
]);

export const purchaseInvoices = pgTable('purchase_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  supplierId: uuid('supplier_id').references(() => suppliers.id).notNull(),
  invoiceNumber: varchar('invoice_number', { length: 100 }).notNull(),
  issueDate: timestamp('issue_date', { withTimezone: true }).notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }),
  subtotalAmount: decimal('subtotal_amount', { precision: 18, scale: 2 }).notNull(),
  totalVatAmount: decimal('total_vat_amount', { precision: 18, scale: 2 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 18, scale: 2 }).notNull(),
  paymentStatus: varchar('payment_status', { length: 20 }).default('UNPAID').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check('purchase_payment_status_check', sql`${t.paymentStatus} IN ('UNPAID','PAID','PARTIAL')`)
]);

export const purchaseInvoiceLineItems = pgTable('purchase_invoice_line_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  purchaseInvoiceId: uuid('purchase_invoice_id').references(() => purchaseInvoices.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id),
  description: text('description').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 18, scale: 2 }).notNull(),
  vatRate: decimal('vat_rate', { precision: 5, scale: 2 }).default('15.00').notNull(),
  subtotalAmount: decimal('subtotal_amount', { precision: 18, scale: 2 }).notNull(),
  vatAmount: decimal('vat_amount', { precision: 18, scale: 2 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 18, scale: 2 }).notNull(),
});

export const cashBookEntries = pgTable('cash_book_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 10 }).notNull(),
  amount: decimal('amount', { precision: 18, scale: 2 }).notNull(),
  category: varchar('category', { length: 100 }),
  description: text('description'),
  referenceId: uuid('reference_id'),
  entryDate: timestamp('entry_date', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check('cash_book_type_check', sql`${t.type} IN ('IN','OUT')`)
]);

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  clientId: uuid('client_id').references(() => clients.id),
  counterId: uuid('counter_id').references(() => counters.id),
  originalInvoiceId: uuid('original_invoice_id'),
  invoiceNumber: varchar('invoice_number', { length: 100 }).notNull(),
  invoiceType: varchar('invoice_type', { length: 20 }).notNull(),
  invoiceTypeCode: char('invoice_type_code', { length: 3 }).default('388').notNull(),
  
  sellerName: varchar('seller_name', { length: 255 }).notNull(),
  sellerVat: char('seller_vat', { length: 15 }).notNull(),
  sellerAddress: text('seller_address').notNull(),
  
  buyerName: varchar('buyer_name', { length: 255 }),
  buyerVat: char('buyer_vat', { length: 15 }),
  buyerAddress: text('buyer_address'),
  
  subtotalAmount: decimal('subtotal_amount', { precision: 18, scale: 2 }).notNull(),
  totalVatAmount: decimal('total_vat_amount', { precision: 18, scale: 2 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 18, scale: 2 }).notNull(),
  currencyCode: char('currency_code', { length: 3 }).default('SAR').notNull(),
  
  issueDatetime: timestamp('issue_datetime', { withTimezone: true }).notNull(),
  invoiceHash: char('invoice_hash', { length: 44 }),
  previousHash: char('previous_hash', { length: 44 }),
  ublXmlS3Key: text('ubl_xml_s3_key'),
  pdfS3Key: text('pdf_s3_key'),
  qrCodeBase64: text('qr_code_base64'),
  
  zatcaStatus: varchar('zatca_status', { length: 20 }).default('PENDING').notNull(),
  zatcaWarnings: jsonb('zatca_warnings'),
  zatcaErrors: jsonb('zatca_errors'),
  zatcaClearedAt: timestamp('zatca_cleared_at', { withTimezone: true }),
  
  whatsappStatus: varchar('whatsapp_status', { length: 20 }).default('PENDING').notNull(),
  
  paymentStatus: varchar('payment_status', { length: 20 }).default('UNPAID').notNull(),
  paymentGateway: varchar('payment_gateway', { length: 50 }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique('uq_tenant_invoice_number').on(t.tenantId, t.invoiceNumber),
  check('invoice_type_check', sql`${t.invoiceType} IN ('STANDARD','SIMPLIFIED')`),
  check('invoice_type_code_check', sql`${t.invoiceTypeCode} IN ('388','381','383')`),
  check('seller_vat_check', sql`${t.sellerVat} ~ '^3[0-9]{13}3$'`),
  check('zatca_status_check', sql`${t.zatcaStatus} IN ('PENDING','CLEARED','REPORTED','FAILED','QUEUED')`),
  check('whatsapp_status_check', sql`${t.whatsappStatus} IN ('PENDING','QUEUED','SENT','DELIVERED','READ','FAILED')`),
  check('payment_status_check', sql`${t.paymentStatus} IN ('UNPAID','PAID','REFUNDED','PARTIAL')`)
]);

export const invoiceLineItems = pgTable('invoice_line_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id),
  lineNumber: integer('line_number').notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  quantity: decimal('quantity', { precision: 12, scale: 4 }).notNull(),
  unitCode: varchar('unit_code', { length: 10 }).default('PCE').notNull(),
  unitPrice: decimal('unit_price', { precision: 18, scale: 4 }).notNull(),
  discountAmount: decimal('discount_amount', { precision: 18, scale: 2 }).default('0').notNull(),
  taxPercent: decimal('tax_percent', { precision: 5, scale: 2 }).default('15.00').notNull(),
  taxAmount: decimal('tax_amount', { precision: 18, scale: 2 }).notNull(),
  lineTotal: decimal('line_total', { precision: 18, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check('quantity_check', sql`${t.quantity} > 0`),
  check('unit_price_check', sql`${t.unitPrice} >= 0`)
]);

export const invoicePayments = pgTable('invoice_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
  paymentMethod: varchar('payment_method', { length: 20 }).notNull(), // CASH, CARD, BANK, CREDIT
  amount: decimal('amount', { precision: 18, scale: 2 }).notNull(),
  referenceNumber: varchar('reference_number', { length: 255 }), // For card authorization, check number, etc.
  paymentDate: timestamp('payment_date', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check('payment_method_check', sql`${t.paymentMethod} IN ('CASH','CARD','BANK','CREDIT')`),
  check('amount_check', sql`${t.amount} >= 0`)
]);

export const whatsappMessages = pgTable('whatsapp_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').references(() => invoices.id).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  waMessageId: varchar('wa_message_id', { length: 255 }).unique(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
  templateName: varchar('template_name', { length: 100 }).notNull(),
  payload: jsonb('payload').notNull(),
  status: varchar('status', { length: 20 }).default('QUEUED').notNull(),
  errorCode: varchar('error_code', { length: 50 }),
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  readAt: timestamp('read_at', { withTimezone: true }),
  failedAt: timestamp('failed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check('status_check', sql`${t.status} IN ('QUEUED','SENT','DELIVERED','READ','FAILED')`)
]);

export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  source: varchar('source', { length: 30 }).notNull(),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  referenceId: varchar('reference_id', { length: 255 }),
  payload: jsonb('payload').notNull(),
  isProcessed: boolean('is_processed').default(false).notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check('source_check', sql`${t.source} IN ('META','MOYASAR','PAYTABS','ZATCA')`)
]);

export const billingCredits = pgTable('billing_credits', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  transactionType: varchar('transaction_type', { length: 20 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 4 }).notNull(),
  balanceAfter: decimal('balance_after', { precision: 12, scale: 4 }).notNull(),
  description: text('description'),
  invoiceId: uuid('invoice_id').references(() => invoices.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check('transaction_type_check', sql`${t.transactionType} IN ('TOPUP','DEDUCT','REFUND')`)
]);

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  actorType: varchar('actor_type', { length: 20 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }),
  resourceId: uuid('resource_id'),
  metadata: jsonb('metadata'),
  ipAddress: varchar('ip_address', { length: 45 }), // Using varchar for INET representation
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check('actor_type_check', sql`${t.actorType} IN ('TENANT','ADMIN','SYSTEM')`)
]);

export const loginAttempts = pgTable('login_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  attempts: integer('attempts').default(0).notNull(),
  lockedUntil: timestamp('locked_until'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- SaaS Tables ---

export const packages = pgTable('packages', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // AGENCY or END_USER
  price: decimal('price', { precision: 12, scale: 2 }).notNull(),
  billingCycle: varchar('billing_cycle', { length: 20 }).default('MONTHLY').notNull(),
  features: jsonb('features').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check('type_check', sql`${t.type} IN ('AGENCY','END_USER')`),
  check('billing_cycle_check', sql`${t.billingCycle} IN ('MONTHLY','YEARLY')`)
]);

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  packageId: uuid('package_id').references(() => packages.id).notNull(),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check('status_check', sql`${t.status} IN ('ACTIVE','CANCELED','PAST_DUE','TRIAL')`)
]);

export const invoicesRelations = relations(invoices, ({ many }) => ({
  payments: many(invoicePayments),
}));

export const invoicePaymentsRelations = relations(invoicePayments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoicePayments.invoiceId],
    references: [invoices.id],
  }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  units: many(productUnits),
}));

export const productUnitsRelations = relations(productUnits, ({ one }) => ({
  product: one(products, {
    fields: [productUnits.productId],
    references: [products.id],
  }),
}));
