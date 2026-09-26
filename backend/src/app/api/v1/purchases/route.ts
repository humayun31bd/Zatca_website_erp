import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { purchaseInvoices, purchaseInvoiceLineItems, products } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { z } from "zod";

const PurchaseLineItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  description: z.string().min(1),
  quantity: z.string(),
  unitPrice: z.string(),
  vatRate: z.string(),
  subtotalAmount: z.string(),
  vatAmount: z.string(),
  totalAmount: z.string(),
});

const PurchaseInvoiceSchema = z.object({
  supplierId: z.string().uuid(),
  invoiceNumber: z.string().min(1),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime().optional().nullable(),
  subtotalAmount: z.string(),
  totalVatAmount: z.string(),
  totalAmount: z.string(),
  paymentStatus: z.enum(['UNPAID', 'PAID', 'PARTIAL']).default('UNPAID'),
  lineItems: z.array(PurchaseLineItemSchema).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantPurchases = await db
      .select()
      .from(purchaseInvoices)
      .where(eq(purchaseInvoices.tenantId, session.tenantId as string))
      .orderBy(desc(purchaseInvoices.createdAt));

    // Note: To return line items on GET, we could do a left join or separate query. For brevity, returning header only.
    return NextResponse.json(tenantPurchases);
  } catch (error: any) {
    console.error("GET Purchases error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parseResult = PurchaseInvoiceSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid payload", details: parseResult.error.format() }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      // 1. Insert Purchase Invoice Header
      const newPurchase = await tx.insert(purchaseInvoices).values({
        tenantId: session.tenantId as string,
        supplierId: parseResult.data.supplierId,
        invoiceNumber: parseResult.data.invoiceNumber,
        issueDate: new Date(parseResult.data.issueDate),
        dueDate: parseResult.data.dueDate ? new Date(parseResult.data.dueDate) : null,
        subtotalAmount: parseResult.data.subtotalAmount,
        totalVatAmount: parseResult.data.totalVatAmount,
        totalAmount: parseResult.data.totalAmount,
        paymentStatus: parseResult.data.paymentStatus,
      }).returning();

      const purchaseId = newPurchase[0].id;

      // 2. Insert Line Items & Update Stock
      if (parseResult.data.lineItems && parseResult.data.lineItems.length > 0) {
        for (const item of parseResult.data.lineItems) {
          await tx.insert(purchaseInvoiceLineItems).values({
            purchaseInvoiceId: purchaseId,
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            vatRate: item.vatRate,
            subtotalAmount: item.subtotalAmount,
            vatAmount: item.vatAmount,
            totalAmount: item.totalAmount,
          });

          // If product is linked, increment inventory stock
          if (item.productId) {
            // Fetch current product to safely increment
            // In PostgreSQL we can do an atomic update, but using Drizzle query
            const existingProduct = await tx.select({ stock: products.stockQuantity }).from(products).where(eq(products.id, item.productId));
            if (existingProduct.length > 0) {
              const currentStock = existingProduct[0].stock;
              const addedStock = parseInt(item.quantity, 10);
              
              await tx.update(products)
                .set({ stockQuantity: currentStock + addedStock })
                .where(eq(products.id, item.productId));
            }
          }
        }
      }
      return newPurchase[0];
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("POST Purchase error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
