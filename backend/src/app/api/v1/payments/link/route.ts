import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { invoiceId, gateway } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: "Missing invoiceId" }, { status: 400 });
    }

    // Verify invoice belongs to tenant
    const invoice = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, invoiceId), eq(invoices.tenantId, session.tenantId))
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // MVP: In a real implementation, we would call Moyasar/PayTabs API here
    // to generate a secure checkout URL.
    
    // We will generate a mock link
    const mockPaymentLink = `https://checkout.moyasar.com/sim/${invoice.id}`;

    // Update invoice with the generated gateway
    await db.update(invoices)
      .set({ 
        paymentGateway: gateway || 'MOYASAR'
      })
      .where(eq(invoices.id, invoiceId));
    
    return NextResponse.json({
      success: true,
      paymentUrl: mockPaymentLink
    });

  } catch (error: any) {
    console.error('Payment link generation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
