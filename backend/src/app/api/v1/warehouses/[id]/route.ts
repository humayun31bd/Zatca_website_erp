import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { warehouses } from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/session";
import { eq, and } from "drizzle-orm";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(request);
    if (!session?.tenantId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, location, branchId, isActive } = body;

    const updatedWarehouse = await db.update(warehouses)
      .set({
        name,
        location,
        branchId,
        isActive,
        updatedAt: new Date(),
      })
      .where(and(
        eq(warehouses.id, params.id),
        eq(warehouses.tenantId, session.tenantId as string)
      ))
      .returning();

    if (!updatedWarehouse.length) {
      return NextResponse.json({ success: false, error: "Warehouse not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, warehouse: updatedWarehouse[0] });
  } catch (error: any) {
    console.error("PUT /api/v1/warehouses/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(request);
    if (!session?.tenantId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const deletedWarehouse = await db.delete(warehouses)
      .where(and(
        eq(warehouses.id, params.id),
        eq(warehouses.tenantId, session.tenantId as string)
      ))
      .returning();

    if (!deletedWarehouse.length) {
      return NextResponse.json({ success: false, error: "Warehouse not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted: true });
  } catch (error: any) {
    console.error("DELETE /api/v1/warehouses/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
