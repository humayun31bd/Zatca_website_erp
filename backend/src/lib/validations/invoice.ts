import { z } from "zod";

// ZATCA specific Regex rules
const ZATCA_VAT_REGEX = /^3[0-9]{13}3$/;

export const invoiceLineItemSchema = z.object({
  description: z.string().min(1, "Description is required").max(500),
  quantity: z.number().positive("Quantity must be greater than 0"),
  unitCode: z.string().min(1).max(10).default("PCE"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
  discountAmount: z.number().min(0).default(0),
  taxPercent: z.union([z.literal(0), z.literal(5), z.literal(15)], {
    errorMap: () => ({ message: "Tax percent must be 0, 5, or 15 (ZATCA defined rates)" }),
  }),
});

export const createInvoiceSchema = z.object({
  invoiceType: z.enum(["STANDARD", "SIMPLIFIED"], {
    errorMap: () => ({ message: "Invoice type must be STANDARD or SIMPLIFIED" }),
  }),
  invoiceTypeCode: z.enum(["388", "381", "383"], {
    errorMap: () => ({ message: "Invoice type code must be 388 (Invoice), 381 (Credit Note), or 383 (Debit Note)" }),
  }).default("388"),
  
  sellerName: z.string().min(1, "Seller name is required").max(255),
  sellerVat: z.string().regex(ZATCA_VAT_REGEX, "VAT Number must be exactly 15 digits, starting and ending with 3"),
  sellerAddress: z.string().min(1, "Seller address is required"),
  
  // Buyer info is optional for SIMPLIFIED (B2C), but mandatory for STANDARD (B2B). 
  // We handle that conditional logic at the application level.
  buyerName: z.string().max(255).optional().nullable(),
  buyerVat: z.string().regex(ZATCA_VAT_REGEX, "Invalid Buyer VAT Number").optional().nullable(),
  buyerAddress: z.string().optional().nullable(),
  
  lineItems: z.array(invoiceLineItemSchema).min(1, "At least one line item is required"),
  
  // These will be calculated on the backend to avoid frontend manipulation, 
  // but included here in case we accept them from an external API integration.
  subtotalAmount: z.number().min(0, "Subtotal must be non-negative").optional(),
  totalVatAmount: z.number().min(0).optional(),
  totalAmount: z.number().optional(), // Can be negative for Credit Notes
  
  currencyCode: z.string().length(3).default("SAR"),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type InvoiceLineItemInput = z.infer<typeof invoiceLineItemSchema>;
