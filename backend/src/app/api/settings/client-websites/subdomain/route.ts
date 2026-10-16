import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clientWebsites } from '@/lib/db/cloud_schema';
import { exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

const execAsync = promisify(exec);

// Helper to sanitize tenant/client name to valid DNS subdomain slug
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function provisionVpsSubdomain(subdomain: string, port: string): Promise<boolean> {
  const isDev = process.env.NODE_ENV !== 'production' || process.platform === 'win32' || process.env.SKIP_VPS_PROVISIONING === 'true';
  if (isDev) {
    console.log(`[Dev Mode] Skipped VPS subdomain hosting CLI command for: ${subdomain}`);
    return true;
  }
  try {
    const command = `sudo /usr/local/bin/add-site-cli "${subdomain}" "1" "${port}"`;
    await execAsync(command);
    return true;
  } catch (cmdErr: any) {
    console.error('Subdomain provisioning error:', cmdErr);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, tenantId, appPort, appType } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Subdomain name or client name is required' },
        { status: 400 }
      );
    }

    const slug = slugify(name);
    const fullSubdomain = `${slug}.intelligentdive.com`;
    const port = appPort ? parseInt(appPort, 10) : 3000;
    const type = appType || 'nextjs';
    const activeTenantId = tenantId || 'default-tenant';

    // 1. Check if subdomain already exists
    const existing = await db
      .select()
      .from(clientWebsites)
      .where(eq(clientWebsites.domainName, fullSubdomain));

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: `Subdomain ${fullSubdomain} already exists` },
        { status: 409 }
      );
    }

    const newId = randomUUID();

    // 2. Insert record in DB
    const insertedRecords = await db
      .insert(clientWebsites)
      .values({
        id: newId,
        tenantId: activeTenantId,
        domainName: fullSubdomain,
        appType: type,
        appPort: port,
        status: 'pending',
        sslActive: true, // Inherits wildcard SSL
      })
      .returning();

    const newSite = insertedRecords[0];

    // 3. Provision on VPS (Skipped in Dev Mode)
    const success = await provisionVpsSubdomain(fullSubdomain, port.toString());
    const finalStatus = success ? 'active' : 'error';

    // 4. Update status in database
    await db
      .update(clientWebsites)
      .set({ status: finalStatus, updatedAt: new Date() })
      .where(eq(clientWebsites.id, newId));

    newSite.status = finalStatus;

    return NextResponse.json({
      success: true,
      message: `Subdomain ${fullSubdomain} provisioned successfully`,
      data: newSite,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to provision subdomain' },
      { status: 500 }
    );
  }
}
