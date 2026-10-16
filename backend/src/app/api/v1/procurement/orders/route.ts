import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { purchaseOrders, purchaseOrderItems, suppliers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { getNextDocumentNumber } from "@/lib/procurement/document_sequences";

function formatPO(po: any, items: any[] = [], supplier: any = null) {
  return {
    id: po.id,
    tenantId: po.tenantId,
    poNumber: po.poNumber,
    supplierId: po.supplierId,
    supplierName: supplier?.name || po.supplierName || "Unknown Supplier",
    csId: po.csId || null,
    quotationId: po.quotationId || null,
    status: po.status || "ISSUED",
    issueDate: po.issueDate instanceof Date ? po.issueDate.toISOString() : (po.issueDate || new Date().toISOString()),
    expectedDeliveryDate: po.expectedDeliveryDate ? (po.expectedDeliveryDate instanceof Date ? po.expectedDeliveryDate.toISOString() : po.expectedDeliveryDate) : null,
    subtotalAmount: String(po.subtotalAmount ?? "0.00"),
    vatAmount: String(po.vatAmount ?? "0.00"),
    totalAmount: String(po.totalAmount ?? "0.00"),
    currency: po.currency || "SAR",
    notes: po.notes || "",
    createdAt: po.createdAt instanceof Date ? po.createdAt.toISOString() : (po.createdAt || new Date().toISOString()),
    items: items.map((item) => ({
      id: item.id,
      poId: item.poId,
      productId: item.productId || null,
      description: item.description || "",
      quantity: Number(item.quantity ?? 0),
      unitPrice: Number(item.unitPrice ?? 0),
      vatRate: Number(item.vatRate ?? 15),
      subtotalAmount: Number(item.subtotalAmount ?? 0),
      vatAmount: Number(item.vatAmount ?? 0),
      totalAmount: Number(item.totalAmount ?? 0),
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

    const ordersList = await db
      .select({
        po: purchaseOrders,
        supplier: suppliers,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(eq(purchaseOrders.tenantId, tenantId))
      .orderBy(desc(purchaseOrders.createdAt));

    const result = [];
    for (const row of ordersList) {
      const items = await db
        .select()
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.poId, row.po.id));

      result.push(formatPO(row.po, items, row.supplier));
    }

    return NextResponse.json({ success: true, data: result, orders: result });
  } catch (error: any) {
    console.error("GET Purchase Orders Error:", error);
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

    const {
      supplierId,
      supplierName,
      poNumber,
      csId,
      quotationId,
      issueDate,
      expectedDeliveryDate,
      items = [],
      notes,
    } = body;

    if (!supplierId) {
      return NextResponse.json({ error: "Supplier ID is required" }, { status: 400 });
    }

    const generatedPoNumber =
      poNumber || (await getNextDocumentNumber(tenantId, 'PO', issueDate)).documentNumber;
    let subtotal = 0;
    let totalVat = 0;
    let total = 0;

    const formattedItems = items.map((item: any) => {
      const qty = Number(item.quantity || 0);
      const price = Number(item.unitPrice || 0);
      const rate = Number(item.vatRate || 15);

      const itemSub = qty * price;
      const itemVat = itemSub * (rate / 100);
      const itemTotal = itemSub + itemVat;

      subtotal += itemSub;
      totalVat += itemVat;
      total += itemTotal;

      return {
        id: crypto.randomUUID(),
        productId: item.productId || null,
        description: item.description || "Purchase Order Item",
        quantity: qty,
        unitPrice: price,
        vatRate: rate,
        subtotalAmount: itemSub,
        vatAmount: itemVat,
        totalAmount: itemTotal,
      };
    });

    const newPoId = crypto.randomUUID();
    const [newPo] = await db
      .insert(purchaseOrders)
      .values({
        id: newPoId,
        tenantId,
        poNumber: generatedPoNumber,
        supplierId,
        supplierName: supplierName || "Supplier",
        csId: csId || null,
        quotationId: quotationId || null,
        status: "ISSUED",
        issueDate: issueDate || new Date().toISOString(),
        expectedDeliveryDate: expectedDeliveryDate || null,
        subtotalAmount: subtotal,
        vatAmount: totalVat,
        totalAmount: total,
        currency: "SAR",
        notes: notes || "",
      })
      .returning();

    for (const item of formattedItems) {
      await db.insert(purchaseOrderItems).values({
        ...item,
        poId: newPoId,
      });
    }

    const supplier = await db.select().from(suppliers).where(eq(suppliers.id, supplierId)).get();

    return NextResponse.json({
      success: true,
      data: formatPO(newPo, formattedItems, supplier),
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST Purchase Order Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
