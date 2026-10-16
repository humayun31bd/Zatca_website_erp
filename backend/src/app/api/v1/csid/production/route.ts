import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { z } from 'zod';
import { db } from '@/lib/db';
import { csidCertificates } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const ProductionSchema = z.object({
  complianceRequestId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId as string;
    const body = await req.json();
    const parseResult = ProductionSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parseResult.error.format() }, { status: 400 });
    }

    // Verify compliance cert exists
    const existingCompliance = await db.query.csidCertificates.findFirst({
      where: and(
        eq(csidCertificates.tenantId, tenantId),
        eq(csidCertificates.type, 'COMPLIANCE'),
        eq(csidCertificates.complianceRequestId, parseResult.data.complianceRequestId),
        eq(csidCertificates.isActive, true)
      )
    });

    if (!existingCompliance) {
      return NextResponse.json({ error: 'Active Compliance CSID not found for this request ID' }, { status: 404 });
    }

    // Mark any existing active production certs as inactive
    await db.update(csidCertificates)
      .set({ isActive: false })
      .where(and(eq(csidCertificates.tenantId, tenantId), eq(csidCertificates.type, 'PRODUCTION')));

    // Insert new production cert
    const [newCert] = await db.insert(csidCertificates).values({
      tenantId,
      type: 'PRODUCTION',
      complianceRequestId: parseResult.data.complianceRequestId, // Link to compliance request
      binarySecurityToken: 'mock-prod-binary-token', // TODO: Actual ZATCA API integration
      secret: 'mock-prod-secret',
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000), // 5 years validity
      isActive: true,
    }).returning();

    return NextResponse.json({
      success: true,
      productionCsid: newCert.id,
      message: 'Production CSID generated successfully'
    });
  } catch (error: any) {
    console.error("POST Production CSID Error:", error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}

