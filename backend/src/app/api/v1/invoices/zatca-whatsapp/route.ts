import { NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/auth/keyValidator';
import { requireScope } from '@/lib/auth/rbac';
import { checkRateLimit } from '@/lib/middleware/rateLimiter';
import { InvoicePayloadSchema } from '@/types/invoice';
import { serviceLocator } from '@/lib/services/serviceLocator';

export async function POST(request: Request) {
  try {
    const authContext = await validateApiKey(request);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      requireScope(authContext.scopes, 'INVOICE:WRITE');
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }

    const isAllowed = await checkRateLimit(authContext.tenantId);
    if (!isAllowed) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }

    const body = await request.json();
    const parseResult = InvoicePayloadSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Bad Request', details: parseResult.error.format() }, { status: 400 });
    }

    const invoice = parseResult.data;
    
    const zatcaService = serviceLocator.getZatcaService();
    const zatcaResponse = await zatcaService.clearInvoice(invoice);
    
    if (zatcaResponse.clearanceStatus === 'FAILED') {
      return NextResponse.json({ error: 'ZATCA Clearance Failed', details: zatcaResponse.validationResults }, { status: 422 });
    }

    const waService = serviceLocator.getWhatsAppService();
    const waResponse = await waService.sendInvoice({
      to: '1234567890', // In reality, fetch from tenant config
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      currency: invoice.currencyCode,
      qrCodeBase64: zatcaResponse.qrCodeBase64!,
      pdfUrl: `https://example.com/invoices/${invoice.invoiceNumber}.pdf`,
      buyerName: invoice.buyer.name,
      language: 'ar'
    });

    return NextResponse.json({
      success: true,
      invoiceNumber: invoice.invoiceNumber,
      zatca: zatcaResponse,
      whatsapp: waResponse
    });

  } catch (error: any) {
    console.error('Invoice processing error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
