import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { tapClient } from "@/lib/payments/tap";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-tap-signature") || "";

    // 1. Verify the signature
    if (!tapClient.verifyWebhook(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid Signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);

    // 2. Extract transaction reference
    const invoiceId = payload?.reference?.transaction;
    const status = payload?.status; // e.g. "CAPTURED", "DECLINED", "FAILED"

    if (!invoiceId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 3. Update the invoice status
    if (status === "CAPTURED" || status === "AUTHORIZED") {
      await db
        .update(invoices)
        .set({ paymentStatus: "PAID" })
        .where(eq(invoices.id, invoiceId));
    } else if (status === "DECLINED" || status === "FAILED") {
      // Could potentially log this or set to FAILED_PAYMENT
      console.log(`Payment failed for invoice ${invoiceId}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook Error" }, { status: 500 });
  }
}
