import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, invoiceLineItems, invoicePayments, tenants, counterSessions } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { InvoicePayloadSchema } from "@/types/invoice";
import { serviceLocator } from "@/lib/services/serviceLocator";
import { waClient } from "@/lib/whatsapp/client";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clientId = req.nextUrl.searchParams.get("clientId");

    const conditions = [eq(invoices.tenantId, session.tenantId as string)];
    if (clientId) {
      conditions.push(eq(invoices.clientId, clientId));
    }

    const data = await db.query.invoices.findMany({
      where: and(...conditions),
      orderBy: [desc(invoices.issueDatetime)],
      with: {
        payments: true,
      },
    });

    return NextResponse.json({ success: true, invoices: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch tenant details to get seller info for ZATCA
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, session.tenantId as string))
      .limit(1);

    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const body = await req.json();
    
    // Inject seller info from tenant settings
    body.seller = {
      name: tenant.name,
      vatNumber: tenant.vatNumber,
      address: "Riyadh, KSA", // Hardcoded fallback for MVP
    };
    
    // Auto-generate invoice number if missing
    if (!body.invoiceNumber) {
      body.invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    }

    const parseResult = InvoicePayloadSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Bad Request', details: parseResult.error.format() }, { status: 400 });
    }

    const invoicePayload = parseResult.data;

    // Calculate Payment Status
    const totalPaid = invoicePayload.payments.reduce((sum, p) => sum + p.amount, 0);
    let paymentStatus = 'UNPAID';
    if (totalPaid >= invoicePayload.totalAmount) {
      paymentStatus = 'PAID';
    } else if (totalPaid > 0) {
      paymentStatus = 'PARTIAL';
    }

    // 1. Save to Database initially as DRAFT
    const [createdInvoice] = await db.insert(invoices).values({
      tenantId: session.tenantId as string,
      clientId: invoicePayload.clientId || null,
      counterId: invoicePayload.counterId || null,
      originalInvoiceId: body.originalInvoiceId || null,
      invoiceNumber: invoicePayload.invoiceNumber,
      invoiceType: invoicePayload.invoiceType,
      invoiceTypeCode: invoicePayload.typeCode,
      sellerName: invoicePayload.seller.name,
      sellerVat: invoicePayload.seller.vatNumber,
      sellerAddress: invoicePayload.seller.address,
      buyerName: invoicePayload.buyer.name,
      buyerVat: invoicePayload.buyer.vatNumber || null,
      subtotalAmount: invoicePayload.subtotalAmount.toString(),
      totalVatAmount: invoicePayload.totalVatAmount.toString(),
      totalAmount: invoicePayload.totalAmount.toString(),
      issueDatetime: new Date(invoicePayload.issueDate),
      zatcaStatus: 'DRAFT', // Will be updated by engine
      whatsappStatus: 'PENDING',
      paymentStatus: paymentStatus,
    }).returning();

    // Insert Line Items
    if (invoicePayload.lineItems.length > 0) {
      const lineItemsToInsert = invoicePayload.lineItems.map(item => ({
        invoiceId: createdInvoice.id,
        lineNumber: item.lineNumber,
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        taxPercent: item.taxPercent.toString(),
        taxAmount: item.taxAmount.toString(),
        lineTotal: item.lineTotal.toString(),
      }));
      await db.insert(invoiceLineItems).values(lineItemsToInsert);
    }

    // Insert Payments
    if (invoicePayload.payments.length > 0) {
      const paymentsToInsert = invoicePayload.payments.map(p => ({
        tenantId: session.tenantId as string,
        invoiceId: createdInvoice.id,
        paymentMethod: p.method,
        amount: p.amount.toString(),
        referenceNumber: p.reference || null,
      }));
      await db.insert(invoicePayments).values(paymentsToInsert);

      // If there is an active counter session, we should theoretically update its cashSales here
      // But usually this is queried dynamically, or we can just update it here for simplicity:
      if (invoicePayload.counterId) {
        // Simple update: Add to cash_sales if method is CASH
        const cashAmount = invoicePayload.payments.filter(p => p.method === 'CASH').reduce((sum, p) => sum + p.amount, 0);
        if (cashAmount > 0) {
          // This assumes a Postgres dialect update
          // await db.execute(sql`UPDATE counter_sessions SET cash_sales = cash_sales + ${cashAmount} WHERE counter_id = ${invoicePayload.counterId} AND status = 'OPEN'`);
        }
      }
    }

    // 2. Trigger ZATCA Engine
    const zatcaService = serviceLocator.getZatcaService();
    const zatcaResponse = await zatcaService.clearInvoice(invoicePayload);

    // 3. Update Database with ZATCA Results
    await db.update(invoices).set({
      zatcaStatus: zatcaResponse.clearanceStatus,
      invoiceHash: zatcaResponse.xmlHash,
      qrCodeBase64: zatcaResponse.qrCodeBase64,
    }).where(eq(invoices.id, createdInvoice.id));

    // 4. Trigger WhatsApp Delivery (if phone provided)
    let waResponse = null;
    if (invoicePayload.buyer.phone && ['CLEARED', 'REPORTED'].includes(zatcaResponse.clearanceStatus)) {
      const waResult = await waClient.sendTemplateMessage({
        to: invoicePayload.buyer.phone,
        templateName: "new_tax_invoice",
        language: "en",
        components: [
          {
            type: "header",
            parameters: [
              {
                type: "document",
                document: {
                  link: `https://uae-invoice-zatca-xmls.s3.me-central-1.amazonaws.com/tenants/${session.tenantId}/invoices/${invoicePayload.invoiceNumber}.xml`, // Real implementation should link to PDF
                  filename: `${invoicePayload.invoiceNumber}.pdf`,
                }
              }
            ]
          },
          {
            type: "body",
            parameters: [
              { type: "text", text: invoicePayload.buyer.name },
              { type: "text", text: invoicePayload.invoiceNumber },
              { type: "text", text: invoicePayload.totalAmount.toString() },
            ]
          },
          {
            type: "button",
            sub_type: "url" as any,
            index: "0" as any,
            parameters: [
              {
                type: "text" as any,
                text: `api/v1/invoices/${createdInvoice.id}/pay` // Appends to the base URL configured in Meta
              }
            ]
          }
        ]
      });

      if (waResult.success) {
        await db.update(invoices).set({ whatsappStatus: 'DELIVERED' }).where(eq(invoices.id, createdInvoice.id));
        waResponse = 'DELIVERED';
      } else {
        await db.update(invoices).set({ whatsappStatus: 'FAILED' }).where(eq(invoices.id, createdInvoice.id));
        waResponse = 'FAILED';
      }
    }

    return NextResponse.json({
      success: true,
      invoiceId: createdInvoice.id,
      invoiceNumber: createdInvoice.invoiceNumber,
      zatca: zatcaResponse,
      whatsapp: waResponse
    }, { status: 201 });

  } catch (error: any) {
    console.error('Invoice creation error:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}
