import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { supplierQuotations, supplierQuotationItems, suppliers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { getNextDocumentNumber } from "@/lib/procurement/document_sequences";

function formatQuotation(q: any, items: any[] = [], supplier: any = null) {
  return {
    id: q.id,
    tenantId: q.tenantId,
    supplierId: q.supplierId,
    supplierName: supplier?.name || "Unknown Supplier",
    quotationNumber: q.quotationNumber,
    supplierRefNo: q.supplierRefNo || q.supplier_ref_no || null,
    documentUrl: q.documentUrl || q.document_url || null,
    issueDate: q.issueDate instanceof Date ? q.issueDate.toISOString() : new Date(q.issueDate * 1000).toISOString(),
    validUntil: q.validUntil ? (q.validUntil instanceof Date ? q.validUntil.toISOString() : new Date(q.validUntil * 1000).toISOString()) : null,
    subtotalAmount: String(q.subtotalAmount ?? "0"),
    totalVatAmount: String(q.totalVatAmount ?? "0"),
    totalAmount: String(q.totalAmount ?? "0"),
    status: q.status || "SUBMITTED",
    remarks: q.remarks || "",
    createdAt: q.createdAt instanceof Date ? q.createdAt.toISOString() : new Date(q.createdAt * 1000).toISOString(),
    items: items.map(item => ({
      ...item,
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

    const quotations = await db
      .select({
        quotation: supplierQuotations,
        supplier: suppliers,
      })
      .from(supplierQuotations)
      .leftJoin(suppliers, eq(supplierQuotations.supplierId, suppliers.id))
      .where(eq(supplierQuotations.tenantId, tenantId))
      .orderBy(desc(supplierQuotations.createdAt));

    const result = [];
    for (const row of quotations) {
      const items = await db
        .select()
        .from(supplierQuotationItems)
        .where(eq(supplierQuotationItems.quotationId, row.quotation.id));

      result.push(formatQuotation(row.quotation, items, row.supplier));
    }

    return NextResponse.json({ success: true, quotations: result, data: result });
  } catch (error: any) {
    console.error("GET Quotations Error:", error);
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

    const { supplierId, quotationNumber, supplierRefNo, documentUrl, issueDate, validUntil, items = [], remarks } = body;

    if (!supplierId) {
      return NextResponse.json({ error: "Supplier ID is required" }, { status: 400 });
    }

    const finalQuotationNumber =
      quotationNumber || (await getNextDocumentNumber(tenantId, 'RFQ', issueDate)).documentNumber;

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
        description: item.description || "Quotation Item",
        quantity: qty,
        unitPrice: price,
        vatRate: rate,
        subtotalAmount: itemSub,
        vatAmount: itemVat,
        totalAmount: itemTotal,
      };
    });

    let realSupplierId = supplierId;
    let existingSupplier = await db.select().from(suppliers).where(eq(suppliers.id, supplierId)).get();

    if (!existingSupplier && (body.supplierName || supplierId)) {
      const supName = body.supplierName || "Custom Supplier";
      const foundByName = await db.select().from(suppliers).where(eq(suppliers.name, supName)).get();
      if (foundByName) {
        realSupplierId = foundByName.id;
        existingSupplier = foundByName;
      } else {
        try {
          const [createdSup] = await db.insert(suppliers).values({
            id: supplierId === 'sup-custom' ? crypto.randomUUID() : supplierId,
            tenantId,
            name: supName,
          }).returning();
          realSupplierId = createdSup.id;
          existingSupplier = createdSup;
        } catch (e) {
          console.warn("Supplier auto-creation warning:", e);
        }
      }
    }

    const [newQuotation] = await db
      .insert(supplierQuotations)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        supplierId: realSupplierId,
        quotationNumber: finalQuotationNumber,
        supplierRefNo: supplierRefNo || null,
        documentUrl: documentUrl || null,
        issueDate: new Date(issueDate || Date.now()),
        validUntil: validUntil ? new Date(validUntil) : null,
        subtotalAmount: subtotal,
        totalVatAmount: totalVat,
        totalAmount: total,
        status: "SUBMITTED",
        remarks: remarks || "",
      })
      .returning();

    for (const item of formattedItems) {
      await db.insert(supplierQuotationItems).values({
        ...item,
        quotationId: newQuotation.id,
      });
    }

    return NextResponse.json({
      success: true,
      quotation: formatQuotation(newQuotation, formattedItems, existingSupplier),
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST Quotation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
