import { db } from "@/lib/db";
import {
  csItems,
  supplierQuotations,
  supplierQuotationItems,
  suppliers,
  products,
  purchaseOrders,
  purchaseOrderItems,
  quotationComparativeStatements,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { buildLineItemMatrix, type ComparativeLineItemMatrix } from "@/lib/procurement/cs_scoring";
import { getNextDocumentNumber } from "@/lib/procurement/document_sequences";

export function parseDateIso(val: any): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return new Date().toISOString();
    if (val.getFullYear() > 2100) {
      return new Date(Math.floor(val.getTime() / 1000)).toISOString();
    }
    return val.toISOString();
  }
  if (typeof val === "number") {
    const ms = val > 100000000000 ? val : val * 1000;
    return new Date(ms).toISOString();
  }
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export async function formatSingleCs(cs: any) {
  const items = await db
    .select({
      csItem: csItems,
      quotation: supplierQuotations,
      supplier: suppliers,
    })
    .from(csItems)
    .leftJoin(supplierQuotations, eq(csItems.quotationId, supplierQuotations.id))
    .leftJoin(suppliers, eq(supplierQuotations.supplierId, suppliers.id))
    .where(eq(csItems.csId, cs.id));

  let winnerSupplierName: string | null = null;
  let winnerSupplierId: string | null = null;
  if (cs.winningQuotationId) {
    const winningRow = items.find((r) => r.quotation?.id === cs.winningQuotationId);
    if (winningRow) {
      winnerSupplierName = winningRow.supplier?.name || "Selected Supplier";
      winnerSupplierId = winningRow.supplier?.id || winningRow.quotation?.supplierId || null;
    }
  }

  const formattedItems = items.map((row) => ({
    id: row.csItem.id,
    csId: cs.id,
    quotationId: row.quotation?.id || "",
    supplierId: row.supplier?.id || row.quotation?.supplierId,
    supplierName: row.supplier?.name || "Unknown Supplier",
    quotationNumber: row.quotation?.quotationNumber || "N/A",
    quotedAmount: String(row.quotation?.totalAmount ?? "0"),
    totalAmount: String(row.quotation?.totalAmount ?? "0"),
    deliveryLeadDays: row.csItem.deliveryLeadDays ?? 7,
    score: row.csItem.compositeScore || row.csItem.score || 0,
    financialScore: row.csItem.financialScore ?? 0,
    deliveryScore: row.csItem.deliveryScore ?? 0,
    technicalScore: row.csItem.technicalScore ?? 80,
    compositeScore: row.csItem.compositeScore || row.csItem.score || 0,
    rank: row.csItem.rank ?? 1,
    isLowestPrice: Boolean(row.csItem.isLowestPrice),
    isHighestScore: Boolean(row.csItem.isHighestScore),
    isSelected: Boolean(row.csItem.isWinningBid),
    isWinningBid: Boolean(row.csItem.isWinningBid),
  }));

  // Sort by rank ascending (Rank 1 first)
  formattedItems.sort((a, b) => a.rank - b.rank);

  // Fetch line items for participating quotations to construct the comparison matrix
  const quotationIds = items
    .map((r) => r.quotation?.id)
    .filter(Boolean) as string[];

  const rawQuotationItems = quotationIds.length > 0
    ? await db
        .select({
          quotationId: supplierQuotationItems.quotationId,
          productId: supplierQuotationItems.productId,
          productName: products.name,
          description: supplierQuotationItems.description,
          quantity: supplierQuotationItems.quantity,
          unitPrice: supplierQuotationItems.unitPrice,
          totalAmount: supplierQuotationItems.totalAmount,
        })
        .from(supplierQuotationItems)
        .leftJoin(products, eq(supplierQuotationItems.productId, products.id))
        .where(inArray(supplierQuotationItems.quotationId, quotationIds))
    : [];

  const participatingBids = items.map((r) => ({
    quotationId: r.quotation?.id || "",
    supplierId: r.supplier?.id || r.quotation?.supplierId || "",
    supplierName: r.supplier?.name || "Unknown Supplier",
    quotationNumber: r.quotation?.quotationNumber || "N/A",
  }));

  const lineItemMatrix = buildLineItemMatrix(participatingBids, rawQuotationItems);

  // Fetch all generated purchase orders linked to this CS (single or split award)
  const pos = await db
    .select({
      id: purchaseOrders.id,
      poNumber: purchaseOrders.poNumber,
      supplierId: purchaseOrders.supplierId,
      supplierName: purchaseOrders.supplierName,
      totalAmount: purchaseOrders.totalAmount,
      status: purchaseOrders.status,
      issueDate: purchaseOrders.issueDate,
      createdAt: purchaseOrders.createdAt,
    })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.csId, cs.id));

  const formattedPos = pos.map((po) => ({
    id: po.id,
    poNumber: po.poNumber,
    supplierId: po.supplierId,
    supplierName: po.supplierName || "Supplier",
    totalAmount: String(po.totalAmount),
    status: po.status,
    issueDate: po.issueDate,
    createdAt: parseDateIso(po.createdAt),
  }));

  return {
    id: cs.id,
    csNumber: cs.csNumber,
    title: cs.title,
    status: cs.status,
    winningQuotationId: cs.winningQuotationId,
    winnerQuotationId: cs.winningQuotationId,
    winnerSupplierId,
    winnerSupplierName,
    remarks: cs.remarks || "",
    notes: cs.remarks || "",
    createdAt: parseDateIso(cs.createdAt),
    updatedAt: parseDateIso(cs.updatedAt),
    items: formattedItems,
    bids: formattedItems,
    lineItemMatrix,
    purchaseOrders: formattedPos,
    generatedPurchaseOrders: formattedPos,
  };
}

export interface SplitAllocationItem {
  key?: string;
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  awardedSupplierId: string;
  awardedQuotationId?: string;
  awardedSupplierName?: string;
}

export interface ApproveCsParams {
  csId: string;
  tenantId?: string;
  status?: string;
  awardMode?: "SINGLE" | "SPLIT";
  winningQuotationId?: string | null;
  splitAllocations?: SplitAllocationItem[];
  remarks?: string;
  notes?: string;
}

export async function approveComparativeStatementService(params: ApproveCsParams) {
  const { csId, awardMode = "SINGLE", winningQuotationId, remarks, notes } = params;
  const approvalStatus = params.status || "APPROVED";
  const approvalRemarks = remarks || notes || "";

  // 1. Fetch current CS
  const csRows = await db
    .select()
    .from(quotationComparativeStatements)
    .where(eq(quotationComparativeStatements.id, csId))
    .limit(1);

  if (csRows.length === 0) {
    throw new Error("Comparative statement not found");
  }
  const currentCs = csRows[0];

  const generatedPos: Array<{
    poId: string;
    poNumber: string;
    supplierId: string;
    supplierName: string;
    totalAmount: number;
    itemsCount: number;
  }> = [];

  // ==========================================
  // CASE A: SPLIT-AWARD PO GENERATION
  // ==========================================
  if (awardMode === "SPLIT") {
    let allocations = params.splitAllocations || [];

    // If no manual allocations given, generate optimal lowest-rate allocations from lineItemMatrix
    if (allocations.length === 0) {
      const formattedCurrent = await formatSingleCs(currentCs);
      if (formattedCurrent.lineItemMatrix?.rows) {
        allocations = formattedCurrent.lineItemMatrix.rows.map((row) => ({
          key: row.key,
          productId: row.productId,
          description: row.description,
          quantity: row.quantity,
          unitPrice: row.lowestUnitPrice,
          awardedSupplierId: row.lowestSupplierId,
          awardedQuotationId: row.lowestQuotationId,
          awardedSupplierName: row.lowestSupplierName,
        }));
      }
    }

    if (allocations.length === 0) {
      throw new Error("No line items available to perform a split award");
    }

    // Group allocations by awardedSupplierId
    const supplierGroups = new Map<string, SplitAllocationItem[]>();
    for (const alloc of allocations) {
      const sId = alloc.awardedSupplierId;
      if (!sId) continue;
      if (!supplierGroups.has(sId)) {
        supplierGroups.set(sId, []);
      }
      supplierGroups.get(sId)!.push(alloc);
    }

    const supplierIds = Array.from(supplierGroups.keys());
    const supplierRows = supplierIds.length > 0
      ? await db.select().from(suppliers).where(inArray(suppliers.id, supplierIds))
      : [];
    const supplierMap = new Map(supplierRows.map((s) => [s.id, s]));

    let splitIndex = 1;
    const winningQuotationIds = new Set<string>();

    for (const [supplierId, allocatedItems] of supplierGroups.entries()) {
      const supObj = supplierMap.get(supplierId);
      const supplierName = supObj?.name || allocatedItems[0].awardedSupplierName || "Supplier";
      const leadQuotationId = allocatedItems.find((i) => i.awardedQuotationId)?.awardedQuotationId || null;
      if (leadQuotationId) winningQuotationIds.add(leadQuotationId);

      let subtotal = 0;
      for (const item of allocatedItems) {
        subtotal += Number(item.unitPrice) * Number(item.quantity);
      }
      const vatAmount = subtotal * 0.15;
      const totalAmount = subtotal + vatAmount;

      const poId = crypto.randomUUID();
      const { documentNumber: poNumber } = await getNextDocumentNumber(currentCs.tenantId, 'PO');

      await db.insert(purchaseOrders).values({
        id: poId,
        tenantId: currentCs.tenantId,
        poNumber,
        supplierId,
        supplierName,
        csId: currentCs.id,
        quotationId: leadQuotationId,
        status: "ISSUED",
        issueDate: new Date().toISOString(),
        subtotalAmount: Math.round(subtotal * 100) / 100,
        vatAmount: Math.round(vatAmount * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        currency: "SAR",
        notes: `Split-award PO for ${allocatedItems.length} allocated item(s) from CS ${currentCs.csNumber}. ${approvalRemarks}`,
      });

      for (const item of allocatedItems) {
        const itemSub = Number(item.unitPrice) * Number(item.quantity);
        const itemVat = itemSub * 0.15;
        const itemTot = itemSub + itemVat;

        await db.insert(purchaseOrderItems).values({
          id: crypto.randomUUID(),
          poId,
          productId: item.productId || null,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          vatRate: 15,
          subtotalAmount: Math.round(itemSub * 100) / 100,
          vatAmount: Math.round(itemVat * 100) / 100,
          totalAmount: Math.round(itemTot * 100) / 100,
        });
      }

      generatedPos.push({
        poId,
        poNumber,
        supplierId,
        supplierName,
        totalAmount: Math.round(totalAmount * 100) / 100,
        itemsCount: allocatedItems.length,
      });
    }

    // Update CS record
    await db
      .update(quotationComparativeStatements)
      .set({
        status: approvalStatus,
        winningQuotationId: null, // multi-award
        remarks: approvalRemarks || `Approved via Split-Award Strategy (${generatedPos.length} POs generated)`,
        updatedAt: new Date(),
      })
      .where(eq(quotationComparativeStatements.id, csId));

    // Update CS items winning flag for all suppliers that received allocations
    await db.update(csItems).set({ isWinningBid: false }).where(eq(csItems.csId, csId));
    if (winningQuotationIds.size > 0) {
      await db
        .update(csItems)
        .set({ isWinningBid: true })
        .where(inArray(csItems.quotationId, Array.from(winningQuotationIds)));
    }
  }

  // ==========================================
  // CASE B: SINGLE-VENDOR AWARD (STANDARD)
  // ==========================================
  else {
    if (!winningQuotationId) {
      throw new Error("Winning quotation ID is required for single-vendor award");
    }

    await db
      .update(quotationComparativeStatements)
      .set({
        status: approvalStatus,
        winningQuotationId,
        remarks: approvalRemarks,
        updatedAt: new Date(),
      })
      .where(eq(quotationComparativeStatements.id, csId));

    await db.update(csItems).set({ isWinningBid: false }).where(eq(csItems.csId, csId));
    await db
      .update(csItems)
      .set({ isWinningBid: true })
      .where(eq(csItems.quotationId, winningQuotationId));

    const winningQuotes = await db
      .select()
      .from(supplierQuotations)
      .where(eq(supplierQuotations.id, winningQuotationId))
      .limit(1);

    if (winningQuotes.length > 0) {
      const winningQuote = winningQuotes[0];
      const supplierRows = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, winningQuote.supplierId))
        .limit(1);
      const supplierObj = supplierRows.length > 0 ? supplierRows[0] : null;

      const quoteItems = await db
        .select()
        .from(supplierQuotationItems)
        .where(eq(supplierQuotationItems.quotationId, winningQuotationId));

      const poId = crypto.randomUUID();
      const { documentNumber: poNumber } = await getNextDocumentNumber(currentCs.tenantId, 'PO');

      await db.insert(purchaseOrders).values({
        id: poId,
        tenantId: currentCs.tenantId,
        poNumber,
        supplierId: winningQuote.supplierId,
        supplierName: supplierObj?.name || "Supplier",
        csId,
        quotationId: winningQuotationId,
        status: "ISSUED",
        issueDate: new Date().toISOString(),
        subtotalAmount: winningQuote.subtotalAmount || 0,
        vatAmount: winningQuote.totalVatAmount || 0,
        totalAmount: winningQuote.totalAmount || 0,
        currency: "SAR",
        notes: `Auto-generated from approved CS ${currentCs.csNumber}. ${approvalRemarks}`,
      });

      for (const item of quoteItems) {
        await db.insert(purchaseOrderItems).values({
          id: crypto.randomUUID(),
          poId,
          productId: item.productId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate || 15,
          subtotalAmount: item.subtotalAmount || item.quantity * item.unitPrice,
          vatAmount: item.vatAmount || 0,
          totalAmount: item.totalAmount || item.quantity * item.unitPrice,
        });
      }

      generatedPos.push({
        poId,
        poNumber,
        supplierId: winningQuote.supplierId,
        supplierName: supplierObj?.name || "Supplier",
        totalAmount: winningQuote.totalAmount || 0,
        itemsCount: quoteItems.length,
      });
    }
  }

  // Refetch updated CS
  const [updatedCs] = await db
    .select()
    .from(quotationComparativeStatements)
    .where(eq(quotationComparativeStatements.id, csId));

  const formatted = await formatSingleCs(updatedCs);

  return {
    success: true,
    data: formatted,
    cs: formatted,
    generatedPurchaseOrders: generatedPos,
  };
}
