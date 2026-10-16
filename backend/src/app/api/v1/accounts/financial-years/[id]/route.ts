import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { financialYears, financialPeriods } from "@/lib/db/accounting_schema";
import { verifySession } from "@/lib/auth/session";
import { eq, and } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.headers.get("x-tenant-id") || "tenant-grocery-01";
    const yearId = params.id;
    const body = await req.json();

    const { name, isActive, isClosed } = body;

    const updatePayload: any = { updatedAt: new Date() };
    if (name !== undefined) updatePayload.name = name;
    if (isActive !== undefined) updatePayload.isActive = Boolean(isActive);
    if (isClosed !== undefined) updatePayload.isClosed = Boolean(isClosed);

    const [updated] = await db
      .update(financialYears)
      .set(updatePayload)
      .where(and(eq(financialYears.id, yearId), eq(financialYears.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Financial Year not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Financial Year '${updated.name}' updated successfully.`,
      financialYear: updated,
    });
  } catch (error: any) {
    console.error("Update Financial Year Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.headers.get("x-tenant-id") || "tenant-grocery-01";
    const yearId = params.id;

    // Delete associated periods first
    await db.delete(financialPeriods).where(eq(financialPeriods.financialYearId, yearId));
    await db.delete(financialYears).where(and(eq(financialYears.id, yearId), eq(financialYears.tenantId, tenantId)));

    return NextResponse.json({
      success: true,
      message: "Financial Year deleted successfully.",
    });
  } catch (error: any) {
    console.error("Delete Financial Year Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
