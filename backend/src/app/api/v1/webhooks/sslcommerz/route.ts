import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { onboardingSubscriptions } from "@/lib/db/cloud_schema";
import { invoices } from "@/lib/db/schema";
import { sendConfirmationEmail } from "@/lib/email/emailer";
import { eq } from "drizzle-orm";

// SSLCommerz IPN / Callback Webhook Endpoint
export async function POST(req: NextRequest) {
  try {
    let bodyData: any = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        bodyData[key] = value;
      });
    } else {
      bodyData = await req.json();
    }

    const { tran_id, val_id, status, amount, currency, value_a: onboardingId } = bodyData;

    if (!tran_id || !status) {
      return NextResponse.json({ error: "Missing required SSLCommerz parameters" }, { status: 400 });
    }

    const isSuccess = status === "VALID" || status === "VALIDATED";

    // 1. Handle Client Onboarding Package Payment
    const targetOnboardingId = onboardingId || (tran_id.startsWith("ONB_") ? tran_id.replace("ONB_", "") : null);

    if (targetOnboardingId && isSuccess) {
      const records = await db
        .select()
        .from(onboardingSubscriptions)
        .where(eq(onboardingSubscriptions.id, targetOnboardingId));

      if (records.length > 0) {
        const sub = records[0];

        // Update payment status to paid
        await db
          .update(onboardingSubscriptions)
          .set({ paymentStatus: "paid", updatedAt: new Date() })
          .where(eq(onboardingSubscriptions.id, targetOnboardingId));

        // Dispatch Email #1 Confirmation Email
        const confirmUrl = `${process.env.NEXT_PUBLIC_API_BASE || 'https://intelligentdive.com'}/api/v1/onboarding?action=confirm-email&token=${sub.verificationToken}`;

        await sendConfirmationEmail({
          to: sub.email,
          companyName: sub.companyName,
          confirmUrl,
          packagePlan: sub.packagePlan,
        });
      }
    }

    // 2. Handle ERP Invoice Payment
    if (tran_id.startsWith("INV_") && isSuccess) {
      const invoiceId = tran_id.replace("INV_", "");
      await db
        .update(invoices)
        .set({ paymentStatus: "PAID" })
        .where(eq(invoices.id, invoiceId));
    }

    return NextResponse.json({ success: true, message: "SSLCommerz IPN processed successfully", val_id });
  } catch (error: any) {
    console.error("SSLCommerz Webhook processing error:", error);
    return NextResponse.json({ error: "SSLCommerz Webhook Error" }, { status: 500 });
  }
}
