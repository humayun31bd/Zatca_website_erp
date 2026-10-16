# Zero-Trust Backend Validation (Next.js + Drizzle ORM)

The frontend POS currently calculates taxes, discounts, and subtotals. To prevent malicious manipulation, the backend **must not** trust the `totalAmount` or `taxAmount` sent by the frontend. 

When the POS submits a checkout payload, the backend should only trust the `productId` and `quantity`. Here is the implementation pattern for your Next.js API route.

## 1. Drizzle DB Query & Math Recalculation

Create or update your checkout API route (e.g., `src/app/api/pos/checkout/route.ts` or similar):

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/db'; // Your Drizzle DB instance
import { products, invoices, invoiceItems } from '@/db/schema';
import { inArray, eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, idempotencyKey, buyerName, paymentMethod } = body;
    const tenantId = req.headers.get('x-tenant-id'); // Ensure tenant isolation

    // 1. Idempotency Check (Prevent duplicates)
    if (idempotencyKey) {
      const existingInvoice = await db.query.invoices.findFirst({
        where: eq(invoices.idempotencyKey, idempotencyKey),
      });
      if (existingInvoice) {
        return NextResponse.json({ message: 'Already processed', invoice: existingInvoice }, { status: 200 });
      }
    }

    // 2. Extract Product IDs and fetch source-of-truth prices from DB
    const productIds = items.map((i: any) => i.productId);
    const dbProducts = await db.query.products.findMany({
      where: inArray(products.id, productIds),
    });

    // 3. Recalculate Totals strictly on the backend
    let calculatedSubtotal = 0;
    const finalItemsToInsert = [];

    for (const requestedItem of items) {
      const dbProduct = dbProducts.find((p) => p.id === requestedItem.productId);
      if (!dbProduct) {
        return NextResponse.json({ error: `Product ${requestedItem.productId} not found` }, { status: 400 });
      }

      // Backend holds the true price
      const truePrice = Number(dbProduct.price);
      const lineTotal = truePrice * requestedItem.quantity;
      calculatedSubtotal += lineTotal;

      finalItemsToInsert.push({
        productId: dbProduct.id,
        quantity: requestedItem.quantity,
        unitPrice: truePrice,
        lineTotal: lineTotal,
      });
    }

    // 4. Apply Taxes (ZATCA 15%)
    // Note: If you have manager-approved discounts, you would look up the override log
    // or validate the discount rule here before applying it.
    const vatRate = 0.15;
    const calculatedTax = calculatedSubtotal * vatRate;
    const calculatedGrandTotal = calculatedSubtotal + calculatedTax;

    // 5. Database Transaction (Save Invoice & Deduct Inventory securely)
    await db.transaction(async (tx) => {
      // Create Invoice
      const [newInvoice] = await tx.insert(invoices).values({
        tenantId,
        idempotencyKey,
        buyerName,
        paymentMethod,
        subtotal: calculatedSubtotal,
        taxAmount: calculatedTax,
        grandTotal: calculatedGrandTotal,
        createdAt: new Date(),
      }).returning();

      // Create Invoice Items
      for (const item of finalItemsToInsert) {
        await tx.insert(invoiceItems).values({
          invoiceId: newInvoice.id,
          ...item
        });
        
        // (Optional) Deduct Inventory
        // await tx.update(products).set({ stock: sql`stock - ${item.quantity}` }).where(eq(products.id, item.productId));
      }
    });

    return NextResponse.json({ message: 'Success', invoiceNumber: 'INV-OK' }, { status: 201 });

  } catch (error) {
    console.error('Checkout Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

## Why this secures your system:
1.  **Idempotency:** The query explicitly checks if the `idempotencyKey` UUID already exists in the `invoices` table.
2.  **Price Enforcement:** The API completely ignores the `effectivePrice` sent from the Flutter app. It fetches the real price directly from the Drizzle `products` schema.
3.  **Atomic Transactions:** Wrapping the inserts in `db.transaction()` ensures that if a network crash happens halfway through writing invoice items, the entire transaction rolls back cleanly.
