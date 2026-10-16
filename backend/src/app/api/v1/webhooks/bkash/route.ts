import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { onboardingSubscriptions } from "@/lib/db/cloud_schema";
import { invoices } from "@/lib/db/schema";
import { sendConfirmationEmail } from "@/lib/email/emailer";
import { eq } from "drizzle-orm";

// bKash Merchant Payment IPN / Callback Webhook Endpoint
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const {
      paymentID,
      trxID,
      transactionStatus,
      merchantInvoiceNumber,
      amount,
      intent,
    } = payload;

    if (!paymentID || !transactionStatus) {
      return NextResponse.json({ error: "Missing required bKash parameters" }, { status: 400 });
    }

    const isCompleted = transactionStatus === "Completed" || transactionStatus === "Authorized";

    if (!isCompleted) {
      return NextResponse.json({ success: false, message: `bKash payment status is ${transactionStatus}` });
    }

    // 1. Handle Client Onboarding Package Payment
    const targetOnboardingId = merchantInvoiceNumber?.startsWith("ONB_")
      ? merchantInvoiceNumber.replace("ONB_", "")
      : merchantInvoiceNumber;

    if (targetOnboardingId) {
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
    if (merchantInvoiceNumber?.startsWith("INV_")) {
      const invoiceId = merchantInvoiceNumber.replace("INV_", "");
      await db
        .update(invoices)
        .set({ paymentStatus: "PAID" })
        .where(eq(invoices.id, invoiceId));
    }

    return NextResponse.json({
      success: true,
      message: "bKash payment webhook processed successfully",
      trxID,
      paymentID,
    });
  } catch (error: any) {
    console.error("bKash Webhook processing error:", error);
    return NextResponse.json({ error: "bKash Webhook Error" }, { status: 500 });
  }
}
