import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';
import { tenants, invoices } from './schema';

export const ORDER_STATUS = {
  WFC: 'WFC',   // Waiting For Confirmation
  OUP: 'OUP',   // Order Under Process (In Kitchen)
  RTS: 'RTS',   // Ready to Serve (Dine-in)
  RFT: 'RFT',   // Ready for Takeaway
  RFD: 'RFD',   // Ready for Delivery
  OOW: 'OOW',   // Order on the Way (Assigned to driver / Dispatched)
  TA: 'TA',     // Takeaway Completed
  Srvd: 'Srvd', // Served (Dine-in)
  Dlvd: 'Dlvd', // Delivered
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatusCode = keyof typeof ORDER_STATUS;

export const ORDER_STATUS_DETAILS: Record<OrderStatusCode, { label: string; arabicLabel: string; color: string }> = {
  WFC: { label: 'Waiting For Confirmation', arabicLabel: 'في انتظار التأكيد', color: '#F59E0B' },
  OUP: { label: 'Order Under Process', arabicLabel: 'قيد التحضير بالمطبخ', color: '#3B82F6' },
  RTS: { label: 'Ready to Serve', arabicLabel: 'جاهز للتقديم', color: '#10B981' },
  RFT: { label: 'Ready for Takeaway', arabicLabel: 'جاهز للاستلام', color: '#10B981' },
  RFD: { label: 'Ready for Delivery', arabicLabel: 'جاهز للتوصيل', color: '#10B981' },
  OOW: { label: 'Order on the Way', arabicLabel: 'الطلب في الطريق', color: '#8B5CF6' },
  TA: { label: 'Takeaway Completed', arabicLabel: 'تم الاستلام سفري', color: '#059669' },
  Srvd: { label: 'Served', arabicLabel: 'تم التقديم محلي', color: '#059669' },
  Dlvd: { label: 'Delivered', arabicLabel: 'تم التوصيل', color: '#059669' },
  CANCELLED: { label: 'Cancelled', arabicLabel: 'ملغي', color: '#EF4444' },
};

export const ORDER_TYPES = ['dine_in', 'take_away', 'delivery', 'third_party_delivery'] as const;
export type OrderType = typeof ORDER_TYPES[number];

export const ORDER_CHANNELS = ['pos', 'online', 'third_party'] as const;
export type OrderChannel = typeof ORDER_CHANNELS[number];

export const THIRD_PARTY_AGGREGATORS = [
  'Jahez',
  'HungerStation',
  'Marsool',
  'ToYou',
  'Ninja',
  'Careem',
  'Custom'
] as const;

// 1. Delivery Drivers Fleet
export const deliveryDrivers = sqliteTable('delivery_drivers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  vehicleType: text('vehicle_type').default('bike').notNull(), // 'bike', 'car', 'van'
  vehiclePlate: text('vehicle_plate'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  isAvailable: integer('is_available', { mode: 'boolean' }).default(true).notNull(),
  currentLatitude: real('current_latitude'),
  currentLongitude: real('current_longitude'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

// 2. Delivery & POS Orders Management
export const deliveryOrders = sqliteTable('delivery_orders', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  orderNumber: text('order_number').notNull().unique(),
  invoiceId: text('invoice_id').references(() => invoices.id),
  orderType: text('order_type').notNull().default('take_away'), // 'dine_in', 'take_away', 'delivery', 'third_party_delivery'
  channel: text('channel').notNull().default('pos'), // 'pos', 'online', 'third_party'
  status: text('status').notNull().default(ORDER_STATUS.WFC),
  aggregator: text('aggregator'), // 'Jahez', 'HungerStation', etc.
  aggregatorReference: text('aggregator_reference'),
  customerName: text('customer_name'),
  customerPhone: text('customer_phone'),
  deliveryAddress: text('delivery_address'),
  deliveryLatitude: real('delivery_latitude'),
  deliveryLongitude: real('delivery_longitude'),
  tableNumber: text('table_number'),
  driverId: text('driver_id').references(() => deliveryDrivers.id),
  driverName: text('driver_name'),
  driverPhone: text('driver_phone'),
  vehicleInfo: text('vehicle_info'),
  deliveryFee: real('delivery_fee').default(0).notNull(),
  subtotal: real('subtotal').default(0).notNull(),
  taxAmount: real('tax_amount').default(0).notNull(),
  discountAmount: real('discount_amount').default(0).notNull(),
  totalAmount: real('total_amount').default(0).notNull(),
  items: text('items', { mode: 'json' }).notNull(), // Line items snapshot
  note: text('note'),
  estimatedTimeMinutes: integer('estimated_time_minutes').default(30).notNull(),
  confirmedAt: integer('confirmed_at', { mode: 'timestamp' }),
  cookingStartedAt: integer('cooking_started_at', { mode: 'timestamp' }),
  readyAt: integer('ready_at', { mode: 'timestamp' }),
  dispatchedAt: integer('dispatched_at', { mode: 'timestamp' }),
  deliveredAt: integer('delivered_at', { mode: 'timestamp' }),
  cancelledAt: integer('cancelled_at', { mode: 'timestamp' }),
  cancelReason: text('cancel_reason'),
  cancelledBy: text('cancelled_by'), // 'server', 'customer', 'admin'
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

// 3. Order Status Audit Logs
export const orderStatusLogs = sqliteTable('order_status_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  orderId: text('order_id').notNull().references(() => deliveryOrders.id),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  changedBy: text('changed_by'),
  actorRole: text('actor_role').default('cashier').notNull(), // 'cashier', 'kitchen', 'driver', 'admin', 'customer'
  note: text('note'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
});
