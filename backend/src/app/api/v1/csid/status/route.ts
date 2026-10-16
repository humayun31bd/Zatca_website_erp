import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { csidCertificates } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId as string;

    const certs = await db.query.csidCertificates.findMany({
      where: and(
        eq(csidCertificates.tenantId, tenantId),
        eq(csidCertificates.isActive, true)
      )
    });

    const hasCompliance = certs.some(c => c.type === 'COMPLIANCE');
    const hasProduction = certs.some(c => c.type === 'PRODUCTION');
    const complianceRequestId = certs.find(c => c.type === 'COMPLIANCE')?.complianceRequestId;

    return NextResponse.json({
      success: true,
      hasCompliance,
      hasProduction,
      complianceRequestId,
    });
  } catch (error: any) {
    console.error("GET CSID Status Error:", error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
