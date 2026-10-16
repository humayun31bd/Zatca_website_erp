import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { z } from 'zod';
import { db } from '@/lib/db';
import { csidCertificates } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const ComplianceSchema = z.object({
  otp: z.string().min(4),
});

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId as string;
    const body = await req.json();
    const parseResult = ComplianceSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parseResult.error.format() }, { status: 400 });
    }

    // Mark any existing active compliance certs as inactive
    await db.update(csidCertificates)
      .set({ isActive: false })
      .where(and(eq(csidCertificates.tenantId, tenantId), eq(csidCertificates.type, 'COMPLIANCE')));

    const requestId = `req_${Date.now()}`;
    
    // Insert new compliance cert
    const [newCert] = await db.insert(csidCertificates).values({
      tenantId,
      type: 'COMPLIANCE',
      complianceRequestId: requestId,
      binarySecurityToken: 'mock-binary-token', // TODO: Actual ZATCA API integration
      secret: 'mock-secret',
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000), // 5 years validity
      isActive: true,
    }).returning();

    return NextResponse.json({
      success: true,
      complianceRequestId: newCert.complianceRequestId,
      binarySecurityToken: newCert.binarySecurityToken,
      secret: newCert.secret,
      message: 'Compliance CSID generated successfully'
    });
  } catch (error: any) {
    console.error("POST Compliance CSID Error:", error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}

