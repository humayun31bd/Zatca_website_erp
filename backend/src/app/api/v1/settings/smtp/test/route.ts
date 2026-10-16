import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { testSmtpConfig, SmtpConfig } from '@/lib/email/smtp-service';
import { db } from '@/lib/db';
import { tenantSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const session = await verifySession(req);
    if (!session || !session.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { testEmail, smtpSettings } = body;

    if (!testEmail) {
      return NextResponse.json({ error: 'Test recipient email (testEmail) is required' }, { status: 400 });
    }

    // Retrieve existing tenant settings if password is missing or masked in payload
    const [existing] = await db.select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, session.tenantId));

    const existingSmtp: any = existing?.smtpSettings || {};

    const configToTest: SmtpConfig = {
      host: smtpSettings?.host || existingSmtp.host,
      port: Number(smtpSettings?.port) || Number(existingSmtp.port) || 587,
      secure: smtpSettings?.secure ?? existingSmtp.secure ?? false,
      requireTls: smtpSettings?.requireTls ?? existingSmtp.requireTls ?? true,
      username: smtpSettings?.username ?? existingSmtp.username,
      password: (smtpSettings?.password && smtpSettings.password !== '••••••••') 
        ? smtpSettings.password 
        : existingSmtp.password,
      fromName: smtpSettings?.fromName || existingSmtp.fromName || 'ZATCA ERP',
      fromEmail: smtpSettings?.fromEmail || existingSmtp.fromEmail || smtpSettings?.username || existingSmtp.username,
    };

    if (!configToTest.host) {
      return NextResponse.json({ error: 'SMTP Host is missing' }, { status: 400 });
    }

    const info = await testSmtpConfig(configToTest, testEmail);

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${testEmail}!`,
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error('SMTP Test Failed:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to connect to SMTP server or send test email.',
      details: String(error),
    }, { status: 400 });
  }
}
