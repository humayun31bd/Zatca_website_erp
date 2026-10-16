import nodemailer from 'nodemailer';
import { db } from '../db';
import { tenantSettings } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface SmtpConfig {
  enabled?: boolean;
  host?: string;
  port?: number;
  secure?: boolean; // true for 465 (SSL), false for 587/25 (TLS/STARTTLS)
  requireTls?: boolean;
  username?: string;
  password?: string;
  fromName?: string;
  fromEmail?: string;
}

/**
 * Creates a nodemailer Transporter based on provided SMTP configuration
 */
export function createTransporter(config: SmtpConfig) {
  const host = config.host || 'smtp.gmail.com';
  const port = Number(config.port) || 587;
  const secure = config.secure ?? (port === 465);

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: (config.username && config.password) ? {
      user: config.username,
      pass: config.password,
    } : undefined,
    tls: {
      rejectUnauthorized: false, // Prevents self-signed cert issues in dev
    },
    connectionTimeout: 10000, // 10s timeout
  });
}

/**
 * Test SMTP connection and send a test email
 */
export async function testSmtpConfig(config: SmtpConfig, testRecipient: string) {
  if (!config.host) {
    throw new Error('SMTP Host is required');
  }
  if (!testRecipient) {
    throw new Error('Test recipient email address is required');
  }

  const transporter = createTransporter(config);

  // 1. Verify connection & authentication
  await transporter.verify();

  // 2. Send test email
  const fromName = config.fromName || 'ZATCA ERP System';
  const fromEmail = config.fromEmail || config.username || 'no-reply@erp.local';

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: testRecipient,
    subject: '✅ SMTP Connection Test - ZATCA ERP',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; borderRadius: 8px;">
        <h2 style="color: #2563EB;">SMTP Configuration Test Successful</h2>
        <p>Hello,</p>
        <p>This email confirms that your SMTP server settings in <strong>ZATCA ERP System</strong> are correctly configured and operating properly.</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p style="margin: 4px 0;"><strong>Host:</strong> ${config.host}</p>
          <p style="margin: 4px 0;"><strong>Port:</strong> ${config.port}</p>
          <p style="margin: 4px 0;"><strong>Security:</strong> ${config.secure ? 'SSL (Port 465)' : 'TLS/STARTTLS (Port ' + config.port + ')'}</p>
          <p style="margin: 4px 0;"><strong>From Email:</strong> ${fromEmail}</p>
        </div>
        <p style="font-size: 12px; color: #666; margin-top: 20px;">Sent automatically from your ZATCA ERP System settings page.</p>
      </div>
    `,
    text: `SMTP Configuration Test Successful.\nHost: ${config.host}:${config.port}\nFrom: ${fromEmail}`,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}

/**
 * Send an email on behalf of a tenant using their configured SMTP settings
 */
export async function sendTenantEmail(tenantId: string, options: { to: string; subject: string; html: string; text?: string }) {
  const [settings] = await db.select()
    .from(tenantSettings)
    .where(eq(tenantSettings.tenantId, tenantId));

  const smtp: SmtpConfig = settings?.smtpSettings || {};

  if (!smtp.enabled) {
    console.log(`[SMTP] SMTP is disabled for tenant ${tenantId}. Skipping email send.`);
    return null;
  }

  const transporter = createTransporter(smtp);
  const fromName = smtp.fromName || 'ZATCA ERP System';
  const fromEmail = smtp.fromEmail || smtp.username || 'no-reply@erp.local';

  return await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}
