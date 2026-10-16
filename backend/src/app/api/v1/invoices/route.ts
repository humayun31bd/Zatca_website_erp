import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, invoiceLineItems, invoicePayments, tenants, counterSessions, auditLogs } from "@/lib/db/schema";
import { journalEntries, journalEntryLines, accounts } from "@/lib/db/accounting_schema";
import { eq, desc, and, inArray, or } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { InvoicePayloadSchema } from "@/types/invoice";
import { serviceLocator } from "@/lib/services/serviceLocator";
import { waClient } from "@/lib/whatsapp/client";
import { clients } from "@/lib/db/schema";
import { generatePosInvoiceGlVoucher } from "@/lib/accounting/pos_integration";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clientId = req.nextUrl.searchParams.get("clientId");

    const conditions = [eq(invoices.tenantId, session.tenantId as string)];
    if (clientId) {
      // Find client to also match by name if invoice was created without explicit clientId
      const [client] = await db
        .select()
        .from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.tenantId, session.tenantId as string)))
        .limit(1);

      if (client) {
        const clientConditions = [eq(invoices.clientId, clientId)];
        if (client.name && client.name.trim().length > 0) {
          clientConditions.push(eq(invoices.buyerName, client.name));
        }
        conditions.push(or(...clientConditions)!);
      } else {
        conditions.push(eq(invoices.clientId, clientId));
      }
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
    console.error("GET Invoices Error:", error);
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
      branchId: invoicePayload.branchId || null,
      costCenterId: invoicePayload.costCenterId || null,
      originalInvoiceId: body.originalInvoiceId || null,
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
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        taxPercent: Number(item.taxPercent),
        taxAmount: Number(item.taxAmount),
        lineTotal: Number(item.lineTotal),
      }));
      await db.insert(invoiceLineItems).values(lineItemsToInsert);
    }

    // Insert Payments
    if (invoicePayload.payments.length > 0) {
      const paymentsToInsert = invoicePayload.payments.map(p => ({
        tenantId: session.tenantId as string,
        invoiceId: createdInvoice.id,
        paymentMethod: p.method,
        amount: Number(p.amount),
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

    // Audit log for creation
    await db.insert(auditLogs).values({
      tenantId: session.tenantId as string,
      actorType: 'TENANT',
      action: 'CREATE_INVOICE',
      resourceType: 'INVOICE',
      resourceId: createdInvoice.id,
      metadata: { invoiceNumber: createdInvoice.invoiceNumber, clearanceStatus: zatcaResponse.clearanceStatus }
    });

    // 3.5 Auto Journal Entry Generation
    try {
      const targetAccountCodes = ['4.10.01.001.001', '2.10.03.001.001', '1.10.02.001.001', '1.10.01.001.001', '1.10.01.002.001'];
      const dbAccounts = await db.select().from(accounts).where(and(eq(accounts.tenantId, session.tenantId as string), inArray(accounts.code, targetAccountCodes)));
      
      const salesAccount = dbAccounts.find(a => a.code === '4.10.01.001.001');
      const vatAccount = dbAccounts.find(a => a.code === '2.10.03.001.001');
      
      if (salesAccount && vatAccount) {
        const jeNumber = `JE-INV-${createdInvoice.invoiceNumber}`;
        const [je] = await db.insert(journalEntries).values({
          tenantId: session.tenantId as string,
          entryNumber: jeNumber,
          referenceType: 'INVOICE',
          referenceId: createdInvoice.id,
          entryDate: new Date(invoicePayload.issueDate),
          description: `Auto-generated entry for Invoice ${createdInvoice.invoiceNumber}`,
          status: 'POSTED'
        }).returning();

        const jeLines = [];
        
        // Credit Sales
        jeLines.push({
          journalEntryId: je.id,
          accountId: salesAccount.id,
          credit: Number(invoicePayload.subtotalAmount),
          debit: 0,
          branchId: invoicePayload.branchId || null,
          costCenterId: invoicePayload.costCenterId || null,
          clientId: invoicePayload.clientId || null,
          description: 'Sales Revenue'
        });

        // Credit VAT
        if (invoicePayload.totalVatAmount > 0) {
          jeLines.push({
            journalEntryId: je.id,
            accountId: vatAccount.id,
            credit: Number(invoicePayload.totalVatAmount),
            debit: 0,
            branchId: invoicePayload.branchId || null,
            costCenterId: invoicePayload.costCenterId || null,
            clientId: invoicePayload.clientId || null,
            description: 'VAT Output'
          });
        }

        // Debit Accounts (Cash/Bank or AR)
        let remainingAmount = invoicePayload.totalAmount;
        
        // Handle payments
        for (const payment of invoicePayload.payments) {
          let debitAccountId = null;
          if (payment.method === 'CASH') {
             const cashAccount = dbAccounts.find(a => a.code === '1.10.01.001.001');
             if (cashAccount) debitAccountId = cashAccount.id;
          } else if (payment.method === 'BANK' || payment.method === 'CARD' || payment.method === 'CREDIT') {
             const bankAccount = dbAccounts.find(a => a.code === '1.10.01.002.001');
             if (bankAccount) debitAccountId = bankAccount.id;
          }
          
          if (debitAccountId) {
            jeLines.push({
              journalEntryId: je.id,
              accountId: debitAccountId,
              debit: Number(payment.amount),
              credit: 0,
              branchId: invoicePayload.branchId || null,
              costCenterId: invoicePayload.costCenterId || null,
              clientId: invoicePayload.clientId || null,
              description: `Payment received via ${payment.method}`
            });
            remainingAmount -= payment.amount;
          }
        }

        // If unpaid or partially paid, debit AR
        if (remainingAmount > 0) {
          const arAccount = dbAccounts.find(a => a.code === '1.10.02.001.001');
          if (arAccount) {
            jeLines.push({
              journalEntryId: je.id,
              accountId: arAccount.id,
              debit: Number(remainingAmount),
              credit: 0,
              branchId: invoicePayload.branchId || null,
              costCenterId: invoicePayload.costCenterId || null,
              clientId: invoicePayload.clientId || null,
              description: 'Accounts Receivable'
            });
          }
        }
        
        if (jeLines.length > 0) {
          await db.insert(journalEntryLines).values(jeLines);
        }
      }
    } catch (jeError) {
      console.error('Failed to auto-generate journal entry for invoice:', jeError);
    }

    // 3.6 Automated POS Double-Entry GL Voucher Generation (Accounting Module Integration)
    try {
      const primaryPaymentMethod = invoicePayload.payments && invoicePayload.payments.length > 0 
        ? invoicePayload.payments[0].method 
        : 'CASH';

      await generatePosInvoiceGlVoucher({
        tenantId: session.tenantId as string,
        invoiceId: createdInvoice.id,
        invoiceNumber: createdInvoice.invoiceNumber,
        issueDate: invoicePayload.issueDate,
        paymentMethod: primaryPaymentMethod,
        subtotalAmount: Number(invoicePayload.subtotalAmount),
        vatAmount: Number(invoicePayload.totalVatAmount),
        totalAmount: Number(invoicePayload.totalAmount),
        branchId: invoicePayload.branchId || undefined,
        costCenterId: invoicePayload.costCenterId || undefined,
        makerId: session.userId || 'pos-system-maker',
      });
    } catch (voucherErr) {
      console.error('Failed to auto-generate POS GL Voucher:', voucherErr);
    }

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

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.nextUrl.searchParams.get("tenantId");

    db.transaction((tx) => {
      if (tenantId) {
        tx.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, tenantId)).run();
        tx.delete(invoicePayments).where(eq(invoicePayments.tenantId, tenantId)).run();
        tx.delete(invoices).where(eq(invoices.tenantId, tenantId)).run();
      } else {
        tx.delete(invoiceLineItems).run();
        tx.delete(invoicePayments).run();
        tx.delete(invoices).run();
      }
    });

    return NextResponse.json({ success: true, message: "All POS invoices wiped successfully." });
  } catch (error: any) {
    console.error("DELETE Invoices error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

