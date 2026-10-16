import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { onboardingSubscriptions } from "@/lib/db/cloud_schema";
import { sendConfirmationEmail } from "@/lib/email/emailer";
import { eq } from "drizzle-orm";
import { tapClient } from "@/lib/payments/tap";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-tap-signature") || "";

    // 1. Verify signature (in production mode)
    if (process.env.NODE_ENV === "production" && !tapClient.verifyWebhook(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid Signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);

    // 2. Extract references
    const invoiceId = payload?.reference?.transaction || payload?.reference?.invoice;
    const onboardingId = payload?.reference?.onboardingId || payload?.metadata?.onboardingId;
    const status = payload?.status; // e.g. "CAPTURED", "AUTHORIZED", "DECLINED", "FAILED"

    if (!status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const isPaid = status === "CAPTURED" || status === "AUTHORIZED";

    // 3. Handle Invoice Payment
    if (invoiceId && isPaid) {
      await db
        .update(invoices)
        .set({ paymentStatus: "PAID" })
        .where(eq(invoices.id, invoiceId));
    }

    // 4. Handle Onboarding Package Subscription Payment
    if (onboardingId && isPaid) {
      const records = await db
        .select()
        .from(onboardingSubscriptions)
        .where(eq(onboardingSubscriptions.id, onboardingId));

      if (records.length > 0) {
        const sub = records[0];

        // Update payment status
        await db
          .update(onboardingSubscriptions)
          .set({ paymentStatus: "paid", updatedAt: new Date() })
          .where(eq(onboardingSubscriptions.id, onboardingId));

        // Dispatch Email #1 Confirmation email automatically
        const confirmUrl = `${process.env.NEXT_PUBLIC_API_BASE || 'https://intelligentdive.com'}/api/v1/onboarding?action=confirm-email&token=${sub.verificationToken}`;

        await sendConfirmationEmail({
          to: sub.email,
          companyName: sub.companyName,
          confirmUrl,
          packagePlan: sub.packagePlan,
        });
      }
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook Error" }, { status: 500 });
  }
}
