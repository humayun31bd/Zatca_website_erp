import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { supplierReturns, supplierReturnItems, suppliers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

function formatReturn(ret: any, supplier: any = null, items: any[] = []) {
  return {
    id: ret.id,
    tenantId: ret.tenantId,
    returnNumber: ret.returnNumber,
    debitNoteNumber: ret.debitNoteNumber || `DN-${ret.returnNumber}`,
    supplierId: ret.supplierId,
    supplierName: supplier?.name || ret.supplierName || "Supplier",
    originalBillId: ret.originalBillId || null,
    billNumber: ret.billNumber || null,
    returnDate: ret.returnDate instanceof Date ? ret.returnDate.toISOString() : (ret.returnDate || new Date().toISOString()),
    reason: ret.reason || "DEFECTIVE",
    subtotalAmount: String(ret.subtotalAmount ?? "0.00"),
    vatAmount: String(ret.vatAmount ?? "0.00"),
    totalAmount: String(ret.totalAmount ?? "0.00"),
    status: ret.status || "DRAFT",
    refundStatus: ret.refundStatus || "PENDING",
    remarks: ret.remarks || "",
    items: items.map(item => ({
      id: item.id,
      productId: item.productId || null,
      itemDescription: item.itemDescription,
      unitPrice: String(item.unitPrice ?? "0.00"),
      quantity: Number(item.quantity ?? 1),
      vatRate: Number(item.vatRate ?? 15),
      vatAmount: String(item.vatAmount ?? "0.00"),
      totalAmount: String(item.totalAmount ?? "0.00"),
      reason: item.reason || "",
    })),
    createdAt: ret.createdAt instanceof Date ? ret.createdAt.toISOString() : (ret.createdAt || new Date().toISOString()),
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

    const returnsList = await db
      .select({
        ret: supplierReturns,
        supplier: suppliers,
      })
      .from(supplierReturns)
      .leftJoin(suppliers, eq(supplierReturns.supplierId, suppliers.id))
      .where(eq(supplierReturns.tenantId, tenantId))
      .orderBy(desc(supplierReturns.createdAt));

    const result = await Promise.all(
      returnsList.map(async (r) => {
        const items = await db
          .select()
          .from(supplierReturnItems)
          .where(eq(supplierReturnItems.returnId, r.ret.id));
        return formatReturn(r.ret, r.supplier, items);
      })
    );

    return NextResponse.json({ success: true, data: result, returns: result });
  } catch (error: any) {
    console.error("GET Supplier Returns Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    const returnId = crypto.randomUUID();
    const returnNumber = body.returnNumber || `PRN-${Date.now().toString().slice(-6)}`;
    const debitNoteNumber = body.debitNoteNumber || `DN-${Date.now().toString().slice(-6)}`;

    // Calculate totals from items if provided
    let subtotal = 0;
    let vatTotal = 0;
    const itemsPayload = Array.isArray(body.items) ? body.items : [];

    itemsPayload.forEach((item: any) => {
      const price = Number(item.unitPrice || 0);
      const qty = Number(item.quantity || 1);
      const itemSub = price * qty;
      const vatRate = Number(item.vatRate || 15);
      const itemVat = itemSub * (vatRate / 100);
      subtotal += itemSub;
      vatTotal += itemVat;
    });

    const totalAmount = subtotal + vatTotal;

    const [newReturn] = await db
      .insert(supplierReturns)
      .values({
        id: returnId,
        tenantId,
        returnNumber,
        debitNoteNumber,
        supplierId: body.supplierId,
        supplierName: body.supplierName || null,
        originalBillId: body.originalBillId || null,
        billNumber: body.billNumber || null,
        returnDate: body.returnDate || new Date().toISOString(),
        reason: body.reason || "DEFECTIVE",
        subtotalAmount: body.subtotalAmount ? Number(body.subtotalAmount) : subtotal,
        vatAmount: body.vatAmount ? Number(body.vatAmount) : vatTotal,
        totalAmount: body.totalAmount ? Number(body.totalAmount) : totalAmount,
        status: body.status || "APPROVED",
        refundStatus: body.refundStatus || "PENDING",
        remarks: body.remarks || null,
      })
      .returning();

    // Insert line items
    if (itemsPayload.length > 0) {
      for (const item of itemsPayload) {
        const itemPrice = Number(item.unitPrice || 0);
        const itemQty = Number(item.quantity || 1);
        const itemSub = itemPrice * itemQty;
        const itemVat = itemSub * (Number(item.vatRate || 15) / 100);

        await db.insert(supplierReturnItems).values({
          id: crypto.randomUUID(),
          returnId,
          productId: item.productId || null,
          itemDescription: item.itemDescription || "Returned Item",
          unitPrice: itemPrice,
          quantity: itemQty,
          vatRate: Number(item.vatRate || 15),
          vatAmount: itemVat,
          totalAmount: itemSub + itemVat,
          reason: item.reason || body.reason || "DEFECTIVE",
        });
      }
    }

    const createdItems = await db
      .select()
      .from(supplierReturnItems)
      .where(eq(supplierReturnItems.returnId, returnId));

    const formatted = formatReturn(newReturn, null, createdItems);

    return NextResponse.json({ success: true, data: formatted, return: formatted }, { status: 201 });
  } catch (error: any) {
    console.error("POST Supplier Return Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
