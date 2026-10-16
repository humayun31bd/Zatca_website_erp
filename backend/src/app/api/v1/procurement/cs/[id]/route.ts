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
import { eq } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { formatSingleCs, parseDateIso, approveComparativeStatementService } from "@/lib/procurement/cs_service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const statements = await db
      .select()
      .from(quotationComparativeStatements)
      .where(eq(quotationComparativeStatements.id, id))
      .limit(1);

    if (statements.length === 0) {
      return NextResponse.json({ error: "Comparative statement not found" }, { status: 404 });
    }

    const formatted = await formatSingleCs(statements[0]);
    return NextResponse.json({ success: true, data: formatted, cs: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: csId } = await params;
    const body = await req.json().catch(() => ({}));
    const status = body.status || "APPROVED";
    const awardMode = body.awardMode || (body.splitAllocations && body.splitAllocations.length > 0 ? "SPLIT" : "SINGLE");
    const winningQuotationId = body.winningQuotationId || body.winnerQuotationId || null;
    const splitAllocations = body.splitAllocations;
    const remarks = body.remarks || body.notes || "";

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
    console.error("PUT CS [id] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update CS" }, { status: 500 });
  }
}
