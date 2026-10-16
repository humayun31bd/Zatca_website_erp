import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clientWebsites } from '@/lib/db/cloud_schema';
import { exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

const execAsync = promisify(exec);

async function provisionVpsSite(domainName: string, typeCode: string, param: string, phpVersion: string = '8.1'): Promise<boolean> {
  const isDev = process.env.NODE_ENV !== 'production' || process.platform === 'win32' || process.env.SKIP_VPS_PROVISIONING === 'true';
  if (isDev) {
    console.log(`[Dev Mode] Skipped VPS site hosting CLI command for domain: ${domainName}`);
    return true;
  }
  try {
    const command = `sudo /usr/local/bin/add-site-cli "${domainName}" "${typeCode}" "${param}" "${phpVersion}"`;
    await execAsync(command);
    return true;
  } catch (cmdErr: any) {
    console.error('VPS provisioning command error:', cmdErr);
    return false;
  }
}

// GET: Fetch all client websites
export async function GET() {
  try {
    const websites = await db.select().from(clientWebsites);
    return NextResponse.json({ success: true, data: websites });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch client websites' },
      { status: 500 }
    );
  }
}

// POST: Create and Provision a new client website
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { domainName, appType, appPort, documentRoot, phpVersion, clientId, tenantId } = body;

    if (!domainName || !appType) {
      return NextResponse.json(
        { success: false, error: 'domainName and appType are required' },
        { status: 400 }
      );
    }

    const newId = randomUUID();
    const activeTenantId = tenantId || 'default-tenant';

    // 1. Insert record in DB with status 'pending'
    const insertedRecords = await db
      .insert(clientWebsites)
      .values({
        id: newId,
        tenantId: activeTenantId,
        clientId: clientId || null,
        domainName,
        appType,
        appPort: appPort ? parseInt(appPort, 10) : null,
        documentRoot: documentRoot || null,
        phpVersion: phpVersion || '8.1',
        status: 'pending',
        sslActive: false,
      })
      .returning();

    const newSite = insertedRecords[0];

    // 2. Prepare VPS Provisioning Parameters
    let typeCode = '1';
    let param = appPort?.toString() || '3000';

    if (appType === 'laravel') {
      typeCode = '2';
      param = documentRoot || `/home/${domainName}/public_html`;
    } else if (appType === 'static') {
      typeCode = '3';
      param = documentRoot || `/var/www/${domainName}`;
    }

    // 3. Execute Provisioning (Skipped in Dev Mode)
    const success = await provisionVpsSite(domainName, typeCode, param, phpVersion || '8.1');
    const finalStatus = success ? 'active' : 'error';

    // 4. Update status in database
    await db
      .update(clientWebsites)
      .set({ status: finalStatus, updatedAt: new Date() })
      .where(eq(clientWebsites.id, newId));

    newSite.status = finalStatus;

    return NextResponse.json({ success: true, data: newSite });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to provision website' },
      { status: 500 }
    );
  }
}
