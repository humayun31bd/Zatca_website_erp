import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, webhookEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Basic verification for MVP
    // Assuming body contains { invoiceId, status: "paid", amount, ... }

    if (!body.invoiceId || body.status !== 'paid') {
      return NextResponse.json({ success: false, message: "Invalid payload" });
    }

    // Find the invoice in DB
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, body.invoiceId)
    });

    if (invoice) {
      await db.update(invoices)
        .set({ 
          paymentStatus: 'PAID',
          paidAt: new Date()
        })
        .where(eq(invoices.id, invoice.id));

      // Log webhook event
      await db.insert(webhookEvents).values({
        tenantId: invoice.tenantId,
        source: 'MOYASAR',
        eventType: 'payment.paid',
        referenceId: body.invoiceId,
        payload: body,
        isProcessed: true,
        processedAt: new Date()
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Payment webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
