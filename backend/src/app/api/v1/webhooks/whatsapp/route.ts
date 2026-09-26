import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { whatsappMessages, invoices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    // Meta verification (hub.challenge) for webhook setup
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === "zatca_whatsapp_webhook_token") {
      return new NextResponse(challenge, { status: 200 });
    }

    const body = await req.json();

    // Process status updates from Meta
    if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.statuses) {
      const statuses = body.entry[0].changes[0].value.statuses;
      
      for (const status of statuses) {
        const waMessageId = status.id;
        const statusStr = status.status.toUpperCase(); // 'SENT', 'DELIVERED', 'READ', 'FAILED'
        
        const timestamp = new Date(parseInt(status.timestamp) * 1000);

        // Find the message in DB
        const msg = await db.query.whatsappMessages.findFirst({
          where: eq(whatsappMessages.waMessageId, waMessageId)
        });

        if (msg) {
          const updateData: any = { status: statusStr };
          if (statusStr === 'DELIVERED') updateData.deliveredAt = timestamp;
          if (statusStr === 'READ') updateData.readAt = timestamp;
          if (statusStr === 'FAILED') updateData.failedAt = timestamp;

          await db.update(whatsappMessages)
            .set(updateData)
            .where(eq(whatsappMessages.waMessageId, waMessageId));

          // Also update invoice overall status if needed
          await db.update(invoices)
            .set({ whatsappStatus: statusStr })
            .where(eq(invoices.id, msg.invoiceId));
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Handle Meta's verification request which is a GET
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  // In production, token should match what is configured in Meta App Dashboard
  if (mode && token) {
    if (mode === "subscribe" && token === "my_secret_token_123") {
      return new NextResponse(challenge, { status: 200 });
    } else {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  return new NextResponse("Bad Request", { status: 400 });
}
