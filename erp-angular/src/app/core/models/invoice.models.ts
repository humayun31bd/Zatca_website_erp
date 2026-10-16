export interface InvoiceLineItem {
  id?: string;
  invoiceId?: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  lineTotal: number;
}

export interface InvoicePayment {
  id?: string;
  invoiceId?: string;
  amount: number;
  paymentMethod: string;
  paymentDate?: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  clientId?: string | null;
  invoiceNumber: string;
  invoiceType: 'STANDARD' | 'SIMPLIFIED' | string;
  invoiceTypeCode: string; // '388' Tax Invoice, '381' Credit Note, '383' Debit Note
  sellerName: string;
  sellerVat: string;
  sellerAddress?: string | null;
  buyerName: string;
  buyerVat?: string | null;
  buyerAddress?: string | null;
  buyerPhone?: string | null;
  subtotalAmount: number;
  discountAmount: number;
  totalVatAmount: number;
  totalAmount: number;
  issueDatetime: string;
  zatcaStatus: 'REPORTED' | 'CLEARED' | 'PENDING' | 'REJECTED' | string;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' | string;
  qrCodeBase64?: string | null;
  invoiceHash?: string | null;
  createdAt?: string;
  lineItems?: InvoiceLineItem[];
  payments?: InvoicePayment[];
}

export interface CreateInvoicePayload {
  invoiceNumber?: string;
  invoiceType: 'STANDARD' | 'SIMPLIFIED';
  typeCode: string;
  buyer: {
    name: string;
    vatNumber?: string;
    address?: string;
    phone?: string;
  };
  lineItems: {
    lineNumber: number;
    description: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    taxPercent: number;
    taxAmount: number;
    lineTotal: number;
  }[];
  subtotalAmount: number;
  discountAmount: number;
  totalVatAmount: number;
  totalAmount: number;
  currencyCode?: string;
  payments: {
    method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | string;
    amount: number;
  }[];
}
