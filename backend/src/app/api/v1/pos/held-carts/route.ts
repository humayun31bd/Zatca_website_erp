import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { heldCarts } from "@/lib/db/pos_schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const session = await verifySession(request);
    if (!session || !session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = session.tenantId as string;

    const carts = await db.select().from(heldCarts)
      .where(eq(heldCarts.tenantId, tenantId))
      .orderBy(desc(heldCarts.createdAt));

    return NextResponse.json(carts);
  } catch (error) {
    console.error("GET Held Carts error:", error);
    return NextResponse.json({ error: "Failed to fetch held carts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession(request);
    if (!session || !session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = session.tenantId as string;
    const userId = session.userId as string;

    const body = await request.json();
    const customerData = body.customerData || body.customer || null;
    const customerName = body.customerName || (customerData ? customerData.name : null);
    const discount = typeof body.discount === 'number' ? body.discount : (parseFloat(body.discount) || 0);
    const totalAmount = typeof body.totalAmount === 'number' ? body.totalAmount : (parseFloat(body.totalAmount) || 0);
    const items = body.items || [];

    const [newCart] = await db.insert(heldCarts).values({
      tenantId,
      cashierId: userId,
      customerName,
      customerData,
      discount,
      deliveryType: body.deliveryType || 'take_away',
      totalAmount,
      note: body.note || null,
      items,
    }).returning();

    return NextResponse.json(newCart, { status: 201 });
  } catch (error) {
    console.error("POST Held Cart error:", error);
    return NextResponse.json({ error: "Failed to hold cart" }, { status: 500 });
  }
}
