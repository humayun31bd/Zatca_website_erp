import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, invoiceLineItems, invoicePayments, clients, auditLogs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const invoiceId = params.id;

    // Fetch the invoice
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(
        eq(invoices.id, invoiceId),
        eq(invoices.tenantId, session.tenantId as string)
      ))
      .limit(1);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Fetch buyer phone if clientId exists
    let buyerPhone = null;
    if (invoice.clientId) {
      const [client] = await db.select().from(clients).where(eq(clients.id, invoice.clientId)).limit(1);
      if (client?.phoneNumber) buyerPhone = client.phoneNumber;
    }

    // Fetch line items
    const lineItems = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, invoiceId));

    return NextResponse.json({
      success: true,
      invoice: {
        ...invoice,
        buyerPhone,
        lineItems,
      }
    });

  } catch (error: any) {
    console.error("Fetch invoice detail error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const invoiceId = params.id;
    const [invoice] = await db.select().from(invoices).where(and(
      eq(invoices.id, invoiceId),
      eq(invoices.tenantId, session.tenantId as string)
    )).limit(1);

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const body = await req.json();
    const isOnlyPaymentUpdate = Object.keys(body).every(k => ['paymentStatus', 'paymentMethod', 'referenceNumber'].includes(k));

    // ZATCA TAMPER RESISTANCE RULE: Cannot modify fiscal fields of cleared/reported invoices
    if ((invoice.zatcaStatus === 'CLEARED' || invoice.zatcaStatus === 'REPORTED') && !isOnlyPaymentUpdate) {
      return NextResponse.json({
        error: "ZATCA Tamper Resistance",
        message: "Invoices that have been cleared or reported to ZATCA cannot have their fiscal contents modified. You must issue a Credit/Debit Note instead."
      }, { status: 403 });
    }

    // Update payment status and record payment if provided
    if (body.paymentStatus) {
      await db.update(invoices)
        .set({ 
          paymentStatus: body.paymentStatus, 
          paidAt: body.paymentStatus === 'PAID' ? new Date() : null,
          updatedAt: new Date() 
        })
        .where(eq(invoices.id, invoiceId));

      if (body.paymentMethod) {
        await db.insert(invoicePayments).values({
          tenantId: session.tenantId as string,
          invoiceId: invoiceId,
          paymentMethod: body.paymentMethod,
          amount: Number(invoice.totalAmount),
          referenceNumber: body.referenceNumber || null,
        });
      }
    }

    // Audit log
    await db.insert(auditLogs).values({
      tenantId: session.tenantId as string,
      actorType: 'TENANT',
      action: 'UPDATE_INVOICE',
      resourceType: 'INVOICE',
      resourceId: invoiceId,
      metadata: { fields_updated: Object.keys(body) }
    });

    return NextResponse.json({ success: true, message: "Invoice updated" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const invoiceId = params.id;
    const [invoice] = await db.select().from(invoices).where(and(
      eq(invoices.id, invoiceId),
      eq(invoices.tenantId, session.tenantId as string)
    )).limit(1);

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    // ZATCA TAMPER RESISTANCE RULE: Cannot delete cleared/reported invoices
    if (invoice.zatcaStatus === 'CLEARED' || invoice.zatcaStatus === 'REPORTED') {
      return NextResponse.json({
        error: "ZATCA Tamper Resistance",
        message: "Invoices that have been cleared or reported to ZATCA cannot be deleted. You must issue a Credit/Debit Note instead."
      }, { status: 403 });
    }

    await db.delete(invoices).where(eq(invoices.id, invoiceId));

    // Audit log
    await db.insert(auditLogs).values({
      tenantId: session.tenantId as string,
      actorType: 'TENANT',
      action: 'DELETE_INVOICE',
      resourceType: 'INVOICE',
      resourceId: invoiceId,
      metadata: { invoiceNumber: invoice.invoiceNumber }
    });

    return NextResponse.json({ success: true, message: "Invoice deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
