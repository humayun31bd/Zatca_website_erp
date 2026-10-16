import { z } from "zod";

export type ZatcaInvoiceType = 'STANDARD' | 'SIMPLIFIED';

export const InvoiceLineItemSchema = z.object({
  lineNumber: z.number(),
  description: z.string().regex(/^[^<>]*$/, "HTML tags are not allowed"),
  quantity: z.number(),
  unitCode: z.string().regex(/^[^<>]*$/, "HTML tags are not allowed"),
  unitPrice: z.number(),
  taxPercent: z.number(),
  taxAmount: z.number(),
  lineTotal: z.number(),
});
export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>;

export const InvoicePayloadSchema = z.object({
  invoiceType: z.enum(['STANDARD', 'SIMPLIFIED']),
  invoiceNumber: z.string().regex(/^[^<>]*$/, "HTML tags are not allowed"),
  issueDate: z.string().datetime(),
  seller: z.object({
    name: z.string().regex(/^[^<>]*$/, "HTML tags are not allowed"),
    vatNumber: z.string().regex(/^3[0-9]{13}3$/),
    address: z.string().regex(/^[^<>]*$/, "HTML tags are not allowed"),
  }),
  buyer: z.object({
    name: z.string().regex(/^[^<>]*$/, "HTML tags are not allowed"),
    vatNumber: z.string().optional(),
    address: z.string().regex(/^[^<>]*$/, "HTML tags are not allowed"),
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
  branchId: z.string().uuid().optional().nullable(),
  costCenterId: z.string().uuid().optional().nullable(),
  payments: z.array(z.object({
    method: z.enum(['CASH', 'CARD', 'BANK', 'CREDIT']),
    amount: z.number(),
    reference: z.string().optional()
  })).optional().default([]),
});
export type InvoicePayload = z.infer<typeof InvoicePayloadSchema>;
