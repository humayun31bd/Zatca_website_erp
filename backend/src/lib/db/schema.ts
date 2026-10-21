import { sqliteTable, integer, text, real, blob, unique, check, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql, relations } from 'drizzle-orm';

export const roleEnum = { enum: ['SUPERADMIN', 'TENANT_ADMIN', 'TENANT_USER'] };

export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  parentTenantId: text('parent_tenant_id').references((): any => tenants.id), // For Agency model (null = root/agency)
  name: text('name').notNull(),
  vatNumber: text('vat_number').notNull(),
  email: text('email').notNull().unique(),
  subdomain: text('subdomain').unique(),
  logoUrl: text('logo_url'),
  status: text('status').default('ACTIVE').notNull(),
  whatsappNumber: text('whatsapp_number'),
  address: text('address'),
  countryCode: text('country_code').default('SA'),
  currencyCode: text('currency_code').default('SAR'),
  currencySymbol: text('currency_symbol').default('SAR'),
  taxRate: real('tax_rate').default(15),
  taxType: text('tax_type').default('VAT'),
  timezone: text('timezone').default('Asia/Riyadh'),
  dateFormat: text('date_format').default('YYYY-MM-DD'),
  decimalPlaces: integer('decimal_places').default(2),
  marketingPlan: text('marketing_plan').default('STANDARD'),

  // Multi-Gateway settings
  paymentGateway: text('payment_gateway').default('TAP').notNull(),
  stripeSecretKey: text('stripe_secret_key'),
  tapSecretKey: text('tap_secret_key'),

  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [

  check('status_check', sql`${t.status} IN ('ACTIVE','SUSPENDED','PENDING')`),
  check('gateway_check', sql`${t.paymentGateway} IN ('TAP','STRIPE')`)
]);

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('TENANT_USER').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const tenantSettings = sqliteTable('tenant_settings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull().unique(),
  businessType: text('business_type').default('Retail').notNull(),
  purchaseFlowType: text('purchase_flow_type').default('NORMAL').notNull(),
  productPolicy: text('product_policy', { mode: 'json' }).default({}).notNull(),
  receiptSettings: text('receipt_settings', { mode: 'json' }).default({}).notNull(),
  smtpSettings: text('smtp_settings', { mode: 'json' }).default({}).notNull(),
  packagePlan: text('package_plan').default('free').notNull(),
  maxBranches: integer('max_branches').default(1).notNull(),
  maxUsers: integer('max_users').default(2).notNull(),
  monthlyBillLimit: integer('monthly_bill_limit').default(300).notNull(),
  featureFlags: text('feature_flags', { mode: 'json' }).$type<Record<string, boolean>>().default({}).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  keyHash: text().notNull().unique(),
  prefix: text().notNull(),
  scopes: text('scopes', { mode: 'json' }).$type<string[]>().default(['INVOICE:READ']).notNull(),
  rateLimit: integer('rate_limit').default(500).notNull(),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const csidCertificates = sqliteTable('csid_certificates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(),
  complianceRequestId: text('compliance_request_id'),
  binarySecurityToken: text('binary_security_token').notNull(),
  secret: text('secret').notNull(),
  kmsKeyId: text('kms_key_id'),
  issuedAt: integer('issued_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('type_check', sql`${t.type} IN ('COMPLIANCE','PRODUCTION')`)
]);

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
});

export const subCategories = sqliteTable('sub_categories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
});

export const units = sqliteTable('units', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(), // e.g., 'Kilogram'
  shortName: text('short_name').notNull(), // e.g., 'kg'
  baseUnit: integer('base_unit', { mode: 'boolean' }).default(true).notNull(),
});
export const variationTemplates = sqliteTable('variation_templates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(), // e.g., 'Size', 'Color'
});

export const variationValues = sqliteTable('variation_values', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  templateId: text('template_id').references(() => variationTemplates.id, { onDelete: 'cascade' }).notNull(),
  value: text('value').notNull(), // e.g., 'Small', 'Medium', 'Red'
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  isCategoryWiseStock: integer('is_category_wise_stock', { mode: 'boolean' }).default(false),
  categoryId: text('category_id').references(() => categories.id),
  isProductWiseStock: integer('is_product_wise_stock', { mode: 'boolean' }).default(false),
  isParentProduct: integer('is_parent_product', { mode: 'boolean' }).default(false),
  parentProductId: text('parent_product_id').references((): any => products.id, { onDelete: 'cascade' }),
  
  // Common Fields
  sku: text('sku'),
  name: text('name').notNull(),
  productName: text('product_name'),
  description: text('description'),
  brandId: text('brand_id'),
  barcode: text('barcode'),
  productTypeId: text('product_type_id'),
  imageUrls: text('image_urls', { mode: 'json' }).default('[]').notNull(),
  
  unitId: text('unit_id'),
  unitCode: text('unit_code').default('PCE').notNull(),
  isPacketOfPieces: integer('is_packet_of_pieces', { mode: 'boolean' }).default(false),
  packetSize: integer('packet_size').default(1),
  isWeightBased: integer('is_weight_based', { mode: 'boolean' }).default(false),
  weight: real('weight').default(1),
  
  costPrice: real('cost_price'),
  marginPercentage: real('margin_percentage').default(20),
  price: real('price').notNull(),
  baseSellingPrice: real('base_selling_price'),
  retailPrice: real('retail_price').default(1),
  distributorPrice: real('distributor_price').default(1),
  specialPrice: real('special_price').default(1),
  discountAmount: real('discount_amount').default(0).notNull(),
  discountedPrice: real('discounted_price'),
  taxCategoryId: text('tax_category_id'),
  stockQuantity: integer('stock_quantity').default(0).notNull(),
  stockInHand: integer('stock_in_hand').default(0),
  minStockLevel: integer('min_stock_level').default(5).notNull(),
  minOrderQty: integer('min_order_qty').default(0),
  isWholesaler: integer('is_wholesaler', { mode: 'boolean' }).default(false),
  isDistributor: integer('is_distributor', { mode: 'boolean' }).default(false),
  isPharmacy: integer('is_pharmacy', { mode: 'boolean' }).default(false),

  // Electronics / Mobile
  isElectronics: integer('is_electronics', { mode: 'boolean' }).default(false),
  isModelNumber: integer('is_model_number', { mode: 'boolean' }).default(false),
  modelNumber: text('model_number'),
  isColorApplicable: integer('is_color_applicable', { mode: 'boolean' }).default(false),
  colorId: text('color_id'),
  isStorageCapacityApplicable: integer('is_storage_capacity_applicable', { mode: 'boolean' }).default(false),
  storageCapacity: text('storage_capacity'),
  storageCapacityId: text('storage_capacity_id'),
  isRamApplicable: integer('is_ram_applicable', { mode: 'boolean' }).default(false),
  ram: text('ram'),
  ramId: text('ram_id'),
  isWarrantyApplicable: integer('is_warranty_applicable', { mode: 'boolean' }).default(false),
  warrantyMonths: integer('warranty_months').default(0),
  warrantyPeriodsDays: integer('warrenty_periods_days').default(0),
  warrantyProviderId: text('warranty_provider_id'),
  isImeiRequired: integer('is_imei_required', { mode: 'boolean' }).default(false),
  requiresSerialTracking: integer('requires_serial_tracking', { mode: 'boolean' }).default(false),

  // Color & Size Variants
  isColorVariant: integer('is_color_variant', { mode: 'boolean' }).default(false),
  colorVariantId: text('color_variant_id'),
  isSizeVariant: integer('is_size_variant', { mode: 'boolean' }).default(false),
  sizeVariantId: text('size_variant_id'),
  sizeVariantIds: text('size_variant_ids', { mode: 'json' }).default('[]').notNull(),

  // Pharmacy
  isMedicine: integer('is_medicine', { mode: 'boolean' }).default(false),
  isGenericNameApplicable: integer('is_generic_name_applicable', { mode: 'boolean' }).default(false),
  genericName: text('generic_name'),
  isActiveIngredientApplicable: integer('is_active_ingredient_applicable', { mode: 'boolean' }).default(false),
  activeIngredient: text('active_ingredient'),
  isStrengthApplicable: integer('is_strength_applicable', { mode: 'boolean' }).default(false),
  strengthId: text('strength_id'),
  isDosageFormApplicable: integer('is_dosage_form_applicable', { mode: 'boolean' }).default(false),
  dosageFormId: text('dosage_form_id'),
  isManufacturerApplicable: integer('is_manufacturer_applicable', { mode: 'boolean' }).default(false),
  manufacturerId: text('manufacturer_id'),
  isMarketingAuthHolderApplicable: integer('is_marketing_auth_holder_applicable', { mode: 'boolean' }).default(false),
  marketingAuthHolderId: text('marketing_auth_holder_id'),
  isPrescriptionRequired: integer('is_prescription_required', { mode: 'boolean' }).default(false),
  controlledSubstanceSchedule: text('controlled_substance_schedule'),
  storageConditionId: text('storage_condition_id'),
  requiresBatchTracking: integer('requires_batch_tracking', { mode: 'boolean' }).default(false),

  // Apparel
  isApparel: integer('is_apparel', { mode: 'boolean' }).default(false),
  apparelProductTypeId: text('apparel_product_type_id'),
  fiberComposition: text('fiber_composition'),
  genderId: text('gender_id'),
  ageGroupId: text('age_group_id'),
  sizeId: text('size_id'),
  isUnderwear: integer('is_underwear', { mode: 'boolean' }).default(false),
  isTaxExempt: integer('is_tax_exempt', { mode: 'boolean' }).default(false),
  isDiscountable: integer('is_discountable', { mode: 'boolean' }).default(true),
  isExcizable: integer('is_excizable', { mode: 'boolean' }).default(false),

  // Loyalty & Display Flags
  isPointsApplicable: integer('is_points_applicable', { mode: 'boolean' }).default(false),
  pointsPerProduct: integer('points_perproduct').default(0),
  isProductDisplayPosApp: integer('is_product_display_pos_app', { mode: 'boolean' }).default(true),
  isProductDisplayWebsiteApp: integer('is_product_display_website_app', { mode: 'boolean' }).default(false),
  isProductDisplayRackLabel: integer('is_product_display_rack_label', { mode: 'boolean' }).default(false),
  isProductDisplayTag: integer('is_product_display_tag', { mode: 'boolean' }).default(false),
  isProductDisplayPriceTag: integer('is_product_display_price_tag', { mode: 'boolean' }).default(false),
  isProductDisplayHangingTag: integer('is_product_display_hanging_tag', { mode: 'boolean' }).default(false),
  isProductDisplayElectronicScale: integer('is_product_display_electronic_scale', { mode: 'boolean' }).default(false),
  isProductDisplayWeighingScale: integer('is_product_display_weighing_scale', { mode: 'boolean' }).default(false),

  // E-commerce & Delivery Flags
  isVerifiedByBuyer: integer('is_verified_by_buyer', { mode: 'boolean' }).default(false),
  isVerifiedBySupplier: integer('is_verified_by_supplier', { mode: 'boolean' }).default(false),
  isOffers: integer('is_offers', { mode: 'boolean' }).default(false),
  returnDays: integer('return_days').default(7),
  exchangeDays: integer('exchange_days').default(30),
  promisedDeliveryDays: integer('promised_delivery_days').default(2),
  isPaymentAvailableCod: integer('is_payment_available_cod', { mode: 'boolean' }).default(true),
  isAcceleratedCheckoutAvailable: integer('is_accelerated_checkout_available', { mode: 'boolean' }).default(false),
  isSubscriptionAvailable: integer('is_subscription_available', { mode: 'boolean' }).default(false),

  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  unique('uq_tenant_product_barcode').on(t.tenantId, t.barcode),
  check('price_check', sql`${t.price} >= 0`),
  check('stock_check', sql`${t.stockQuantity} >= 0`),
]);

export const productUnits = sqliteTable('product_units', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  productId: text('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  unitCode: text('unit_code').notNull(), // e.g., 'CT' (Carton)
  conversionFactor: real('conversion_factor').notNull(), // How many base units in this unit (e.g., 12.0000)
  barcode: text('barcode'), // Optional specific barcode for this unit (e.g., scanning a carton)
  price: real('price'), // Optional specific price for this unit (overrides base price * factor)
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  unique('uq_tenant_product_unit_barcode').on(t.tenantId, t.barcode),
  check('conversion_factor_check', sql`${t.conversionFactor} > 0`),
  check('unit_price_check', sql`${t.price} IS NULL OR ${t.price} >= 0`)
]);

export const branches = sqliteTable('branches', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  address: text('address'),
  isMainBranch: integer('is_main_branch', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const warehouses = sqliteTable('warehouses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  branchId: text('branch_id').references(() => branches.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  location: text('location'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const counters = sqliteTable('counters', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  branchId: text('branch_id').references(() => branches.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(), // e.g. "Counter 1", "Main Register"
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const counterSessions = sqliteTable('counter_sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  counterId: text('counter_id').references(() => counters.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id).notNull(), // The cashier opening the session
  openedAt: integer('opened_at', { mode: 'timestamp' }).defaultNow().notNull(),
  closedAt: integer('closed_at', { mode: 'timestamp' }),
  openingBalance: real('opening_balance').default(0).notNull(),
  closingBalance: real('closing_balance'), // calculated when closed
  cashSales: real('cash_sales').default(0), // updated iteratively or at close
  transferAmount: real('transfer_amount').default(0), // amount taken out/dropped
  status: text('status').default('OPEN').notNull(), // OPEN, CLOSED
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('session_status_check', sql`${t.status} IN ('OPEN','CLOSED')`)
]);

export const branchInventory = sqliteTable('branch_inventory', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  branchId: text('branch_id').references(() => branches.id, { onDelete: 'cascade' }).notNull(),
  productId: text('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  stockQuantity: integer('stock_quantity').default(0).notNull(),
  minStockLevel: integer('min_stock_level').default(5).notNull(),
  shelfLocation: text('shelf_location'), // e.g., 'Aisle 3, Shelf B'
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  unique('uq_tenant_branch_product').on(t.tenantId, t.branchId, t.productId),
  check('branch_stock_check', sql`${t.stockQuantity} >= 0`),
]);

export const clients = sqliteTable('clients', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  vatNumber: text(),
  address: text('address'),
  email: text('email'),
  phoneNumber: text('phone_number'),
  country: text('country'),
  state: text('state'),
  city: text('city'),
  customerType: text('customer_type').default('newCustomer'),
  funds: real('funds').default(0),
  dues: real('dues').default(0),
  permitCredit: integer('permit_credit', { mode: 'boolean' }).default(false).notNull(),
  creditLimit: real('credit_limit').default(0).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  unique('uq_tenant_client_name').on(t.tenantId, t.name),

]);

export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  vatNumber: text(),
  crNumber: text('cr_number'),
  address: text('address'),
  email: text('email'),
  phoneNumber: text('phone_number'),
  bankDetails: text('bank_details'),
  category: text('category').default('MERCHANDISE'),
  supplierTier: text('supplier_tier').default('TIER_2_STANDARD'),
  paymentTerms: text('payment_terms').default('NET_30'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  unique('uq_tenant_supplier_name').on(t.tenantId, t.name)
]);

export const purchaseInvoices = sqliteTable('purchase_invoices', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  supplierId: text('supplier_id').references(() => suppliers.id).notNull(),
  invoiceNumber: text('invoice_number').notNull(),
  issueDate: integer('issue_date', { mode: 'timestamp' }).notNull(),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  subtotalAmount: real('subtotal_amount').notNull(),
  totalVatAmount: real('total_vat_amount').notNull(),
  totalAmount: real('total_amount').notNull(),
  paymentStatus: text('payment_status').default('UNPAID').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('purchase_payment_status_check', sql`${t.paymentStatus} IN ('UNPAID','PAID','PARTIAL')`)
]);

export const purchaseInvoiceLineItems = sqliteTable('purchase_invoice_line_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  purchaseInvoiceId: text('purchase_invoice_id').references(() => purchaseInvoices.id, { onDelete: 'cascade' }).notNull(),
  productId: text('product_id').references(() => products.id),
  description: text('description').notNull(),
  quantity: real('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  vatRate: real('vat_rate').default(15).notNull(),
  subtotalAmount: real('subtotal_amount').notNull(),
  vatAmount: real('vat_amount').notNull(),
  totalAmount: real('total_amount').notNull(),
});

export const supplierQuotations = sqliteTable('supplier_quotations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  supplierId: text('supplier_id').references(() => suppliers.id).notNull(),
  quotationNumber: text('quotation_number').notNull(),
  issueDate: integer('issue_date', { mode: 'timestamp' }).notNull(),
  validUntil: integer('valid_until', { mode: 'timestamp' }),
  subtotalAmount: real('subtotal_amount').notNull(),
  totalVatAmount: real('total_vat_amount').notNull(),
  totalAmount: real('total_amount').notNull(),
  supplierRefNo: text('supplier_ref_no'),
  documentUrl: text('document_url'),
  status: text('status').default('SUBMITTED').notNull(),
  remarks: text('remarks'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const supplierQuotationItems = sqliteTable('supplier_quotation_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  quotationId: text('quotation_id').references(() => supplierQuotations.id, { onDelete: 'cascade' }).notNull(),
  productId: text('product_id').references(() => products.id),
  description: text('description').notNull(),
  quantity: real('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  vatRate: real('vat_rate').default(15).notNull(),
  subtotalAmount: real('subtotal_amount').notNull(),
  vatAmount: real('vat_amount').notNull(),
  totalAmount: real('total_amount').notNull(),
});

export const quotationComparativeStatements = sqliteTable('quotation_comparative_statements', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  csNumber: text('cs_number').notNull(),
  title: text('title').notNull(),
  status: text('status').default('PENDING').notNull(),
  winningQuotationId: text('winning_quotation_id').references(() => supplierQuotations.id),
  remarks: text('remarks'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const csItems = sqliteTable('cs_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  csId: text('cs_id').references(() => quotationComparativeStatements.id, { onDelete: 'cascade' }).notNull(),
  quotationId: text('quotation_id').references(() => supplierQuotations.id).notNull(),
  isWinningBid: integer('is_winning_bid', { mode: 'boolean' }).default(false).notNull(),
  score: real('score').default(0),
  financialScore: real('financial_score').default(0),
  deliveryScore: real('delivery_score').default(0),
  technicalScore: real('technical_score').default(80),
  compositeScore: real('composite_score').default(0),
  deliveryLeadDays: integer('delivery_lead_days').default(7),
  rank: integer('rank').default(1),
  isLowestPrice: integer('is_lowest_price', { mode: 'boolean' }).default(false),
  isHighestScore: integer('is_highest_score', { mode: 'boolean' }).default(false),
});

export const cashBookEntries = sqliteTable('cash_book_entries', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(),
  amount: real('amount').notNull(),
  category: text('category'),
  description: text('description'),
  referenceId: text('reference_id'),
  entryDate: integer('entry_date', { mode: 'timestamp' }).defaultNow().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('cash_book_type_check', sql`${t.type} IN ('IN','OUT')`)
]);

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id).notNull(),
  clientId: text('client_id').references(() => clients.id),
  counterId: text('counter_id').references(() => counters.id),
  branchId: text('branch_id').references(() => branches.id),
  costCenterId: text('cost_center_id'), // Will be linked conceptually since cost centers are in accounting_schema
  originalInvoiceId: text('original_invoice_id'),
  invoiceNumber: text('invoice_number').notNull(),
  invoiceType: text('invoice_type').notNull(),
  invoiceTypeCode: text().default('388').notNull(),

  sellerName: text('seller_name').notNull(),
  sellerVat: text().notNull(),
  sellerAddress: text('seller_address').notNull(),

  buyerName: text('buyer_name'),
  buyerVat: text(),
  buyerAddress: text('buyer_address'),

  subtotalAmount: real('subtotal_amount').notNull(),
  totalVatAmount: real('total_vat_amount').notNull(),
  totalAmount: real('total_amount').notNull(),
  currencyCode: text().default('SAR').notNull(),

  issueDatetime: integer('issue_datetime', { mode: 'timestamp' }).notNull(),
  invoiceHash: text(),
  previousHash: text(),
  ublXmlS3Key: text('ubl_xml_s3_key'),
  pdfS3Key: text('pdf_s3_key'),
  qrCodeBase64: text('qr_code_base64'),

  zatcaStatus: text('zatca_status').default('PENDING').notNull(),
  zatcaWarnings: text('zatca_warnings', { mode: 'json' }),
  zatcaErrors: text('zatca_errors', { mode: 'json' }),
  zatcaClearedAt: integer('zatca_cleared_at', { mode: 'timestamp' }),

  whatsappStatus: text('whatsapp_status').default('PENDING').notNull(),

  paymentStatus: text('payment_status').default('UNPAID').notNull(),
  paymentGateway: text('payment_gateway'),
  paidAt: integer('paid_at', { mode: 'timestamp' }),
  deliveryType: text('delivery_type').default('take_away'),

  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  unique('uq_tenant_invoice_number').on(t.tenantId, t.invoiceNumber),
  check('invoice_type_check', sql`${t.invoiceType} IN ('STANDARD','SIMPLIFIED')`),
  check('invoice_type_code_check', sql`${t.invoiceTypeCode} IN ('388','381','383')`),

  check('zatca_status_check', sql`${t.zatcaStatus} IN ('PENDING','CLEARED','REPORTED','FAILED','QUEUED')`),
  check('whatsapp_status_check', sql`${t.whatsappStatus} IN ('PENDING','QUEUED','SENT','DELIVERED','READ','FAILED')`),
  check('payment_status_check', sql`${t.paymentStatus} IN ('UNPAID','PAID','REFUNDED','PARTIAL')`)
]);

export const invoiceLineItems = sqliteTable('invoice_line_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  invoiceId: text('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
  productId: text('product_id').references(() => products.id),
  lineNumber: integer('line_number').notNull(),
  description: text('description').notNull(),
  quantity: real('quantity').notNull(),
  unitCode: text('unit_code').default('PCE').notNull(),
  unitPrice: real('unit_price').notNull(),
  discountAmount: real('discount_amount').default(0).notNull(),
  taxPercent: real('tax_percent').default(15).notNull(),
  taxAmount: real('tax_amount').notNull(),
  lineTotal: real('line_total').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('quantity_check', sql`${t.quantity} > 0`),
  check('unit_price_check', sql`${t.unitPrice} >= 0`)
]);

export const invoicePayments = sqliteTable('invoice_payments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  invoiceId: text('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
  paymentMethod: text('payment_method').notNull(), // CASH, CARD, BANK, CREDIT
  amount: real('amount').notNull(),
  referenceNumber: text('reference_number'), // For card authorization, check number, etc.
  paymentDate: integer('payment_date', { mode: 'timestamp' }).defaultNow().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('payment_method_check', sql`${t.paymentMethod} IN ('CASH','CARD','BANK','CREDIT')`),
  check('amount_check', sql`${t.amount} >= 0`)
]);

export const whatsappMessages = sqliteTable('whatsapp_messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  invoiceId: text('invoice_id').references(() => invoices.id).notNull(),
  tenantId: text('tenant_id').references(() => tenants.id).notNull(),
  waMessageId: text('wa_message_id').unique(),
  phoneNumber: text('phone_number').notNull(),
  templateName: text('template_name').notNull(),
  payload: text('payload', { mode: 'json' }).notNull(),
  status: text('status').default('QUEUED').notNull(),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  deliveredAt: integer('delivered_at', { mode: 'timestamp' }),
  readAt: integer('read_at', { mode: 'timestamp' }),
  failedAt: integer('failed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('status_check', sql`${t.status} IN ('QUEUED','SENT','DELIVERED','READ','FAILED')`)
]);

export const webhookEvents = sqliteTable('webhook_events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id),
  source: text('source').notNull(),
  eventType: text('event_type').notNull(),
  referenceId: text('reference_id'),
  payload: text('payload', { mode: 'json' }).notNull(),
  isProcessed: integer('is_processed', { mode: 'boolean' }).default(false).notNull(),
  processedAt: integer('processed_at', { mode: 'timestamp' }),
  errorMessage: text('error_message'),
  receivedAt: integer('received_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('source_check', sql`${t.source} IN ('META','MOYASAR','PAYTABS','ZATCA')`)
]);

export const billingCredits = sqliteTable('billing_credits', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id).notNull(),
  transactionType: text('transaction_type').notNull(),
  amount: real('amount').notNull(),
  balanceAfter: real('balance_after').notNull(),
  description: text('description'),
  invoiceId: text('invoice_id').references(() => invoices.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('transaction_type_check', sql`${t.transactionType} IN ('TOPUP','DEDUCT','REFUND')`)
]);

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id),
  actorType: text('actor_type').notNull(),
  action: text('action').notNull(),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  metadata: text('metadata', { mode: 'json' }),
  ipAddress: text('ip_address'), // Using varchar for INET representation
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('actor_type_check', sql`${t.actorType} IN ('TENANT','ADMIN','SYSTEM')`)
]);

export const loginAttempts = sqliteTable('login_attempts', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  email: text('email').notNull().unique(),
  attempts: integer('attempts').default(0).notNull(),
  lockedUntil: integer('locked_until', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

// --- SaaS Tables ---

export const packages = sqliteTable('packages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  type: text('type').notNull(), // AGENCY or END_USER
  price: real('price').notNull(),
  billingCycle: text('billing_cycle').default('MONTHLY').notNull(),
  features: text('features', { mode: 'json' }).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('type_check', sql`${t.type} IN ('AGENCY','END_USER')`),
  check('billing_cycle_check', sql`${t.billingCycle} IN ('MONTHLY','YEARLY')`)
]);

export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  packageId: text('package_id').references(() => packages.id).notNull(),
  status: text('status').default('ACTIVE').notNull(),
  currentPeriodStart: integer('current_period_start', { mode: 'timestamp' }).notNull(),
  currentPeriodEnd: integer('current_period_end', { mode: 'timestamp' }).notNull(),
  cancelAtPeriodEnd: integer('cancel_at_period_end', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
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

export const tenantTranslations = sqliteTable('tenant_translations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  key: text('key').notNull(),
  enValue: text('en_value').notNull(),
  arValue: text('ar_value').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  unique('tenant_key_idx').on(t.tenantId, t.key)
]);

export const purchaseOrders = sqliteTable('purchase_orders', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  poNumber: text('po_number').notNull(),
  supplierId: text('supplier_id').notNull(),
  supplierName: text('supplier_name'),
  csId: text('cs_id'),
  quotationId: text('quotation_id'),
  status: text('status').default('ISSUED').notNull(),
  issueDate: text('issue_date').notNull(),
  expectedDeliveryDate: text('expected_delivery_date'),
  subtotalAmount: real('subtotal_amount').default(0).notNull(),
  vatAmount: real('vat_amount').default(0).notNull(),
  totalAmount: real('total_amount').default(0).notNull(),
  currency: text('currency').default('SAR').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const purchaseOrderItems = sqliteTable('purchase_order_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  poId: text('po_id').references(() => purchaseOrders.id, { onDelete: 'cascade' }).notNull(),
  productId: text('product_id'),
  description: text('description').notNull(),
  quantity: real('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  vatRate: real('vat_rate').default(15).notNull(),
  subtotalAmount: real('subtotal_amount').notNull(),
  vatAmount: real('vat_amount').notNull(),
  totalAmount: real('total_amount').notNull(),
});

export const goodsReceivedNotes = sqliteTable('goods_received_notes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  grnNumber: text('grn_number').notNull(),
  poId: text('po_id').references(() => purchaseOrders.id),
  poNumber: text('po_number'),
  supplierId: text('supplier_id').notNull(),
  warehouseId: text('warehouse_id'),
  receivedDate: text('received_date').notNull(),
  status: text('status').default('RECEIVED').notNull(),
  deliveryNoteNumber: text('delivery_note_number'),
  remarks: text('remarks'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const grnItems = sqliteTable('grn_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  grnId: text('grn_id').references(() => goodsReceivedNotes.id, { onDelete: 'cascade' }).notNull(),
  productId: text('product_id'),
  description: text('description').notNull(),
  orderedQuantity: real('ordered_quantity').notNull(),
  receivedQuantity: real('received_quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
});

export const qualityCheckRecords = sqliteTable('quality_check_records', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  qcNumber: text('qc_number').notNull(),
  grnId: text('grn_id').references(() => goodsReceivedNotes.id).notNull(),
  grnNumber: text('grn_number'),
  inspectorName: text('inspector_name'),
  checkDate: text('check_date').notNull(),
  overallStatus: text('overall_status').default('PASSED').notNull(),
  totalReceived: real('total_received').default(0).notNull(),
  totalAccepted: real('total_accepted').default(0).notNull(),
  totalRejected: real('total_rejected').default(0).notNull(),
  totalExchanged: real('total_exchanged').default(0).notNull(),
  remarks: text('remarks'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const qcItems = sqliteTable('qc_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  qcId: text('qc_id').references(() => qualityCheckRecords.id, { onDelete: 'cascade' }).notNull(),
  description: text('description').notNull(),
  receivedQuantity: real('received_quantity').notNull(),
  acceptedQuantity: real('accepted_quantity').notNull(),
  rejectedQuantity: real('rejected_quantity').notNull(),
  exchangedQuantity: real('exchanged_quantity').notNull(),
  status: text('status').default('PASSED').notNull(),
  defectReason: text('defect_reason'),
});

export const supplierBills = sqliteTable('supplier_bills', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  billNumber: text('bill_number').notNull(),
  supplierId: text('supplier_id').notNull(),
  supplierName: text('supplier_name'),
  poId: text('po_id'),
  grnId: text('grn_id'),
  issueDate: text('issue_date').notNull(),
  dueDate: text('due_date'),
  subtotalAmount: real('subtotal_amount').default(0).notNull(),
  discountAmount: real('discount_amount').default(0).notNull(),
  vatAmount: real('vat_amount').default(0).notNull(),
  totalAmount: real('total_amount').default(0).notNull(),
  paidAmount: real('paid_amount').default(0).notNull(),
  paymentStatus: text('payment_status').default('UNPAID').notNull(),
  referenceDocUrl: text('reference_doc_url'),
  referenceDocName: text('reference_doc_name'),
  remarks: text('remarks'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const inventoryTransfers = sqliteTable('inventory_transfers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  transferNumber: text('transfer_number').notNull(),
  fromWarehouseId: text('from_warehouse_id').notNull(),
  fromWarehouseName: text('from_warehouse_name'),
  toWarehouseId: text('to_warehouse_id').notNull(),
  toWarehouseName: text('to_warehouse_name'),
  status: text('status').default('COMPLETED').notNull(),
  transferDate: text('transfer_date').notNull(),
  remarks: text('remarks'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const inventoryTransferItems = sqliteTable('inventory_transfer_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  transferId: text('transfer_id').references(() => inventoryTransfers.id, { onDelete: 'cascade' }).notNull(),
  productId: text('product_id'),
  productName: text('product_name').notNull(),
  quantity: real('quantity').notNull(),
});

export const inventoryAdjustments = sqliteTable('inventory_adjustments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  adjustmentNumber: text('adjustment_number').notNull(),
  warehouseId: text('warehouse_id').notNull(),
  warehouseName: text('warehouse_name'),
  reason: text('reason').notNull(),
  status: text('status').default('APPROVED').notNull(),
  adjustedBy: text('adjusted_by'),
  adjustmentDate: text('adjustment_date').notNull(),
  remarks: text('remarks'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const inventoryAdjustmentItems = sqliteTable('inventory_adjustment_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  adjustmentId: text('adjustment_id').references(() => inventoryAdjustments.id, { onDelete: 'cascade' }).notNull(),
  productId: text('product_id'),
  productName: text('product_name').notNull(),
  adjustmentType: text('adjustment_type').notNull(),
  quantity: real('quantity').notNull(),
});

export const supplierReturns = sqliteTable('supplier_returns', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  returnNumber: text('return_number').notNull(),
  debitNoteNumber: text('debit_note_number'),
  supplierId: text('supplier_id').notNull(),
  supplierName: text('supplier_name'),
  originalBillId: text('original_bill_id'),
  billNumber: text('bill_number'),
  returnDate: text('return_date').notNull(),
  reason: text('reason').default('DEFECTIVE').notNull(),
  subtotalAmount: real('subtotal_amount').default(0).notNull(),
  vatAmount: real('vat_amount').default(0).notNull(),
  totalAmount: real('total_amount').default(0).notNull(),
  status: text('status').default('DRAFT').notNull(),
  refundStatus: text('refund_status').default('PENDING').notNull(),
  remarks: text('remarks'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const supplierReturnItems = sqliteTable('supplier_return_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  returnId: text('return_id').references(() => supplierReturns.id, { onDelete: 'cascade' }).notNull(),
  productId: text('product_id'),
  itemDescription: text('item_description').notNull(),
  unitPrice: real('unit_price').default(0).notNull(),
  quantity: real('quantity').default(1).notNull(),
  vatRate: real('vat_rate').default(15.0).notNull(),
  vatAmount: real('vat_amount').default(0).notNull(),
  totalAmount: real('total_amount').default(0).notNull(),
  reason: text('reason'),
});

export * from './hr_schema';
export * from './accounting_schema';