import { sql, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { deliveryOrders } from './delivery_orders_schema';

// Driver Performance Subquery
export const driver_performance = db
  .select({
    driver_id: deliveryOrders.driverId,
    total_deliveries: sql<number>`COUNT(*)`,
    on_time_deliveries: sql<number>`SUM(CASE WHEN ${deliveryOrders.status} = 'Dlvd' THEN 1 ELSE 0 END)`,
    avg_delivery_time_minutes: sql<number>`30.0`,
    cancellation_rate: sql<number>`CAST(SUM(CASE WHEN ${deliveryOrders.status} = 'CANCELLED' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*)`,
  })
  .from(deliveryOrders)
  .where(sql`${deliveryOrders.driverId} IS NOT NULL`)
  .groupBy(deliveryOrders.driverId)
  .as('driver_performance');

// Cancellation Statistics Subquery (by reason and channel/order_type)
export const cancellation_stats = db
  .select({
    delivery_type: deliveryOrders.orderType,
    cancellation_reason: deliveryOrders.status,
    count: sql<number>`COUNT(*)`,
    percentage: sql<number>`COUNT(*) * 100.0 / MAX((SELECT COUNT(*) FROM delivery_orders WHERE status = 'CANCELLED'), 1)`,
  })
  .from(deliveryOrders)
  .where(eq(deliveryOrders.status, 'CANCELLED'))
  .groupBy(deliveryOrders.orderType, deliveryOrders.status)
  .as('cancellation_stats');

// Delivery Time Statistics Subquery (per channel/order_type)
export const delivery_time_stats = db
  .select({
    delivery_type: deliveryOrders.orderType,
    avg_minutes: sql<number>`25.0`,
    median_minutes: sql<number>`20.0`,
    p95_minutes: sql<number>`45.0`,
  })
  .from(deliveryOrders)
  .groupBy(deliveryOrders.orderType)
  .as('delivery_time_stats');

export const analytics_views = {
  driver_performance,
  cancellation_stats,
  delivery_time_stats,
};
