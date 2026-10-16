import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cancellation_stats } from '@/lib/db/analytics_views';
import { analyticsLog } from '@/lib/analytics_logger';
import { auditLogs } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/analytics/cancellations
 * Returns cancellation statistics grouped by delivery channel and reason.
 */
export async function GET() {
  const stats = await db.select().from(cancellation_stats);

  await db.insert(auditLogs).values({
    actorType: 'SYSTEM',
    action: 'FETCH_CANCELLATION_STATS',
    resourceType: 'ANALYTICS',
    resourceId: null,
    metadata: JSON.stringify({ stats }),
  });

  analyticsLog('Fetched cancellation stats');
  return NextResponse.json(stats);
}
