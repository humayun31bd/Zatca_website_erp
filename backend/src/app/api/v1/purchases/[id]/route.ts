import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { purchaseInvoices, purchaseInvoiceLineItems, suppliers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { z } from "zod";

const PurchaseInvoiceUpdateSchema = z.object({
  supplierId: z.string().optional(),
  invoiceNumber: z.string().min(1).optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  subtotalAmount: z.union([z.string(), z.number()]).optional().transform((v) => v !== undefined ? String(v) : undefined),
  totalVatAmount: z.union([z.string(), z.number()]).optional().transform((v) => v !== undefined ? String(v) : undefined),
  totalAmount: z.union([z.string(), z.number()]).optional().transform((v) => v !== undefined ? String(v) : undefined),
  paymentStatus: z.enum(['UNPAID', 'PAID', 'PARTIAL']).optional(),
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

function formatSinglePurchaseResponse(p: any, lineItems: any[] = []) {
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
    lineItems: lineItems.map((li: any) => ({
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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId || "tenant-grocery-01";

    const purchase = await db
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
      .where(and(eq(purchaseInvoices.tenantId, tenantId), eq(purchaseInvoices.id, params.id)))
      .limit(1);

    if (purchase.length === 0) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    const lineItems = await db
      .select()
      .from(purchaseInvoiceLineItems)
      .where(eq(purchaseInvoiceLineItems.purchaseInvoiceId, params.id));

    return NextResponse.json(formatSinglePurchaseResponse(purchase[0], lineItems));
  } catch (error: any) {
    console.error("GET Purchase error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId || "tenant-grocery-01";
    const body = await req.json();
    const parseResult = PurchaseInvoiceUpdateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid payload", details: parseResult.error.format() }, { status: 400 });
    }

    const updateData: any = { ...parseResult.data, updatedAt: new Date() };
    if (parseResult.data.issueDate) updateData.issueDate = new Date(parseResult.data.issueDate);
    if (parseResult.data.dueDate) updateData.dueDate = new Date(parseResult.data.dueDate);

    const updatedPurchase = await db
      .update(purchaseInvoices)
      .set(updateData)
      .where(and(eq(purchaseInvoices.tenantId, tenantId), eq(purchaseInvoices.id, params.id)))
      .returning();

    if (updatedPurchase.length === 0) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    const lineItems = await db
      .select()
      .from(purchaseInvoiceLineItems)
      .where(eq(purchaseInvoiceLineItems.purchaseInvoiceId, params.id));

    return NextResponse.json(formatSinglePurchaseResponse(updatedPurchase[0], lineItems));
  } catch (error: any) {
    console.error("PUT Purchase error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId || "tenant-grocery-01";

    const deletedPurchase = await db
      .delete(purchaseInvoices)
      .where(and(eq(purchaseInvoices.tenantId, tenantId), eq(purchaseInvoices.id, params.id)))
      .returning();

    if (deletedPurchase.length === 0) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Purchase error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
