import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, invoiceLineItems, tenants, products, clients } from "@/lib/db/schema";
import { deliveryOrders, orderStatusLogs } from "@/lib/db/delivery_orders_schema";
import { eq, inArray, sql, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { z } from "zod";
import { serviceLocator } from "@/lib/services/serviceLocator";
import { accounts, journalEntries, journalEntryLines } from "@/lib/db/accounting_schema";

const CheckoutItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

const CheckoutPayloadSchema = z.object({
  items: z.array(CheckoutItemSchema).min(1),
  buyerName: z.string().regex(/^[^<>]*$/, "HTML tags are not allowed").optional(),
  buyerPhone: z.string().optional(),
  clientId: z.string().uuid().optional().nullable(),
  paymentMethod: z.string().optional(),
  totalDiscount: z.number().min(0).optional(),
  deliveryType: z.enum(['take_away', 'delivery', 'dine_in']).optional().default('take_away'),
  deliveryDetails: z.object({
    tableNumber: z.string().optional().nullable(),
    deliveryAddress: z.string().optional().nullable(),
    deliveryFee: z.number().min(0).optional().default(0),
    aggregator: z.string().optional().nullable(),
    aggregatorReference: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
  }).optional().nullable(),
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

    const { items, buyerName, buyerPhone, clientId, paymentMethod, totalDiscount = 0 } = parseResult.data;
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
    
    // 1. Calculate Gross Subtotal (Sum of line subtotals without discount)
    let subtotalAmount = 0;
    
    // 2. We will distribute the totalDiscount across line items proportionally
    const lineItemsData = items.map((item, i) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = parseFloat(product.price.toString());
      const lineSubtotal = unitPrice * item.quantity;
      subtotalAmount += lineSubtotal;
      return {
        item,
        product,
        unitPrice,
        lineSubtotal,
        lineNumber: i + 1,
      };
    });

    const safeDiscount = Math.min(totalDiscount, subtotalAmount);
    const discountRatio = subtotalAmount > 0 ? safeDiscount / subtotalAmount : 0;

    let totalVatAmount = 0;
    const lineItemsToInsert: any[] = [];
    const zatcaLineItems: any[] = [];

    let sumDiscountDistributed = 0;

    for (let i = 0; i < lineItemsData.length; i++) {
      const lineData = lineItemsData[i];
      const taxPercent = 15.0; // Standard VAT

      // Calculate discount for this line
      let lineDiscount = 0;
      if (i === lineItemsData.length - 1) {
        // Last item takes the remainder to avoid rounding errors
        lineDiscount = safeDiscount - sumDiscountDistributed;
      } else {
        lineDiscount = Number((lineData.lineSubtotal * discountRatio).toFixed(2));
        sumDiscountDistributed += lineDiscount;
      }

      const netLineAmount = lineData.lineSubtotal - lineDiscount;
      const lineTax = netLineAmount * (taxPercent / 100);
      const lineTotal = netLineAmount + lineTax;

      totalVatAmount += lineTax;

      lineItemsToInsert.push({
        lineNumber: lineData.lineNumber,
        description: lineData.product.name,
        quantity: Number(lineData.item.quantity),
        unitPrice: Number(lineData.unitPrice.toFixed(2)),
        discountAmount: Number(lineDiscount.toFixed(2)),
        taxPercent: Number(taxPercent.toFixed(2)),
        taxAmount: Number(lineTax.toFixed(2)),
        lineTotal: Number(lineTotal.toFixed(2)),
      });

      zatcaLineItems.push({
        lineNumber: lineData.lineNumber,
        description: lineData.product.name,
        quantity: lineData.item.quantity,
        unitPrice: lineData.unitPrice,
        discountAmount: lineDiscount,
        taxPercent: taxPercent,
        taxAmount: lineTax,
        lineTotal: lineTotal,
      });
    }

    const netSubtotalAmount = subtotalAmount - safeDiscount;
    const totalAmount = netSubtotalAmount + totalVatAmount;
    // Generate a unique invoice number using crypto.randomUUID() to avoid UNIQUE constraint collisions
    const uniqueSuffix = crypto.randomUUID().split('-')[0].toUpperCase();
    const invoiceNumber = `POS-${new Date().getFullYear()}-${uniqueSuffix}`;

    // Transaction Helper: Use real transaction for Postgres, fallback to sequential for SQLite (better-sqlite3)
    const executeTransaction = async (callback: (tx: any) => Promise<any>) => {
      // If we are using SQLite, skip the transaction wrapper to avoid the "cannot return a promise" error
      // and prevent executing the callback twice (which causes double inserts and unique constraint errors).
      const isSQLite = (db as any).dialect?.constructor?.name === 'SQLiteSyncDialect' || 
                       (db as any).dialect?.constructor?.name?.includes('SQLite');
                       
      if (isSQLite) {
        return await callback(db);
      }
      
      try {
        return await db.transaction(callback);
      } catch (e: any) {
        if (e.message && e.message.includes("Transaction function cannot return a promise")) {
          // If we somehow missed the dialect check, don't retry, because the first promise is already running!
          // We must just throw to avoid double-execution.
          throw new Error("Cannot use async transactions with better-sqlite3. Please configure SQLite fallback properly.");
        }
        throw e;
      }
    };

    const invoiceResult = await executeTransaction(async (tx) => {
      // 1. Deduct inventory
      for (const item of items) {
        // Use MAX(0, stock - qty) to avoid violating the stock_check constraint (>= 0)
        await tx.update(products)
          .set({ stockQuantity: sql`MAX(0, ${products.stockQuantity} - ${item.quantity})` })
          .where(eq(products.id, item.productId));
      }

      // Resolve effective clientId (passed directly or matched by buyerName)
      let effectiveClientId = clientId || null;
      if (!effectiveClientId && buyerName && buyerName.trim() !== "Walk-in Customer") {
        const [matchedClient] = await tx
          .select({ id: clients.id })
          .from(clients)
          .where(and(eq(clients.tenantId, session.tenantId as string), eq(clients.name, buyerName.trim())))
          .limit(1);
        if (matchedClient) {
          effectiveClientId = matchedClient.id;
        }
      }

      // 2. Create invoice (DRAFT initially)
      const [createdInvoice] = await tx.insert(invoices).values({
        tenantId: session.tenantId as string,
        clientId: effectiveClientId,
        invoiceNumber: invoiceNumber,
        invoiceType: 'SIMPLIFIED', // POS always generates Simplified B2C
        invoiceTypeCode: '388', // Tax Invoice
        sellerName: tenant.name,
        sellerVat: tenant.vatNumber,
        sellerAddress: "Riyadh, KSA",
        buyerName: buyerName || "Walk-in Customer",
        subtotalAmount: Number(subtotalAmount.toFixed(2)),
        discountAmount: Number(safeDiscount.toFixed(2)),
        totalVatAmount: Number(totalVatAmount.toFixed(2)),
        totalAmount: Number(totalAmount.toFixed(2)),
        issueDatetime: new Date(),
        zatcaStatus: 'PENDING',
        paymentStatus: 'PAID', // Assuming paid at POS
        deliveryType: parseResult.data.deliveryType || 'take_away',
      }).returning();

      // 3. Insert line items
      const mappedLineItems = lineItemsToInsert.map(li => ({
        ...li,
        invoiceId: createdInvoice.id,
      }));
      await tx.insert(invoiceLineItems).values(mappedLineItems);

      // 3b. Automatically create corresponding delivery_orders entry for kitchen & dispatch
      const deliveryOrderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${uniqueSuffix}`;
      const deliveryDetails = parseResult.data.deliveryDetails;
      const deliveryType = parseResult.data.deliveryType || 'take_away';
      const initialStatus = 'OUP'; // In kitchen prep

      const [createdDeliveryOrder] = await tx.insert(deliveryOrders).values({
        tenantId: session.tenantId as string,
        orderNumber: deliveryOrderNumber,
        invoiceId: createdInvoice.id,
        orderType: deliveryType,
        channel: deliveryDetails?.aggregator ? 'third_party' : 'pos',
        status: initialStatus,
        aggregator: deliveryDetails?.aggregator || null,
        aggregatorReference: deliveryDetails?.aggregatorReference || null,
        customerName: buyerName || "Walk-in Customer",
        customerPhone: buyerPhone || null,
        deliveryAddress: deliveryDetails?.deliveryAddress || null,
        tableNumber: deliveryDetails?.tableNumber || null,
        deliveryFee: deliveryDetails?.deliveryFee || 0,
        subtotal: Number(netSubtotalAmount.toFixed(2)),
        taxAmount: Number(totalVatAmount.toFixed(2)),
        discountAmount: Number(safeDiscount.toFixed(2)),
        totalAmount: Number(totalAmount.toFixed(2)),
        items: dbProducts.map(p => {
          const cartItem = items.find(i => i.productId === p.id);
          return {
            productId: p.id,
            productName: p.name,
            quantity: cartItem?.quantity || 1,
            price: Number(p.price),
            sku: p.sku,
          };
        }),
        note: deliveryDetails?.note || null,
        cookingStartedAt: new Date(),
        confirmedAt: new Date(),
      }).returning();

      // Log initial status
      await tx.insert(orderStatusLogs).values({
        id: crypto.randomUUID(),
        tenantId: session.tenantId as string,
        orderId: createdDeliveryOrder.id,
        fromStatus: 'WFC',
        toStatus: initialStatus,
        changedBy: (session.email as string) || 'cashier',
        actorRole: 'cashier',
        note: `POS Checkout completed (${deliveryType})`,
      });

      // 4. Generate Auto-Journal Entry
      const accList = await tx.select().from(accounts).where(eq(accounts.tenantId, session.tenantId as string));
      const salesAcc = accList.find((a: any) => a.code === '4.10.01.001.001'); // General Sales (Revenue)
      const cashAcc = accList.find((a: any) => a.code === '1.10.01.001.001'); // Petty Cash (Asset)
      const vatAcc = accList.find((a: any) => a.code === '2.10.04.001.001'); // VAT Payable (Liability)

      if (salesAcc && cashAcc && vatAcc) {
        const jeNumber = `POS-JE-${new Date().getFullYear()}-${uniqueSuffix}`;
        
        const [newJe] = await tx.insert(journalEntries).values({
          tenantId: session.tenantId as string,
          entryNumber: jeNumber,
          referenceType: 'INVOICE',
          referenceId: createdInvoice.id,
          entryDate: new Date(),
          description: `POS Cash Sale - Invoice ${invoiceNumber}`,
          status: 'POSTED',
        }).returning();

        const linesToInsert = [
          // Debit Cash (Total Amount)
          {
            journalEntryId: newJe.id,
            accountId: cashAcc.id,
            debit: Number(totalAmount.toFixed(2)),
            credit: 0,
            description: `Cash received for POS Sale ${invoiceNumber}`,
          },
          // Credit Revenue (Subtotal Amount)
          {
            journalEntryId: newJe.id,
            accountId: salesAcc.id,
            debit: 0,
            credit: Number(netSubtotalAmount.toFixed(2)),
            description: `Revenue for POS Sale ${invoiceNumber}`,
          }
        ];

        // Credit VAT Payable if applicable
        if (totalVatAmount > 0) {
          linesToInsert.push({
            journalEntryId: newJe.id,
            accountId: vatAcc.id,
            debit: 0,
            credit: Number(totalVatAmount.toFixed(2)),
            description: `Output VAT for POS Sale ${invoiceNumber}`,
          });
        }

        await tx.insert(journalEntryLines).values(linesToInsert);
      }

      return {
        ...createdInvoice,
        deliveryOrder: createdDeliveryOrder,
      };
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
      discountAmount: safeDiscount,
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
      deliveryOrder: invoiceResult.deliveryOrder,
      qrCodeBase64: zatcaResponse.qrCodeBase64,
      totalAmount: Number(totalAmount.toFixed(2)),
    }, { status: 201 });

  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}
