/**
 * Enterprise Multi-Criteria Scoring Engine for Purchase Comparative Statements (CS Matrix)
 *
 * Formulas:
 * 1. Financial Score (50% default weight) = (Lowest Offered Price / Supplier Quoted Price) * 100
 * 2. Technical Score (35% default weight) = Verified technical compliance score (0-100)
 * 3. Delivery Score (15% default weight)  = (Fastest Delivery Days / Supplier Delivery Days) * 100
 *
 * Composite Score = (Financial * 0.50) + (Technical * 0.35) + (Delivery * 0.15)
 */

export interface BidInput {
  quotationId: string;
  totalAmount: number;
  deliveryLeadDays: number;
  technicalScore: number;
}

export interface BidScoringResult {
  quotationId: string;
  totalAmount: number;
  deliveryLeadDays: number;
  technicalScore: number;
  financialScore: number;
  deliveryScore: number;
  compositeScore: number;
  rank: number;
  isLowestPrice: boolean;
  isHighestScore: boolean;
}

export interface ScoringWeights {
  financial: number;
  technical: number;
  delivery: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  financial: 0.50,
  technical: 0.35,
  delivery: 0.15,
};

export function computeComparativeScoring(
  bids: BidInput[],
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): BidScoringResult[] {
  if (!bids || bids.length === 0) return [];

  // Determine benchmarks
  const positiveAmounts = bids.map((b) => Number(b.totalAmount)).filter((a) => a > 0);
  const minPrice = positiveAmounts.length > 0 ? Math.min(...positiveAmounts) : 1;

  const positiveDays = bids.map((b) => Number(b.deliveryLeadDays)).filter((d) => d > 0);
  const minLeadDays = positiveDays.length > 0 ? Math.min(...positiveDays) : 1;

  const scored = bids.map((bid) => {
    const price = Number(bid.totalAmount) > 0 ? Number(bid.totalAmount) : 1;
    const financialScore = Math.min(100, Math.max(0, (minPrice / price) * 100));

    const leadDays = Number(bid.deliveryLeadDays) > 0 ? Number(bid.deliveryLeadDays) : 1;
    const deliveryScore = Math.min(100, Math.max(0, (minLeadDays / leadDays) * 100));

    const technicalScore = Math.min(100, Math.max(0, Number(bid.technicalScore || 80)));

    const compositeScore =
      financialScore * weights.financial +
      technicalScore * weights.technical +
      deliveryScore * weights.delivery;

    return {
      quotationId: bid.quotationId,
      totalAmount: Number(bid.totalAmount),
      deliveryLeadDays: leadDays,
      technicalScore: Math.round(technicalScore * 10) / 10,
      financialScore: Math.round(financialScore * 10) / 10,
      deliveryScore: Math.round(deliveryScore * 10) / 10,
      compositeScore: Math.round(compositeScore * 10) / 10,
      rank: 1,
      isLowestPrice: Number(bid.totalAmount) === minPrice,
      isHighestScore: false,
    };
  });

  // Assign ranks based on composite score descending
  scored.sort((a, b) => b.compositeScore - a.compositeScore);
  const highestScore = scored[0]?.compositeScore ?? 0;

  scored.forEach((b, index) => {
    b.rank = index + 1;
    b.isHighestScore = b.compositeScore === highestScore;
  });

  return scored;
}

export interface LineItemBid {
  quotationId: string;
  supplierId: string;
  supplierName: string;
  quotationNumber: string;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
  isLowestPrice: boolean;
}

export interface LineItemMatrixRow {
  key: string;
  productId: string | null;
  productName: string;
  description: string;
  quantity: number;
  lowestUnitPrice: number;
  highestUnitPrice: number;
  lowestSupplierName: string;
  lowestQuotationId: string;
  lowestSupplierId: string;
  variancePercent: number; // ((highest - lowest) / lowest) * 100
  potentialSavings: number; // (highest - lowest) * quantity
  supplierBids: Record<string, LineItemBid>; // keyed by quotationId
}

export interface LineItemMatrixSummary {
  totalItems: number;
  cherryPickTotal: number; // Sum of min(unitPrice) * quantity for each line
  singleSupplierTotals: Record<string, { supplierName: string; total: number }>;
  potentialSavingsVsHighest: number;
  potentialSavingsPercent: number;
}

export interface ComparativeLineItemMatrix {
  rows: LineItemMatrixRow[];
  summary: LineItemMatrixSummary;
}

export function buildLineItemMatrix(
  participatingBids: Array<{
    quotationId: string;
    supplierId: string;
    supplierName: string;
    quotationNumber: string;
  }>,
  rawItems: Array<{
    quotationId: string;
    productId?: string | null;
    productName?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    totalAmount?: number;
  }>
): ComparativeLineItemMatrix {
  const itemMap = new Map<
    string,
    {
      key: string;
      productId: string | null;
      productName: string;
      description: string;
      quantity: number;
      bids: Map<string, {
        quotationId: string;
        supplierId: string;
        supplierName: string;
        quotationNumber: string;
        unitPrice: number;
        quantity: number;
        totalAmount: number;
      }>;
    }
  >();

  for (const item of rawItems) {
    const key =
      item.productId && item.productId.trim() !== ""
        ? `prod_${item.productId}`
        : `desc_${(item.description || "unnamed").trim().toLowerCase()}`;

    const bidMeta = participatingBids.find((b) => b.quotationId === item.quotationId);
    if (!bidMeta) continue;

    if (!itemMap.has(key)) {
      itemMap.set(key, {
        key,
        productId: item.productId || null,
        productName: item.productName || item.description || "Item",
        description: item.description || "Item",
        quantity: Number(item.quantity) || 1,
        bids: new Map(),
      });
    }

    const group = itemMap.get(key)!;
    if (Number(item.quantity) > group.quantity) {
      group.quantity = Number(item.quantity);
    }

    const uPrice = Number(item.unitPrice) || 0;
    const qty = Number(item.quantity) || group.quantity;
    const lineTotal = Number(item.totalAmount) || uPrice * qty;

    group.bids.set(item.quotationId, {
      quotationId: item.quotationId,
      supplierId: bidMeta.supplierId,
      supplierName: bidMeta.supplierName,
      quotationNumber: bidMeta.quotationNumber,
      unitPrice: Math.round(uPrice * 100) / 100,
      quantity: qty,
      totalAmount: Math.round(lineTotal * 100) / 100,
    });
  }

  let cherryPickTotal = 0;
  const singleSupplierTotals: Record<string, { supplierName: string; total: number }> = {};
  for (const bid of participatingBids) {
    singleSupplierTotals[bid.quotationId] = {
      supplierName: bid.supplierName,
      total: 0,
    };
  }

  const rows: LineItemMatrixRow[] = [];

  for (const group of itemMap.values()) {
    const bidsArray = Array.from(group.bids.values());
    if (bidsArray.length === 0) continue;

    const unitPrices = bidsArray.map((b) => b.unitPrice).filter((p) => p > 0);
    const minPrice = unitPrices.length > 0 ? Math.min(...unitPrices) : 0;
    const maxPrice = unitPrices.length > 0 ? Math.max(...unitPrices) : 0;

    const lowestBid = bidsArray.find((b) => b.unitPrice === minPrice);

    const supplierBidsRecord: Record<string, LineItemBid> = {};
    for (const b of bidsArray) {
      supplierBidsRecord[b.quotationId] = {
        ...b,
        isLowestPrice: minPrice > 0 && b.unitPrice === minPrice,
      };

      if (singleSupplierTotals[b.quotationId]) {
        singleSupplierTotals[b.quotationId].total += b.totalAmount;
      }
    }

    const variancePercent =
      minPrice > 0 ? Math.round(((maxPrice - minPrice) / minPrice) * 1000) / 10 : 0;
    const potentialSavings = Math.round((maxPrice - minPrice) * group.quantity * 100) / 100;
    cherryPickTotal += minPrice * group.quantity;

    rows.push({
      key: group.key,
      productId: group.productId,
      productName: group.productName,
      description: group.description,
      quantity: group.quantity,
      lowestUnitPrice: minPrice,
      highestUnitPrice: maxPrice,
      lowestSupplierName: lowestBid?.supplierName || "N/A",
      lowestQuotationId: lowestBid?.quotationId || "",
      lowestSupplierId: lowestBid?.supplierId || "",
      variancePercent,
      potentialSavings,
      supplierBids: supplierBidsRecord,
    });
  }

  const allTotals = Object.values(singleSupplierTotals).map((s) => s.total);
  const highestSupplierTotal = allTotals.length > 0 ? Math.max(...allTotals) : 0;
  const cherryPickRounded = Math.round(cherryPickTotal * 100) / 100;
  const potentialSavingsVsHighest = Math.max(
    0,
    Math.round((highestSupplierTotal - cherryPickRounded) * 100) / 100
  );
  const potentialSavingsPercent =
    highestSupplierTotal > 0
      ? Math.round((potentialSavingsVsHighest / highestSupplierTotal) * 1000) / 10
      : 0;

  return {
    rows,
    summary: {
      totalItems: rows.length,
      cherryPickTotal: cherryPickRounded,
      singleSupplierTotals,
      potentialSavingsVsHighest,
      potentialSavingsPercent,
    },
  };
}

