import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { driver_performance } from '@/lib/db/analytics_views';
import { analyticsLog } from '@/lib/analytics_logger';
import { auditLogs } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/analytics/drivers
 * Returns per-driver performance metrics.
 */
export async function GET() {
  const drivers = await db.select().from(driver_performance);

  // Audit entry
  await db.insert(auditLogs).values({
    actorType: 'SYSTEM',
    action: 'FETCH_DRIVER_PERFORMANCE',
    resourceType: 'ANALYTICS',
    resourceId: null,
    metadata: JSON.stringify({ drivers }),
  });

  analyticsLog('Fetched driver performance analytics');
  return NextResponse.json(drivers);
}
