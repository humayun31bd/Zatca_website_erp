import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tenantSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifySession } from '@/lib/auth/session';

export async function GET(req: Request) {
  try {
    const session = await verifySession(req);
    if (!session || !session.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [settings] = await db.select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, session.tenantId));

    const rawSmtp: any = settings?.smtpSettings || {};

    const isPasswordSet = !!rawSmtp.password;
    const safeSmtp = {
      enabled: rawSmtp.enabled ?? false,
      host: rawSmtp.host || '',
      port: rawSmtp.port || 587,
      secure: rawSmtp.secure ?? false,
      requireTls: rawSmtp.requireTls ?? true,
      username: rawSmtp.username || '',
      password: isPasswordSet ? '••••••••' : '',
      isPasswordSet,
      fromName: rawSmtp.fromName || '',
      fromEmail: rawSmtp.fromEmail || '',
    };

    return NextResponse.json({
      success: true,
      smtpSettings: safeSmtp,
    });
  } catch (error) {
    console.error('Failed to get SMTP settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await verifySession(req);
    if (!session || !session.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { smtpSettings } = body;

    if (!smtpSettings) {
      return NextResponse.json({ error: 'smtpSettings is required' }, { status: 400 });
    }

    const [existing] = await db.select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, session.tenantId));

    const existingSmtp: any = existing?.smtpSettings || {};

    // Handle password preservation if user passed masked password
    let finalPassword = smtpSettings.password;
    if (finalPassword === '••••••••' || (finalPassword === '' && existingSmtp.password)) {
      finalPassword = existingSmtp.password;
    }

    const updatedSmtp = {
      enabled: Boolean(smtpSettings.enabled),
      host: String(smtpSettings.host || '').trim(),
      port: Number(smtpSettings.port) || 587,
      secure: Boolean(smtpSettings.secure),
      requireTls: Boolean(smtpSettings.requireTls),
      username: String(smtpSettings.username || '').trim(),
      password: finalPassword || '',
      fromName: String(smtpSettings.fromName || '').trim(),
      fromEmail: String(smtpSettings.fromEmail || '').trim(),
    };

    if (existing) {
      const [updated] = await db.update(tenantSettings)
        .set({
          smtpSettings: updatedSmtp,
          updatedAt: new Date(),
        })
        .where(eq(tenantSettings.tenantId, session.tenantId))
        .returning();

      return NextResponse.json({
        success: true,
        message: 'SMTP settings updated successfully',
        settings: {
          ...(updated.smtpSettings as Record<string, any>),
          password: updatedSmtp.password ? '••••••••' : '',
          isPasswordSet: !!updatedSmtp.password,
        },
      });
    } else {
      const [inserted] = await db.insert(tenantSettings)
        .values({
          tenantId: session.tenantId,
          businessType: 'Retail',
          productPolicy: {},
          receiptSettings: {},
          smtpSettings: updatedSmtp,
        })
        .returning();

      return NextResponse.json({
        success: true,
        message: 'SMTP settings created successfully',
        settings: {
          ...(inserted.smtpSettings as Record<string, any>),
          password: updatedSmtp.password ? '••••••••' : '',
          isPasswordSet: !!updatedSmtp.password,
        },
      });
    }
  } catch (error) {
    console.error('Failed to update SMTP settings:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: String(error) }, { status: 500 });
  }
}
