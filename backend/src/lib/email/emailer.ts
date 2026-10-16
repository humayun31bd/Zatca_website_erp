import nodemailer from 'nodemailer';

function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
}

const FROM_EMAIL = process.env.SMTP_FROM || 'Intelligent ERP <noreply@intelligentdive.com>';

export async function sendConfirmationEmail({
  to,
  companyName,
  confirmUrl,
  packagePlan,
}: {
  to: string;
  companyName: string;
  confirmUrl: string;
  packagePlan: string;
}) {
  const transporter = getTransporter();

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 40px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 32px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 26px; font-weight: 800;">Intelligent ERP</h1>
          <p style="margin-top: 8px; opacity: 0.9;">Confirm Your Subscription</p>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #0f172a; margin-top: 0;">Welcome, ${companyName}!</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #475569;">
            Thank you for choosing <strong>Intelligent ERP</strong>. Your <strong>${packagePlan.toUpperCase()}</strong> package registration was successful.
          </p>
          <p style="font-size: 15px; line-height: 1.6; color: #475569;">
            Please click the button below to confirm your email address and automatically launch your dedicated ERP server instance.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${confirmUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              Confirm Email & Launch Instance &rarr;
            </a>
          </div>
          <p style="font-size: 13px; color: #94a3b8; text-align: center;">
            If button doesn't work, copy & paste this URL: <br/>
            <a href="${confirmUrl}" style="color: #2563eb;">${confirmUrl}</a>
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
          &copy; ${new Date().getFullYear()} Intelligent Technologies Limited. All rights reserved.
        </div>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject: `[Action Required] Confirm your email to activate Intelligent ERP`,
      html: htmlContent,
    });
    console.log(`Confirmation email dispatched successfully to ${to}`);
  } catch (err: any) {
    console.error(`Failed to dispatch confirmation email to ${to}:`, err.message);
  }
}

export async function sendCredentialsEmail({
  to,
  companyName,
  clientUrl,
  username,
  packagePlan,
}: {
  to: string;
  companyName: string;
  clientUrl: string;
  username: string;
  packagePlan: string;
}) {
  const transporter = getTransporter();

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 40px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 32px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 26px; font-weight: 800;">🎉 Your Instance is Live!</h1>
          <p style="margin-top: 8px; opacity: 0.9;">Intelligent ERP Dedicated Portal</p>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #0f172a; margin-top: 0;">Congratulations, ${companyName}!</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #475569;">
            Your dedicated <strong>Intelligent ERP (${packagePlan.toUpperCase()})</strong> instance has been provisioned and is ready for use.
          </p>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 12px 0; font-size: 14px;"><strong>Portal URL:</strong> <a href="${clientUrl}" style="color: #059669; font-weight: bold;">${clientUrl}</a></p>
            <p style="margin: 0; font-size: 14px;"><strong>Admin Email / Username:</strong> ${username}</p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${clientUrl}" style="background-color: #059669; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              Access My ERP Dashboard &rarr;
            </a>
          </div>
        </div>
        <div style="background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
          &copy; ${new Date().getFullYear()} Intelligent Technologies Limited. All rights reserved.
        </div>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject: `🎉 Your Intelligent ERP Portal is Ready - ${clientUrl}`,
      html: htmlContent,
    });
    console.log(`Welcome credentials email dispatched successfully to ${to}`);
  } catch (err: any) {
    console.error(`Failed to dispatch credentials email to ${to}:`, err.message);
  }
}
