import { AnySQLiteColumn, sqliteTable, integer, text, real, blob, unique, check, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { tenants, categories, units, products as baseProducts } from './schema';

// System-level lookup tables (No tenant_id needed)
export const productTypes = sqliteTable('product_types', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  typeName: text('type_name').notNull().unique(), // 'FMCG', 'ELECTRONICS', 'PHARMACY', 'APPAREL'
});

export const apparelProductTypes = sqliteTable('apparel_product_types', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  typeName: text('type_name').notNull().unique(), // 'TEXTILE', 'LEATHER', 'FOOTWEAR'
});

export const genders = sqliteTable('genders', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  genderName: text('gender_name').notNull().unique(), // 'Men', 'Women', 'Unisex'
});

export const ageGroups = sqliteTable('age_groups', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  ageGroupName: text('age_group_name').notNull().unique(), // 'ADULT', 'CHILD', 'INFANT'
});

export const countriesOfOrigin = sqliteTable('countries_of_origin', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  countryName: text('country_name').notNull().unique(),
  countryCode: text('country_code').unique(),
});

// Tenant-Level Lookup Tables
export const brands = sqliteTable('brands', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  brandName: text('brand_name').notNull(),
}, (t) => [
  unique('uq_brand_tenant').on(t.tenantId, t.brandName),
]);

export const taxCategories = sqliteTable('tax_categories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  categoryName: text('category_name').notNull(),
  taxRate: real('tax_rate').notNull(),
}, (t) => [
  unique('uq_tax_category_tenant').on(t.tenantId, t.categoryName),
]);

export const colors = sqliteTable('colors', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  colorName: text('color_name').notNull(),
}, (t) => [
  unique('uq_color_tenant').on(t.tenantId, t.colorName),
]);

export const sizes = sqliteTable('sizes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  sizeName: text('size_name').notNull(), // 'Small', 'Medium', '42', 'XL'
}, (t) => [
  unique('uq_size_tenant').on(t.tenantId, t.sizeName),
]);

export const strengths = sqliteTable('strengths', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  strengthValue: text('strength_value').notNull(),
}, (t) => [
  unique('uq_strength_tenant').on(t.tenantId, t.strengthValue),
]);

export const dosageForms = sqliteTable('dosage_forms', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  formName: text('form_name').notNull(),
}, (t) => [
  unique('uq_dosage_form_tenant').on(t.tenantId, t.formName),
]);

export const manufacturers = sqliteTable('manufacturers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  manufacturerName: text('manufacturer_name').notNull(),
}, (t) => [
  unique('uq_manufacturer_tenant').on(t.tenantId, t.manufacturerName),
]);

export const marketingAuthHolders = sqliteTable('marketing_authorization_holders', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  holderName: text('holder_name').notNull(),
}, (t) => [
  unique('uq_mah_tenant').on(t.tenantId, t.holderName),
]);

export const storageConditions = sqliteTable('storage_conditions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  conditionName: text('condition_name').notNull(),
}, (t) => [
  unique('uq_storage_cond_tenant').on(t.tenantId, t.conditionName),
]);

// The Unified Products Table
export const unifiedProducts = sqliteTable('unified_products', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  isCategoryWiseStock: integer('is_category_wise_stock', { mode: 'boolean' }).default(false),
  categoryId: text('category_id').references(() => categories.id), 
  isProductWiseStock: integer('is_product_wise_stock', { mode: 'boolean' }).default(false),
  isParentProduct: integer('is_parent_product', { mode: 'boolean' }).default(false),
  parentProductId: text('parent_product_id').references((): AnySQLiteColumn => unifiedProducts.id, { onDelete: 'cascade' }),
  
  // Common Fields
  sku: text('sku').notNull(),
  productName: text('product_name').notNull(),
  name: text('name'),
  description: text('description'),
  brandId: text('brand_id').references(() => brands.id),
  barcode: text('barcode'),
  productTypeId: text('product_type_id').references(() => productTypes.id),
  imageUrls: text('image_urls', { mode: 'json' }).default('[]').notNull(),
  
  unitId: text('unit_id').references(() => units.id), 
  isPacketOfPieces: integer('is_packet_of_pieces', { mode: 'boolean' }).default(false),
  packetSize: integer('packet_size').default(1),
  isWeightBased: integer('is_weight_based', { mode: 'boolean' }).default(false),
  weight: real('weight').default(1),
  packSize: text('pack_size'),
  
  costPrice: real('cost_price').default(0),
  marginPercentage: real('margin_percentage').default(20),
  baseSellingPrice: real('base_selling_price').notNull(),
  price: real('price'),
  retailPrice: real('retail_price').default(1),
  distributorPrice: real('distributor_price').default(1),
  specialPrice: real('special_price').default(1),
  discountedPrice: real('discounted_price'),
  taxCategoryId: text('tax_category_id').references(() => taxCategories.id),
  stockInHand: integer('stock_in_hand').default(0),
  stockQuantity: integer('stock_quantity').default(0),
  minOrderQty: integer('min_order_qty').default(0),
  minStockLevel: integer('min_stock_level').default(5),
  isWholesaler: integer('is_wholesaler', { mode: 'boolean' }).default(false),
  isDistributor: integer('is_distributor', { mode: 'boolean' }).default(false),
  isPharmacy: integer('is_pharmacy', { mode: 'boolean' }).default(false),
  
  // Dimensions & Weight
  weightKg: real('weight_kg'),
  lengthCm: real('length_cm'),
  widthCm: real('width_cm'),
  heightCm: real('height_cm'),

  // Electronics / Mobile
  isElectronics: integer('is_electronics', { mode: 'boolean' }).default(false),
  isModelNumber: integer('is_model_number', { mode: 'boolean' }).default(false),
  modelNumber: text('model_number'),
  isColorApplicable: integer('is_color_applicable', { mode: 'boolean' }).default(false),
  colorId: text('color_id').references(() => colors.id),
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
  strengthId: text('strength_id').references(() => strengths.id),
  isDosageFormApplicable: integer('is_dosage_form_applicable', { mode: 'boolean' }).default(false),
  dosageFormId: text('dosage_form_id').references(() => dosageForms.id),
  isManufacturerApplicable: integer('is_manufacturer_applicable', { mode: 'boolean' }).default(false),
  manufacturerId: text('manufacturer_id').references(() => manufacturers.id),
  isMarketingAuthHolderApplicable: integer('is_marketing_auth_holder_applicable', { mode: 'boolean' }).default(false),
  marketingAuthHolderId: text('marketing_auth_holder_id').references(() => marketingAuthHolders.id),
  isPrescriptionRequired: integer('is_prescription_required', { mode: 'boolean' }).default(false),
  controlledSubstanceSchedule: text('controlled_substance_schedule'),
  storageConditionId: text('storage_condition_id').references(() => storageConditions.id),
  requiresBatchTracking: integer('requires_batch_tracking', { mode: 'boolean' }).default(false),

  // Apparel
  isApparel: integer('is_apparel', { mode: 'boolean' }).default(false),
  apparelProductTypeId: text('apparel_product_type_id').references(() => apparelProductTypes.id),
  fiberComposition: text('fiber_composition'),
  genderId: text('gender_id').references(() => genders.id),
  ageGroupId: text('age_group_id').references(() => ageGroups.id),
  sizeId: text('size_id').references(() => sizes.id),
  isUnderwear: integer('is_underwear', { mode: 'boolean' }).default(false),
  isTaxExempt: integer('is_tax_exempt', { mode: 'boolean' }).default(false),
  isDiscountable: integer('is_discountable', { mode: 'boolean' }).default(true),
  isExcizable: integer('is_excizable', { mode: 'boolean' }).default(false),

  // Points & Display Flags
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

  // E-commerce, Verification & Delivery Flags
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
  unique('uq_unified_product_sku').on(t.tenantId, t.sku),
]);

export const productCompliances = sqliteTable('product_compliances', {
  productId: text('product_id').primaryKey().references(() => unifiedProducts.id, { onDelete: 'cascade' }),
  hsCode: text('hs_code'),
  countryOfOriginId: text('country_of_origin_id').references(() => countriesOfOrigin.id),
  complianceData: text('compliance_data', { mode: 'json' }).default('{}').notNull(),
  complianceStatus: text('compliance_status').default('PENDING'),
  lastVerifiedAt: integer('last_verified_at', { mode: 'timestamp' }).defaultNow(),
});

// Modifiers (Extra features like 'Extra Cheese', 'Sauces')
export const modifierGroups = sqliteTable('modifier_groups', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(), // 'Toppings', 'Sauces'
  isRequired: integer('is_required', { mode: 'boolean' }).default(false),
  minSelections: integer('min_selections').default(0),
  maxSelections: integer('max_selections'),
});

export const productModifiers = sqliteTable('product_modifiers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  groupId: text('group_id').references(() => modifierGroups.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(), // 'Extra Cheese'
  priceAdjustment: real('price_adjustment').default(0),
});

export const unifiedProductModifierGroups = sqliteTable('unified_product_modifier_groups', {
  productId: text('product_id').references(() => unifiedProducts.id, { onDelete: 'cascade' }).notNull(),
  groupId: text('group_id').references(() => modifierGroups.id, { onDelete: 'cascade' }).notNull(),
}, (t) => [
  unique('uq_product_modifier_group').on(t.productId, t.groupId),
]);

// Product Bundles (Combos / Kits)
export const productBundleItems = sqliteTable('product_bundle_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  bundleProductId: text('bundle_product_id').references(() => unifiedProducts.id, { onDelete: 'cascade' }).notNull(), // The combo pack
  componentProductId: text('component_product_id').references(() => unifiedProducts.id, { onDelete: 'cascade' }).notNull(), // The individual item
  quantity: real('quantity').notNull(),
});

// Serial Number Tracking
export const serialNumberTracking = sqliteTable('serial_number_tracking', {
  serialId: text('serial_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: text('product_id').references(() => unifiedProducts.id, { onDelete: 'cascade' }).notNull(),
  serialNumber: text('serial_number').notNull(),
  supplierId: text('supplier_id'),
  shipmentId: text('shipment_id'),
  invoiceId: text('invoice_id'),
  returnId: text('return_id'),
  warehouseId: text('warehouse_id'),
  locationBin: text('location_bin'),
  status: text('status').default('IN_STOCK').notNull(),
  soldAt: integer('sold_at', { mode: 'timestamp' }),
  salesOrderId: text('sales_order_id'),
  customerId: text('customer_id'),
  warrantyExpiry: integer('warranty_expiry', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const serialTransactions = sqliteTable('serial_transactions', {
  transactionId: text('transaction_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  serialId: text('serial_id').references(() => serialNumberTracking.serialId, { onDelete: 'cascade' }).notNull(),
  transactionType: text('transaction_type').notNull(),
  documentType: text('document_type').notNull(),
  documentId: text('document_id').notNull(),
  fromLocation: text('from_location'),
  toLocation: text('to_location'),
  performedBy: text('performed_by'),
  transactionAt: integer('transaction_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

// Batch Number Tracking
export const batchNumberTracking = sqliteTable('batch_number_tracking', {
  batchId: text('batch_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: text('product_id').references(() => unifiedProducts.id, { onDelete: 'cascade' }).notNull(),
  batchNumber: text('batch_number').notNull(),
  receivedQuantity: integer('received_quantity').notNull(),
  remainingQuantity: integer('remaining_quantity').notNull(),
  manufacturingDate: integer('manufacturing_date', { mode: 'timestamp' }),
  expiryDate: integer('expiry_date', { mode: 'timestamp' }),
  purchaseId: text('purchase_id'),
  supplierId: text('supplier_id'),
  warehouseId: text('warehouse_id'),
  locationBin: text('location_bin'),
  isExpired: integer('is_expired', { mode: 'boolean' }).default(false).notNull(),
  status: text('status').default('ACTIVE').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  unique('uq_product_batch_number').on(t.productId, t.batchNumber),
]);

export const batchTransactions = sqliteTable('batch_transactions', {
  transactionId: text('transaction_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  batchId: text('batch_id').references(() => batchNumberTracking.batchId, { onDelete: 'cascade' }).notNull(),
  transactionType: text('transaction_type').notNull(),
  documentType: text('document_type').notNull(),
  documentId: text('document_id').notNull(),
  quantity: integer('quantity').notNull(),
  fromLocation: text('from_location'),
  toLocation: text('to_location'),
  performedBy: text('performed_by'),
  transactionAt: integer('transaction_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const batchWiseStock = sqliteTable('batch_wise_stock', {
  productId: text('product_id').references(() => unifiedProducts.id, { onDelete: 'cascade' }).notNull(),
  batchId: text('batch_id').references(() => batchNumberTracking.batchId, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').notNull(),
});

export const subscriptionTracking = sqliteTable('subscription_tracking', {
  subscriptionId: text('subscription_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  subscriptionTrackingId: text('subscription_tracking_id').notNull(),
  planName: text('plan_name').notNull(),
  planDescription: text('plan_description').notNull(),
  planPrice: real('plan_price').notNull(),
  planInterval: text('plan_interval').notNull(),
  planIntervalCount: integer('plan_interval_count').notNull(),
  planStatus: text('plan_status').default('ACTIVE').notNull(),
  planCreatedAt: integer('plan_created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  planUpdatedAt: integer('plan_updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

// Legacy Aliases
export const productBatches = batchNumberTracking;
export const serialNumbers = serialNumberTracking;

// Product Variant Images (Color & Size specific)
export const productImages = sqliteTable('product_images', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull(),
  productId: text('product_id').references(() => unifiedProducts.id, { onDelete: 'cascade' }).notNull(),
  colorId: text('color_id').references(() => colors.id),
  sizeId: text('size_id').references(() => sizes.id),
  imageUrl: text('image_url').notNull(),
  isPrimary: integer('is_primary', { mode: 'boolean' }).default(false),
  displayOrder: integer('display_order').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const products = baseProducts;

// Product Opening Stock
export const openingStock = sqliteTable('opening_stock', {
  openingStockId: text('opening_stock_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull(),
  productId: text('product_id').references(() => baseProducts.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').notNull(),
  warehouseId: text('warehouse_id'),
  locationBin: text('location_bin'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  unique('uq_product_opening_stock').on(t.productId, t.warehouseId),
]);

// Product Variant Opening Stock
export const productVariantOpeningStock = sqliteTable('product_variant_opening_stock', {
  variantOpeningStockId: text('variant_opening_stock_id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull(),
  productVariantId: text('product_variant_id').notNull(),
  quantity: integer('quantity').notNull(),
  warehouseId: text('warehouse_id'),
  locationBin: text('location_bin'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  unique('uq_product_variant_opening_stock').on(t.productVariantId, t.warehouseId),
]);

