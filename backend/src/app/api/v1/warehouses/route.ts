import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { warehouses } from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/session";
import { eq, desc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const session = await verifySession(request);
    if (!session?.tenantId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const data = await db.query.warehouses.findMany({
      where: eq(warehouses.tenantId, session.tenantId as string),
      orderBy: [desc(warehouses.createdAt)],
    });
    
    return NextResponse.json({ success: true, warehouses: data });
  } catch (error: any) {
    console.error("GET /api/v1/warehouses error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await verifySession(request);
    if (!session?.tenantId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, location, branchId, isActive } = body;

    if (!name || !branchId) {
      return NextResponse.json({ success: false, error: "Name and Branch ID are required" }, { status: 400 });
    }

    const newWarehouse = await db.insert(warehouses).values({
      tenantId: session.tenantId as string,
      branchId,
      name,
      location,
      isActive: isActive !== undefined ? isActive : true,
    }).returning();

    return NextResponse.json({ success: true, warehouse: newWarehouse[0] }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/v1/warehouses error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
