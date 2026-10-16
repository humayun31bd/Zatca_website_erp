import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { costCenters, journalEntryLines } from "@/lib/db/accounting_schema";
import { eq, and, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId as string;
    const searchParams = req.nextUrl.searchParams;
    const sourceType = searchParams.get("sourceType");

    const conditions = [eq(costCenters.tenantId, tenantId)];
    if (sourceType && sourceType !== "ALL") {
      conditions.push(eq(costCenters.sourceType, sourceType));
    }

    const data = await db
      .select()
      .from(costCenters)
      .where(and(...conditions))
      .orderBy(costCenters.code);

    return NextResponse.json({ success: true, costCenters: data });
  } catch (error: any) {
    console.error("GET Cost Centers Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId as string;
    const body = await req.json();

    const { code, name, sourceType = "GENERAL", sourceId = null, category = null, monthlyBudget = 0 } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required for cost center" }, { status: 400 });
    }

    const [created] = await db
      .insert(costCenters)
      .values({
        tenantId,
        code: code || `CC-${Date.now().toString().slice(-4)}`,
        name,
        sourceType,
        sourceId,
        category: category || sourceType,
        monthlyBudget: parseFloat(monthlyBudget) || 0,
        isActive: true,
      })
      .returning();

    return NextResponse.json({ success: true, costCenter: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST Cost Center Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId as string;
    const body = await req.json();
    const { id, code, name, sourceType, sourceId, category, monthlyBudget, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "Cost center ID is required" }, { status: 400 });
    }

    const [updated] = await db
      .update(costCenters)
      .set({
        code: code !== undefined ? code : undefined,
        name: name !== undefined ? name : undefined,
        sourceType: sourceType !== undefined ? sourceType : undefined,
        sourceId: sourceId !== undefined ? sourceId : undefined,
        category: category !== undefined ? category : undefined,
        monthlyBudget: monthlyBudget !== undefined ? parseFloat(monthlyBudget) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(costCenters.id, id), eq(costCenters.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Cost center not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, costCenter: updated });
  } catch (error: any) {
    console.error("PUT Cost Center Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId as string;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Cost center ID is required" }, { status: 400 });
    }

    // Check if used in journal entries
    const used = await db
      .select({ id: journalEntryLines.id })
      .from(journalEntryLines)
      .where(eq(journalEntryLines.costCenterId, id))
      .limit(1);

    if (used.length > 0) {
      return NextResponse.json({
        error: "This cost center cannot be deleted because it is already used in journal transactions. You can set it to Inactive instead."
      }, { status: 400 });
    }

    await db
      .delete(costCenters)
      .where(and(eq(costCenters.id, id), eq(costCenters.tenantId, tenantId)));

    return NextResponse.json({ success: true, message: "Cost center deleted successfully" });
  } catch (error: any) {
    console.error("DELETE Cost Center Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
