import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clientWebsites } from '@/lib/db/cloud_schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const websites = await db.select().from(clientWebsites);
    const healthResults: Array<{
      id: string;
      domainName: string;
      status: string;
      statusCode: number | null;
      responseTimeMs: number | null;
      sslActive: boolean;
      lastChecked: string;
    }> = [];

    for (const site of websites) {
      const startTime = Date.now();
      let statusCode: number | null = null;
      let isHealthy = false;
      let sslActive = site.sslActive;

      try {
        const protocol = sslActive ? 'https' : 'http';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 sec timeout

        const response = await fetch(`${protocol}://${site.domainName}`, {
          method: 'HEAD',
          signal: controller.signal,
          headers: { 'User-Agent': 'ERP-HealthCheck-Monitor/1.0' },
        });

        clearTimeout(timeoutId);
        statusCode = response.status;
        isHealthy = response.ok || statusCode < 500;
      } catch (err: any) {
        isHealthy = false;
      }

      const responseTimeMs = Date.now() - startTime;
      const newStatus = isHealthy ? 'active' : 'offline';

      // Update DB record if status changed
      if (site.status !== newStatus) {
        await db
          .update(clientWebsites)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(clientWebsites.id, site.id));
      }

      healthResults.push({
        id: site.id,
        domainName: site.domainName,
        status: newStatus,
        statusCode,
        responseTimeMs: isHealthy ? responseTimeMs : null,
        sslActive,
        lastChecked: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: healthResults.length,
        active: healthResults.filter((r) => r.status === 'active').length,
        offline: healthResults.filter((r) => r.status === 'offline').length,
      },
      data: healthResults,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Health check failed' },
      { status: 500 }
    );
  }
}
