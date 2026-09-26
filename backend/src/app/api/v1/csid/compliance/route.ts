import { NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/auth/keyValidator';
import { requireScope } from '@/lib/auth/rbac';
import { z } from 'zod';

const ComplianceSchema = z.object({
  otp: z.string().min(4),
});

export async function POST(request: Request) {
  try {
    const authContext = await validateApiKey(request);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    requireScope(authContext.scopes, 'TENANT:ADMIN');

    const body = await request.json();
    const parseResult = ComplianceSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parseResult.error.format() }, { status: 400 });
    }

    return NextResponse.json({
      complianceRequestId: `req_${Date.now()}`,
      binarySecurityToken: 'mock-binary-token',
      secret: 'mock-secret',
      message: 'Compliance CSID generated (MOCK)'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: error.message?.includes('Forbidden') ? 403 : 500 });
  }
}

