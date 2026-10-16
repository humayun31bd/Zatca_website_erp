import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { branches, counters, warehouses, branchInventory, invoices } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const branchId = params.id;

    const [updatedBranch] = await db
      .update(branches)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(and(eq(branches.id, branchId), eq(branches.tenantId, session.tenantId as string)))
      .returning();

    if (!updatedBranch) {
      return NextResponse.json({ error: "Branch not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, branch: updatedBranch });
  } catch (error: any) {
    console.error("PUT Branch Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const branchId = params.id;
    const tenantId = session.tenantId as string;

    // Check relations
    const relatedCounters = await db.select().from(counters).where(and(eq(counters.branchId, branchId), eq(counters.tenantId, tenantId))).limit(1);
    const relatedWarehouses = await db.select().from(warehouses).where(and(eq(warehouses.branchId, branchId), eq(warehouses.tenantId, tenantId))).limit(1);
    const relatedInventory = await db.select().from(branchInventory).where(and(eq(branchInventory.branchId, branchId), eq(branchInventory.tenantId, tenantId))).limit(1);
    const relatedInvoices = await db.select().from(invoices).where(and(eq(invoices.branchId, branchId), eq(invoices.tenantId, tenantId))).limit(1);

    if (relatedCounters.length > 0 || relatedWarehouses.length > 0 || relatedInventory.length > 0 || relatedInvoices.length > 0) {
      return NextResponse.json({ success: false, error: "Cannot delete this branch because it contains related data (Counters, Warehouses, Inventory, or Invoices)." }, { status: 400 });
    }

    const [deletedBranch] = await db
      .delete(branches)
      .where(and(eq(branches.id, branchId), eq(branches.tenantId, tenantId)))
      .returning();

    if (!deletedBranch) {
      return NextResponse.json({ success: false, error: "Branch not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Branch deleted successfully" });
  } catch (error: any) {
    console.error("DELETE Branch Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
