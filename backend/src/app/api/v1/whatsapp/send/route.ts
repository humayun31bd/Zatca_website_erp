import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { whatsappMessages, invoices } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { invoiceId, phoneNumber, templateName } = body;

    if (!invoiceId || !phoneNumber || !templateName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify invoice belongs to tenant
    const invoice = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, invoiceId), eq(invoices.tenantId, session.tenantId))
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const waMessageId = `wa_msg_${randomUUID()}`;

    // Insert into DB
    await db.insert(whatsappMessages).values({
      invoiceId,
      tenantId: session.tenantId,
      waMessageId,
      phoneNumber,
      templateName,
      payload: body,
      status: 'SENT',
      sentAt: new Date()
    });

    // Update invoice status
    await db.update(invoices)
      .set({ whatsappStatus: 'SENT' })
      .where(eq(invoices.id, invoiceId));

    // MVP: In a real implementation, we would call the Meta WhatsApp Cloud API here.
    // For now, we simulate a successful API call.
    
    return NextResponse.json({
      success: true,
      messageId: waMessageId,
      status: "SENT"
    });

  } catch (error: any) {
    console.error('WhatsApp send error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
