import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { purchaseInvoices, purchaseInvoiceLineItems, products, suppliers } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { z } from "zod";
import { accounts, journalEntries, journalEntryLines } from "@/lib/db/accounting_schema";
import { resolveMappedAccountId } from "@/lib/accounting/account_resolver";

const PurchaseLineItemSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().min(1),
  quantity: z.union([z.string(), z.number()]).transform((v) => String(v)),
  unitPrice: z.union([z.string(), z.number()]).transform((v) => String(v)),
  vatRate: z.union([z.string(), z.number()]).optional().default("15").transform((v) => String(v)),
  subtotalAmount: z.union([z.string(), z.number()]).transform((v) => String(v)),
  vatAmount: z.union([z.string(), z.number()]).transform((v) => String(v)),
  totalAmount: z.union([z.string(), z.number()]).transform((v) => String(v)),
});

const PurchaseInvoiceSchema = z.object({
  supplierId: z.string().min(1),
  invoiceNumber: z.string().min(1),
  issueDate: z.string().optional().default(() => new Date().toISOString()),
  dueDate: z.string().optional().nullable(),
  subtotalAmount: z.union([z.string(), z.number()]).transform((v) => String(v)),
  totalVatAmount: z.union([z.string(), z.number()]).transform((v) => String(v)),
  totalAmount: z.union([z.string(), z.number()]).transform((v) => String(v)),
  paymentStatus: z.enum(['UNPAID', 'PAID', 'PARTIAL']).optional().default('UNPAID'),
  lineItems: z.array(PurchaseLineItemSchema).optional().default([]),
});

function parseToIsoString(val: any): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? new Date().toISOString() : val.toISOString();
  }
  if (typeof val === 'number') {
    const ms = val > 100000000000 ? val : val * 1000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function formatPurchaseResponse(p: any) {
  return {
    ...p,
    supplierName: p.supplierName || 'Unknown Supplier',
    issueDate: parseToIsoString(p.issueDate),
    dueDate: p.dueDate ? parseToIsoString(p.dueDate) : null,
    createdAt: parseToIsoString(p.createdAt),
    subtotalAmount: String(p.subtotalAmount ?? "0"),
    totalVatAmount: String(p.totalVatAmount ?? "0"),
    totalAmount: String(p.totalAmount ?? "0"),
    paymentStatus: String(p.paymentStatus || 'UNPAID').toUpperCase(),
    lineItems: (p.lineItems || []).map((li: any) => ({
      ...li,
      quantity: Number(li.quantity ?? 0),
      unitPrice: Number(li.unitPrice ?? 0),
      vatRate: Number(li.vatRate ?? 15),
      subtotalAmount: Number(li.subtotalAmount ?? 0),
      vatAmount: Number(li.vatAmount ?? 0),
      totalAmount: Number(li.totalAmount ?? 0),
    })),
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId =
      session?.tenantId ||
      req.headers.get("x-tenant-id") ||
      req.nextUrl.searchParams.get("tenantId") ||
      "336eaf82-a524-4b0a-9326-7197b1e5459e";

    let whereCondition = eq(purchaseInvoices.tenantId, tenantId);
    if (session?.role === "SUPERADMIN") {
      const { searchParams } = new URL(req.url);
      const tenantParam = searchParams.get("tenantId");
      if (tenantParam) {
        whereCondition = eq(purchaseInvoices.tenantId, tenantParam);
      }
    }

    // Select purchase invoices with joined supplier name
    const tenantPurchases = await db
      .select({
        id: purchaseInvoices.id,
        tenantId: purchaseInvoices.tenantId,
        supplierId: purchaseInvoices.supplierId,
        supplierName: suppliers.name,
        invoiceNumber: purchaseInvoices.invoiceNumber,
        issueDate: purchaseInvoices.issueDate,
        dueDate: purchaseInvoices.dueDate,
        subtotalAmount: purchaseInvoices.subtotalAmount,
        totalVatAmount: purchaseInvoices.totalVatAmount,
        totalAmount: purchaseInvoices.totalAmount,
        paymentStatus: purchaseInvoices.paymentStatus,
        createdAt: purchaseInvoices.createdAt,
        updatedAt: purchaseInvoices.updatedAt,
      })
      .from(purchaseInvoices)
      .leftJoin(suppliers, eq(purchaseInvoices.supplierId, suppliers.id))
      .where(whereCondition)
      .orderBy(desc(purchaseInvoices.createdAt));

    if (tenantPurchases.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch line items for retrieved invoices
    const invoiceIds = tenantPurchases.map(p => p.id);
    const lineItems = await db
      .select()
      .from(purchaseInvoiceLineItems)
      .where(inArray(purchaseInvoiceLineItems.purchaseInvoiceId, invoiceIds));

    const lineItemsMap: Record<string, any[]> = {};
    for (const item of lineItems) {
      if (!lineItemsMap[item.purchaseInvoiceId]) {
        lineItemsMap[item.purchaseInvoiceId] = [];
      }
      lineItemsMap[item.purchaseInvoiceId].push(item);
    }

    const formattedPurchases = tenantPurchases.map(p => {
      return formatPurchaseResponse({
        ...p,
        lineItems: lineItemsMap[p.id] || []
      });
    });

    return NextResponse.json(formattedPurchases);
  } catch (error: any) {
    console.error("GET Purchases error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId =
      session?.tenantId ||
      req.headers.get("x-tenant-id") ||
      req.nextUrl.searchParams.get("tenantId") ||
      "336eaf82-a524-4b0a-9326-7197b1e5459e";
    const body = await req.json();
    const parseResult = PurchaseInvoiceSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid payload", details: parseResult.error.format() }, { status: 400 });
    }

    const tx = db;
    // 1. Verify / Resolve Supplier ID
      let validSupplierId = parseResult.data.supplierId;
      let supplierName = "Default Supplier (مورد عام)";

      const existingSupplier = await tx.select({ id: suppliers.id, name: suppliers.name })
        .from(suppliers)
        .where(eq(suppliers.id, validSupplierId));

      if (existingSupplier.length > 0) {
        supplierName = existingSupplier[0].name;
      } else {
        const anySupplier = await tx.select({ id: suppliers.id, name: suppliers.name })
          .from(suppliers)
          .where(eq(suppliers.tenantId, tenantId))
          .limit(1);

        if (anySupplier.length > 0) {
          validSupplierId = anySupplier[0].id;
          supplierName = anySupplier[0].name;
        } else {
          const [newSup] = await tx.insert(suppliers).values({
            tenantId: tenantId,
            name: supplierName,
            category: "MERCHANDISE",
          }).returning();
          validSupplierId = newSup.id;
        }
      }

      // 2. Insert Purchase Invoice Header
      const issueDateParsed = parseResult.data.issueDate ? new Date(parseResult.data.issueDate) : new Date();
      const dueDateParsed = parseResult.data.dueDate ? new Date(parseResult.data.dueDate) : null;

      const newPurchase = await tx.insert(purchaseInvoices).values({
        tenantId: tenantId,
        supplierId: validSupplierId,
        invoiceNumber: parseResult.data.invoiceNumber,
        issueDate: isNaN(issueDateParsed.getTime()) ? new Date() : issueDateParsed,
        dueDate: dueDateParsed && !isNaN(dueDateParsed.getTime()) ? dueDateParsed : null,
        subtotalAmount: Number(parseResult.data.subtotalAmount || 0),
        totalVatAmount: Number(parseResult.data.totalVatAmount || 0),
        totalAmount: Number(parseResult.data.totalAmount || 0),
        paymentStatus: parseResult.data.paymentStatus,
      }).returning();

      const purchaseId = newPurchase[0].id;
      const insertedItems = [];

      // 3. Insert Line Items & Update Stock
      if (parseResult.data.lineItems && parseResult.data.lineItems.length > 0) {
        for (const item of parseResult.data.lineItems) {
          let validProductId: string | null = null;
          if (item.productId && item.productId.trim() !== '') {
            const prodCheck = await tx.select({ id: products.id }).from(products).where(eq(products.id, item.productId));
            if (prodCheck.length > 0) {
              validProductId = item.productId;
            }
          }

          const [insertedItem] = await tx.insert(purchaseInvoiceLineItems).values({
            purchaseInvoiceId: purchaseId,
            productId: validProductId,
            description: item.description,
            quantity: Number(item.quantity || 0),
            unitPrice: Number(item.unitPrice || 0),
            vatRate: Number(item.vatRate || 0),
            subtotalAmount: Number(item.subtotalAmount || 0),
            vatAmount: Number(item.vatAmount || 0),
            totalAmount: Number(item.totalAmount || 0),
          }).returning();
          insertedItems.push(insertedItem);

          // If valid product linked, increment inventory stock (support decimals)
          if (validProductId) {
            const existingProduct = await tx.select({ stock: products.stockQuantity }).from(products).where(eq(products.id, validProductId));
            if (existingProduct.length > 0) {
              const currentStock = existingProduct[0].stock ?? 0;
              const addedStock = Number(item.quantity || 0);
              
              await tx.update(products)
                .set({ stockQuantity: currentStock + addedStock })
                .where(eq(products.id, validProductId));
            }
          }
        }
      }

      // 4. Generate Auto-Journal Entry (Dynamic User Account Mappings)
      try {
        const apAccountId = await resolveMappedAccountId(tx, tenantId, 'PURCHASE', 'AP_VENDORS', '2.10.01.001.001');
        const inventoryAccountId = await resolveMappedAccountId(tx, tenantId, 'INVENTORY', 'INVENTORY_ASSET', '1.10.03.001.001');
        const vatAccountId = await resolveMappedAccountId(tx, tenantId, 'TAX', 'INPUT_VAT', '2.10.04.001.001');
        
        if (apAccountId && inventoryAccountId) {
          const jeNumber = `PUR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
          
          const [newJe] = await tx.insert(journalEntries).values({
            tenantId: tenantId,
            entryNumber: jeNumber,
            referenceType: 'PURCHASE',
            referenceId: purchaseId,
            entryDate: isNaN(issueDateParsed.getTime()) ? new Date() : issueDateParsed,
            description: `Purchase Invoice ${parseResult.data.invoiceNumber}`,
            status: 'POSTED',
          }).returning();

          const subtotalNum = Number(parseResult.data.subtotalAmount || 0);
          const totalNum = Number(parseResult.data.totalAmount || 0);
          const vatNum = Number(parseResult.data.totalVatAmount || 0);

          const linesToInsert = [];

          if (subtotalNum > 0) {
            linesToInsert.push({
              journalEntryId: newJe.id,
              accountId: inventoryAccountId,
              debit: subtotalNum,
              credit: 0,
              description: `Inventory Receipt for ${parseResult.data.invoiceNumber}`,
            });
          }

          if (totalNum > 0) {
            linesToInsert.push({
              journalEntryId: newJe.id,
              accountId: apAccountId,
              debit: 0,
              credit: totalNum,
              description: `A/P for ${parseResult.data.invoiceNumber}`,
            });
          }

          if (vatNum > 0 && vatAccountId) {
            linesToInsert.push({
              journalEntryId: newJe.id,
              accountId: vatAccountId,
              debit: vatNum,
              credit: 0,
              description: `Input VAT for ${parseResult.data.invoiceNumber}`,
            });
          }

          if (linesToInsert.length > 0) {
            await tx.insert(journalEntryLines).values(linesToInsert);
          }
        }
      } catch (jeErr) {
        console.warn("Auto Journal Entry creation skipped or warning:", jeErr);
      }

    const result = {
      ...newPurchase[0],
      supplierName,
      lineItems: insertedItems
    };

    return NextResponse.json(formatPurchaseResponse(result), { status: 201 });
  } catch (error: any) {
    console.error("POST Purchase error:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.nextUrl.searchParams.get("tenantId");

    db.transaction((tx) => {
      if (tenantId) {
        tx.delete(purchaseInvoiceLineItems).run();
        tx.delete(purchaseInvoices).where(eq(purchaseInvoices.tenantId, tenantId)).run();
      } else {
        tx.delete(purchaseInvoiceLineItems).run();
        tx.delete(purchaseInvoices).run();
      }
    });

    return NextResponse.json({ success: true, message: "All purchase invoices wiped successfully." });
  } catch (error: any) {
    console.error("DELETE Purchases error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

