import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { purchaseInvoices } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { z } from "zod";

const PurchaseInvoiceUpdateSchema = z.object({
  supplierId: z.string().uuid().optional(),
  invoiceNumber: z.string().min(1).optional(),
  issueDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional().nullable(),
  subtotalAmount: z.string().optional(),
  totalVatAmount: z.string().optional(),
  totalAmount: z.string().optional(),
  paymentStatus: z.enum(['UNPAID', 'PAID', 'PARTIAL']).optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const purchase = await db
      .select()
      .from(purchaseInvoices)
      .where(and(eq(purchaseInvoices.tenantId, session.tenantId as string), eq(purchaseInvoices.id, params.id)))
      .limit(1);

    if (purchase.length === 0) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    return NextResponse.json(purchase[0]);
  } catch (error: any) {
    console.error("GET Purchase error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      .where(and(eq(purchaseInvoices.tenantId, session.tenantId as string), eq(purchaseInvoices.id, params.id)))
      .returning();

    if (updatedPurchase.length === 0) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    return NextResponse.json(updatedPurchase[0]);
  } catch (error: any) {
    console.error("PUT Purchase error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const deletedPurchase = await db
      .delete(purchaseInvoices)
      .where(and(eq(purchaseInvoices.tenantId, session.tenantId as string), eq(purchaseInvoices.id, params.id)))
      .returning();

    if (deletedPurchase.length === 0) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Purchase error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
