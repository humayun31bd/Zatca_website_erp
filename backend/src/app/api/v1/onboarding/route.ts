import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { onboardingSubscriptions, clientWebsites } from '@/lib/db/cloud_schema';
import { sendConfirmationEmail, sendCredentialsEmail } from '@/lib/email/emailer';
import { provisionTenantFeatures } from '@/lib/entitlements/provisioner';
import { exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

const execAsync = promisify(exec);

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
    console.error('VPS Auto-Provisioning Error:', cmdErr);
    return false;
  }
}

// POST: User Registration & Package Selection
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { companyName, email, password, packagePlan, billingCycle } = body;

    if (!companyName || !email || !password || !packagePlan) {
      return NextResponse.json(
        { success: false, error: 'companyName, email, password, and packagePlan are required' },
        { status: 400 }
      );
    }

    const slug = slugify(companyName);
    const clientSubdomain = `${slug}.intelligentdive.com`;
    const verificationToken = randomUUID();
    const id = randomUUID();
    const isFree = packagePlan === 'free';

    // Store onboarding registration (emailVerified: false until user clicks confirmation email)
    const [registration] = await db
      .insert(onboardingSubscriptions)
      .values({
        id,
        companyName,
        email,
        passwordHash: password, // In production, hash with bcrypt
        subdomain: clientSubdomain,
        packagePlan,
        billingCycle: isFree ? 'forever' : (billingCycle || 'annual'),
        paymentStatus: isFree ? 'paid' : 'pending',
        emailVerified: false,
        verificationToken,
        vpsProvisioned: false,
        clientUrl: `https://${clientSubdomain}`,
      })
      .returning();

    // Confirmation / Verification Email URL
    const confirmEmailUrl = `${process.env.NEXT_PUBLIC_API_BASE || 'https://intelligentdive.com'}/api/v1/onboarding?action=confirm-email&token=${verificationToken}`;

    // Dispatch Email #1: Verification Email to user for address confirmation
    await sendConfirmationEmail({
      to: email,
      companyName,
      confirmUrl: confirmEmailUrl,
      packagePlan,
    });

    return NextResponse.json({
      success: true,
      message: 'Registration successful! Please check your email to verify your address and activate your instance.',
      data: {
        registrationId: registration.id,
        subdomain: clientSubdomain,
        packagePlan,
        confirmEmailUrl,
        clientUrl: `https://${clientSubdomain}`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}

// GET: Confirm Email & Trigger Automated VPS Site Activation
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const action = searchParams.get('action');

    if (action === 'confirm-email' && token) {
      // Find subscription by token
      const records = await db
        .select()
        .from(onboardingSubscriptions)
        .where(eq(onboardingSubscriptions.verificationToken, token));

      if (records.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired confirmation token' },
          { status: 404 }
        );
      }

      const record = records[0];
      const clientUrl = record.clientUrl || `https://${record.subdomain}`;

      if (record.vpsProvisioned && record.emailVerified) {
        const acceptHeader = req.headers.get('accept') || '';
        if (acceptHeader.includes('text/html')) {
          return new Response(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Site Already Activated - Intelligent ERP</title>
              <style>
                body { font-family: system-ui, sans-serif; background: #090d16; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
                .card { background: #111827; border: 1px solid #1f2937; border-radius: 20px; padding: 40px; max-width: 480px; text-align: center; }
                .btn { display: inline-block; background: #10b981; color: #fff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>✅ Account Already Activated</h1>
                <p>Your site instance for <strong>${record.companyName}</strong> is active and accessible.</p>
                <a href="${clientUrl}" class="btn">Go to Site Dashboard &rarr;</a>
              </div>
            </body>
            </html>
          `, { headers: { 'Content-Type': 'text/html' } });
        }
        return NextResponse.json({
          success: true,
          message: 'Account is already activated!',
          clientUrl,
        });
      }

      // 1. Mark Email Verified & Payment Status Paid
      await db
        .update(onboardingSubscriptions)
        .set({
          emailVerified: true,
          paymentStatus: 'paid',
          updatedAt: new Date(),
        })
        .where(eq(onboardingSubscriptions.id, record.id));

      // 1b. Automatically Provision Tenant Entitlements & Feature Flags
      await provisionTenantFeatures(record.id, record.packagePlan);

      // 2. Provision VPS Nginx Subdomain (Port 3000)
      await provisionVpsSubdomain(record.subdomain, '3000');

      // 3. Register client website record if not existing
      const existingWebsites = await db
        .select()
        .from(clientWebsites)
        .where(eq(clientWebsites.domainName, record.subdomain));

      if (existingWebsites.length === 0) {
        await db.insert(clientWebsites).values({
          id: randomUUID(),
          tenantId: record.id,
          domainName: record.subdomain,
          appType: 'nextjs',
          appPort: 3000,
          status: 'active',
          sslActive: true,
        });
      }

      // 4. Mark Site / VPS Provisioned & Active
      await db
        .update(onboardingSubscriptions)
        .set({ vpsProvisioned: true })
        .where(eq(onboardingSubscriptions.id, record.id));

      // 5. Send User Email after successful site activation
      await sendCredentialsEmail({
        to: record.email,
        companyName: record.companyName,
        clientUrl,
        username: record.email,
        packagePlan: record.packagePlan,
      });

      const acceptHeader = req.headers.get('accept') || '';
      if (acceptHeader.includes('text/html')) {
        return new Response(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Site Activated - Intelligent ERP</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; background: #090d16; color: #ffffff; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
              .card { background: #111827; border: 1px solid #1f2937; border-radius: 20px; padding: 40px; max-width: 480px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
              .icon { font-size: 52px; margin-bottom: 16px; }
              h1 { font-size: 24px; margin: 0 0 12px 0; color: #10b981; }
              p { color: #9ca3af; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0; }
              .url-box { background: #030712; border: 1px solid #374151; padding: 12px 20px; border-radius: 10px; font-family: monospace; color: #60a5fa; margin-bottom: 28px; word-break: break-all; }
              .btn { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; padding: 14px 32px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 16px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">🎉</div>
              <h1>Email Verified & Site Activated!</h1>
              <p>Your dedicated Intelligent ERP instance for <strong>${record.companyName}</strong> is now live. We have also sent a confirmation email to <strong>${record.email}</strong> with your login credentials.</p>
              <div class="url-box">${clientUrl}</div>
              <a href="${clientUrl}" class="btn">Access My ERP Portal &rarr;</a>
            </div>
          </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      }

      return NextResponse.json({
        success: true,
        message: '🎉 Email verified! Your site has been activated and welcome email sent.',
        clientDetails: {
          companyName: record.companyName,
          clientUrl,
          username: record.email,
          packagePlan: record.packagePlan,
          status: 'Active',
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Onboarding confirmation failed' },
      { status: 500 }
    );
  }
}

