import { IZatcaService } from '../services/interfaces';
import { InvoicePayload } from '@/types/invoice';
import { ClearanceResponse, ReportingResponse } from '@/types/zatca';
import crypto from 'crypto';

export class MockZatcaService implements IZatcaService {
  async clearInvoice(invoice: InvoicePayload): Promise<ClearanceResponse> {
    const isSuccess = invoice.totalAmount < 100000; // Mock rule
    const xml = `<Invoice><ID>${invoice.invoiceNumber}</ID><Amount>${invoice.totalAmount}</Amount></Invoice>`;
    const hash = crypto.createHash('sha256').update(xml).digest('base64');
    
    return {
      clearanceStatus: isSuccess ? 'CLEARED' : 'FAILED',
      clearedXml: isSuccess ? Buffer.from(xml).toString('base64') : undefined,
      qrCodeBase64: isSuccess ? Buffer.from('mock-qr-code').toString('base64') : undefined,
      validationResults: isSuccess ? [] : [{ message: 'Amount too high' }],
    };
  }

  async reportInvoice(invoice: InvoicePayload): Promise<ReportingResponse> {
    return {
      reportingStatus: 'REPORTED',
      reportingRequestId: `rep_${Date.now()}`,
      warnings: [],
    };
  }
}
