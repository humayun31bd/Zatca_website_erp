import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  quotationComparativeStatements,
  csItems,
  supplierQuotations,
  supplierQuotationItems,
  suppliers,
  purchaseOrders,
  purchaseOrderItems,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { computeComparativeScoring } from "@/lib/procurement/cs_scoring";
import { formatSingleCs, parseDateIso, approveComparativeStatementService } from "@/lib/procurement/cs_service";
import { getNextDocumentNumber } from "@/lib/procurement/document_sequences";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId =
      session?.tenantId ||
      req.nextUrl.searchParams.get("tenantId") ||
      "336eaf82-a524-4b0a-9326-7197b1e5459e";

    const statements = await db
      .select()
      .from(quotationComparativeStatements)
      .where(eq(quotationComparativeStatements.tenantId, tenantId))
      .orderBy(desc(quotationComparativeStatements.createdAt));

    const result = [];
    for (const cs of statements) {
      const formatted = await formatSingleCs(cs);
      result.push(formatted);
    }

    return NextResponse.json({
      success: true,
      csStatements: result,
      data: result,
    });
  } catch (error: any) {
    console.error("GET Comparative Statements Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch CS list" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId =
      session?.tenantId ||
      req.nextUrl.searchParams.get("tenantId") ||
      "336eaf82-a524-4b0a-9326-7197b1e5459e";

    const body = await req.json().catch(() => ({}));
    const { title, status = "DRAFT", remarks, notes } = body;

    let quotationIds: string[] = [];
    if (Array.isArray(body.quotationIds) && body.quotationIds.length > 0) {
      quotationIds = body.quotationIds.filter(Boolean);
    } else if (Array.isArray(body.items) && body.items.length > 0) {
      quotationIds = body.items.map((i: any) => i.quotationId || i.id).filter(Boolean);
    }

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Comparative statement evaluation title is required" },
        { status: 400 }
      );
    }

    if (quotationIds.length < 2) {
      return NextResponse.json(
        { error: "Comparative statement requires at least 2 supplier quotations for comparison" },
        { status: 400 }
      );
    }

    const { documentNumber: csNumber } = await getNextDocumentNumber(tenantId, 'CS');
    const csId = crypto.randomUUID();

    const [newCs] = await db
      .insert(quotationComparativeStatements)
      .values({
        id: csId,
        tenantId,
        csNumber,
        title: title.trim(),
        status: status || "DRAFT",
        remarks: remarks || notes || "",
      })
      .returning();

    // Fetch quotation details
    const fetchedQuotes = [];
    for (const qId of quotationIds) {
      const quotes = await db
        .select()
        .from(supplierQuotations)
        .where(eq(supplierQuotations.id, qId))
        .limit(1);
      if (quotes.length > 0) {
        fetchedQuotes.push(quotes[0]);
      }
    }

    // Step 1: Calculate Multi-Criteria Weighted Scoring
    const bidInputs = fetchedQuotes.map((q) => {
      const matchingItem = Array.isArray(body.items)
        ? body.items.find((i: any) => (i.quotationId || i.id) === q.id)
        : null;
      const rawLead = matchingItem?.deliveryLeadDays ?? matchingItem?.leadDays;
      const rawScore = matchingItem?.technicalScore ?? matchingItem?.score;

      return {
        quotationId: q.id,
        totalAmount: Number(q.totalAmount ?? 0),
        deliveryLeadDays: rawLead ? Number(rawLead) : 7,
        technicalScore: rawScore ? Number(rawScore) : 80,
      };
    });

    const scoringResults = computeComparativeScoring(bidInputs);

    for (const scoreResult of scoringResults) {
      await db.insert(csItems).values({
        id: crypto.randomUUID(),
        csId: newCs.id,
        quotationId: scoreResult.quotationId,
        isWinningBid: scoreResult.isHighestScore, // Automatically highlight highest composite score as default recommendation
        score: scoreResult.compositeScore,
        financialScore: scoreResult.financialScore,
        deliveryScore: scoreResult.deliveryScore,
        technicalScore: scoreResult.technicalScore,
        compositeScore: scoreResult.compositeScore,
        deliveryLeadDays: scoreResult.deliveryLeadDays,
        rank: scoreResult.rank,
        isLowestPrice: scoreResult.isLowestPrice,
        isHighestScore: scoreResult.isHighestScore,
      });
    }

    const formatted = await formatSingleCs(newCs);

    return NextResponse.json(
      {
        success: true,
        data: formatted,
        cs: formatted,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST CS Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create CS" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const body = await req.json().catch(() => ({}));
    const csId = body.csId || req.nextUrl.searchParams.get("csId");
    const status = body.status || "APPROVED";
    const awardMode = body.awardMode || (body.splitAllocations && body.splitAllocations.length > 0 ? "SPLIT" : "SINGLE");
    const winningQuotationId = body.winningQuotationId || body.winnerQuotationId || null;
    const splitAllocations = body.splitAllocations;
    const remarks = body.remarks || body.notes || "";

    if (!csId) {
      return NextResponse.json({ error: "CS ID is required" }, { status: 400 });
    }

    const result = await approveComparativeStatementService({
      csId,
      status,
      awardMode,
      winningQuotationId,
      splitAllocations,
      remarks,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("PUT CS Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update CS" }, { status: 500 });
  }
}
