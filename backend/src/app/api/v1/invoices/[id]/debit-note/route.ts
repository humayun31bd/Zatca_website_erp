import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, invoiceLineItems, tenants, auditLogs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { InvoicePayloadSchema } from "@/types/invoice";
import { serviceLocator } from "@/lib/services/serviceLocator";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const originalInvoiceId = params.id;
    
    // Fetch original invoice
    const [originalInvoice] = await db
      .select()
      .from(invoices)
      .where(and(
        eq(invoices.id, originalInvoiceId),
        eq(invoices.tenantId, session.tenantId as string)
      ))
      .limit(1);

    if (!originalInvoice) {
      return NextResponse.json({ error: "Original invoice not found" }, { status: 404 });
    }

    if (originalInvoice.zatcaStatus !== 'CLEARED' && originalInvoice.zatcaStatus !== 'REPORTED') {
      return NextResponse.json({ error: "Cannot issue debit note for an invoice that is not cleared or reported" }, { status: 400 });
    }

    // Fetch tenant details to get seller info for ZATCA
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, session.tenantId as string))
      .limit(1);

    const body = await req.json();
    
    // Ensure invoiceTypeCode is 383 for Debit Note
    body.typeCode = "383";
    body.originalInvoiceId = originalInvoiceId;
    
    // Inject seller info from tenant settings
    body.seller = {
      name: tenant.name,
      vatNumber: tenant.vatNumber,
      address: "Riyadh, KSA",
    };
    
    // Auto-generate debit note number if missing
    if (!body.invoiceNumber) {
      body.invoiceNumber = `DN-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    }

    const parseResult = InvoicePayloadSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Bad Request', details: parseResult.error.format() }, { status: 400 });
    }

    const invoicePayload = parseResult.data;

    // 1. Save to Database as DRAFT
    const [createdDebitNote] = await db.insert(invoices).values({
      tenantId: session.tenantId as string,
      originalInvoiceId: originalInvoiceId,
      invoiceNumber: invoicePayload.invoiceNumber,
      invoiceType: invoicePayload.invoiceType,
      invoiceTypeCode: invoicePayload.typeCode,
      sellerName: invoicePayload.seller.name,
      sellerVat: invoicePayload.seller.vatNumber,
      sellerAddress: invoicePayload.seller.address,
      buyerName: invoicePayload.buyer.name,
      buyerVat: invoicePayload.buyer.vatNumber || null,
      subtotalAmount: Number(invoicePayload.subtotalAmount),
      totalVatAmount: Number(invoicePayload.totalVatAmount),
      totalAmount: Number(invoicePayload.totalAmount),
      issueDatetime: new Date(invoicePayload.issueDate),
      zatcaStatus: 'DRAFT', 
      whatsappStatus: 'PENDING',
      paymentStatus: 'UNPAID',
    }).returning();

    // Insert Line Items
    if (invoicePayload.lineItems.length > 0) {
      const lineItemsToInsert = invoicePayload.lineItems.map(item => ({
        invoiceId: createdDebitNote.id,
        lineNumber: item.lineNumber,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        taxPercent: Number(item.taxPercent),
        taxAmount: Number(item.taxAmount),
        lineTotal: Number(item.lineTotal),
      }));
      await db.insert(invoiceLineItems).values(lineItemsToInsert);
    }

    // 2. Trigger ZATCA Engine
    const zatcaService = serviceLocator.getZatcaService();
    const zatcaResponse = await zatcaService.clearInvoice(invoicePayload);

    // 3. Update Database with ZATCA Results
    await db.update(invoices).set({
      zatcaStatus: zatcaResponse.clearanceStatus,
      invoiceHash: zatcaResponse.xmlHash,
      qrCodeBase64: zatcaResponse.qrCodeBase64,
    }).where(eq(invoices.id, createdDebitNote.id));

    // Audit Log for Tamper Resistance tracking
    await db.insert(auditLogs).values({
      tenantId: session.tenantId as string,
      actorType: 'TENANT',
      action: 'DEBIT_NOTE_ISSUED',
      resourceType: 'INVOICE',
      resourceId: createdDebitNote.id,
      metadata: { originalInvoiceId, clearanceStatus: zatcaResponse.clearanceStatus }
    });

    return NextResponse.json({
      success: true,
      invoiceId: createdDebitNote.id,
      invoiceNumber: createdDebitNote.invoiceNumber,
      zatca: zatcaResponse,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Debit note creation error:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}
