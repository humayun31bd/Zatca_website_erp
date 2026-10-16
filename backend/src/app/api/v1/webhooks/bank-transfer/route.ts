import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { onboardingSubscriptions } from "@/lib/db/cloud_schema";
import { invoices } from "@/lib/db/schema";
import { sendConfirmationEmail } from "@/lib/email/emailer";
import { eq } from "drizzle-orm";

// Bangladesh Bank Transfer (NPSB / BEFTN / RTGS / Deposit Verification) Endpoint
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { onboardingId, invoiceId, bankName, depositSlipRef, amountPaid, isVerified } = body;

    if (!onboardingId && !invoiceId) {
      return NextResponse.json(
        { error: "onboardingId or invoiceId is required" },
        { status: 400 }
      );
    }

    if (!isVerified) {
      return NextResponse.json({
        success: true,
        message: "Bank deposit slip submitted and pending admin verification.",
      });
    }

    // 1. Process Bank Verified Onboarding Subscription
    if (onboardingId && isVerified) {
      const records = await db
        .select()
        .from(onboardingSubscriptions)
        .where(eq(onboardingSubscriptions.id, onboardingId));

      if (records.length > 0) {
        const sub = records[0];

        // Update payment status to paid
        await db
          .update(onboardingSubscriptions)
          .set({ paymentStatus: "paid", updatedAt: new Date() })
          .where(eq(onboardingSubscriptions.id, onboardingId));

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

    // 2. Process Bank Verified Invoice
    if (invoiceId && isVerified) {
      await db
        .update(invoices)
        .set({ paymentStatus: "PAID" })
        .where(eq(invoices.id, invoiceId));
    }

    return NextResponse.json({
      success: true,
      message: "Bank transfer payment verified and subscription activated successfully.",
      details: { bankName, depositSlipRef, amountPaid },
    });
  } catch (error: any) {
    console.error("Bank transfer webhook processing error:", error);
    return NextResponse.json({ error: "Bank Transfer Webhook Error" }, { status: 500 });
  }
}
