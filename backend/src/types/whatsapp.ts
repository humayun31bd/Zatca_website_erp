export interface WaTemplatePayload {
  to: string;
  templateName: string;
  language: 'ar' | 'en';
  components: any[];
}

export interface WaWebhookEvent {
  messageId: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  timestamp: string;
}

export interface WaDeliveryResult {
  messageId: string;
  status: 'QUEUED' | 'FAILED';
}

export interface WaDeliveryPayload {
  to: string;
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
  qrCodeBase64: string;
  pdfUrl: string;
  buyerName: string;
  language: 'ar' | 'en';
}
