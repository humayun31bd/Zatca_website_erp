import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { delivery_time_stats, cancellation_stats } from '@/lib/db/analytics_views';
import { analyticsLog } from '@/lib/analytics_logger';
import { auditLogs } from '@/lib/db/schema';
import { deliveryOrders } from '@/lib/db/delivery_orders_schema';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/analytics/summary
 * Returns overall delivery‑time stats, cancellation breakdown and channel distribution.
 */
export async function GET() {
  // Delivery‑time stats per channel
  const deliveryStats = await db.select().from(delivery_time_stats);
  // Cancellation stats per channel & reason
  const cancelStats = await db.select().from(cancellation_stats);

  // Channel distribution (orders per delivery_type)
  const channelDist = await db
    .select({ delivery_type: deliveryOrders.orderType, count: sql<number>`COUNT(*)` })
    .from(deliveryOrders)
    .groupBy(deliveryOrders.orderType);

  // Audit log entry for compliance
  await db.insert(auditLogs).values({
    actorType: 'SYSTEM',
    action: 'FETCH_ANALYTICS_SUMMARY',
    resourceType: 'ANALYTICS',
    resourceId: null,
    metadata: JSON.stringify({ deliveryStats, cancelStats, channelDist }),
  });

  analyticsLog('Fetched analytics summary');

  return NextResponse.json({
    deliveryTimeStats: deliveryStats,
    cancellationStats: cancelStats,
    channelDistribution: channelDist,
  });
}
