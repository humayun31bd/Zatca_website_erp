import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, invoiceLineItems, tenants, products } from "@/lib/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { z } from "zod";
import { serviceLocator } from "@/lib/services/serviceLocator";

const CheckoutItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

const CheckoutPayloadSchema = z.object({
  items: z.array(CheckoutItemSchema).min(1),
  buyerName: z.string().optional(),
  buyerPhone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, session.tenantId as string))
      .limit(1);

    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const body = await req.json();
    const parseResult = CheckoutPayloadSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Bad Request', details: parseResult.error.format() }, { status: 400 });
    }

    const { items, buyerName, buyerPhone } = parseResult.data;
    const productIds = items.map(i => i.productId);

    // Fetch products to get prices and calculate totals
    const dbProducts = await db
      .select()
      .from(products)
      .where(inArray(products.id, productIds));

    if (dbProducts.length !== productIds.length) {
      return NextResponse.json({ error: "One or more products not found" }, { status: 400 });
    }

    const productMap = new Map(dbProducts.map(p => [p.id, p]));
    
    let subtotalAmount = 0;
    let totalVatAmount = 0;
    const lineItemsToInsert: any[] = [];
    const zatcaLineItems: any[] = [];

    // Calculate totals and build line items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const product = productMap.get(item.productId)!;
      const unitPrice = parseFloat(product.price.toString());
      
      const lineSubtotal = unitPrice * item.quantity;
      const taxPercent = 15.0; // Standard VAT
      const lineTax = lineSubtotal * (taxPercent / 100);
      const lineTotal = lineSubtotal + lineTax;

      subtotalAmount += lineSubtotal;
      totalVatAmount += lineTax;

      lineItemsToInsert.push({
        lineNumber: i + 1,
        description: product.name,
        quantity: item.quantity.toString(),
        unitPrice: unitPrice.toFixed(2),
        taxPercent: taxPercent.toFixed(2),
        taxAmount: lineTax.toFixed(2),
        lineTotal: lineTotal.toFixed(2),
      });

      zatcaLineItems.push({
        lineNumber: i + 1,
        description: product.name,
        quantity: item.quantity,
        unitPrice: unitPrice,
        taxPercent: taxPercent,
        taxAmount: lineTax,
        lineTotal: lineTotal,
      });
    }

    const totalAmount = subtotalAmount + totalVatAmount;
    const invoiceNumber = `POS-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    // Transaction to deduct inventory and create invoice
    const invoiceResult = await db.transaction(async (tx) => {
      // 1. Deduct inventory
      for (const item of items) {
        await tx.update(products)
          .set({ stockQuantity: sql`${products.stockQuantity} - ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }

      // 2. Create invoice (DRAFT initially)
      const [createdInvoice] = await tx.insert(invoices).values({
        tenantId: session.tenantId as string,
        invoiceNumber: invoiceNumber,
        invoiceType: 'SIMPLIFIED', // POS always generates Simplified B2C
        invoiceTypeCode: '388', // Tax Invoice
        sellerName: tenant.name,
        sellerVat: tenant.vatNumber,
        sellerAddress: "Riyadh, KSA",
        buyerName: buyerName || "Walk-in Customer",
        subtotalAmount: subtotalAmount.toFixed(2),
        totalVatAmount: totalVatAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        issueDatetime: new Date(),
        zatcaStatus: 'DRAFT',
        paymentStatus: 'PAID', // Assuming paid at POS
      }).returning();

      // 3. Insert line items
      const mappedLineItems = lineItemsToInsert.map(li => ({
        ...li,
        invoiceId: createdInvoice.id,
      }));
      await tx.insert(invoiceLineItems).values(mappedLineItems);

      return createdInvoice;
    });

    // Generate ZATCA XML & QR Code (async/background process typically, but doing inline for MVP)
    const zatcaPayload = {
      invoiceNumber: invoiceNumber,
      issueDate: new Date().toISOString(),
      invoiceType: 'SIMPLIFIED' as const,
      typeCode: '388',
      seller: {
        name: tenant.name,
        vatNumber: tenant.vatNumber,
        address: "Riyadh, KSA",
      },
      buyer: {
        name: buyerName || "Walk-in Customer",
        address: "KSA",
      },
      lineItems: zatcaLineItems,
      subtotalAmount,
      totalVatAmount,
      totalAmount,
      currencyCode: 'SAR',
      payments: [{ method: 'CASH' as const, amount: totalAmount }],
    };

    const zatcaService = serviceLocator.getZatcaService();
    const zatcaResponse = await zatcaService.clearInvoice(zatcaPayload);

    // Update with QR code
    await db.update(invoices).set({
      zatcaStatus: zatcaResponse.clearanceStatus,
      invoiceHash: zatcaResponse.xmlHash,
      qrCodeBase64: zatcaResponse.qrCodeBase64,
    }).where(eq(invoices.id, invoiceResult.id));

    return NextResponse.json({
      success: true,
      invoiceId: invoiceResult.id,
      invoiceNumber: invoiceResult.invoiceNumber,
      qrCodeBase64: zatcaResponse.qrCodeBase64,
      totalAmount: totalAmount.toFixed(2),
    }, { status: 201 });

  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}
