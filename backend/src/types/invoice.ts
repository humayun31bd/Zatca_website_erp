import { z } from "zod";

export type ZatcaInvoiceType = 'STANDARD' | 'SIMPLIFIED';

export const InvoiceLineItemSchema = z.object({
  lineNumber: z.number(),
  description: z.string(),
  quantity: z.number(),
  unitCode: z.string(),
  unitPrice: z.number(),
  taxPercent: z.number(),
  taxAmount: z.number(),
  lineTotal: z.number(),
});
export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>;

export const InvoicePayloadSchema = z.object({
  invoiceType: z.enum(['STANDARD', 'SIMPLIFIED']),
  invoiceNumber: z.string(),
  issueDate: z.string().datetime(),
  seller: z.object({
    name: z.string(),
    vatNumber: z.string().regex(/^3[0-9]{13}3$/),
    address: z.string(),
  }),
  buyer: z.object({
    name: z.string(),
    vatNumber: z.string().optional(),
    address: z.string(),
    phone: z.string().optional(),
  }),
  lineItems: z.array(InvoiceLineItemSchema),
  subtotalAmount: z.number(),
  totalVatAmount: z.number(),
  totalAmount: z.number(),
  currencyCode: z.string().default('SAR'),
  previousInvoiceHash: z.string().optional(),
  typeCode: z.string().optional().default('388'),
  counterId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  payments: z.array(z.object({
    method: z.enum(['CASH', 'CARD', 'BANK', 'CREDIT']),
    amount: z.number(),
    reference: z.string().optional()
  })).optional().default([]),
});
export type InvoicePayload = z.infer<typeof InvoicePayloadSchema>;
