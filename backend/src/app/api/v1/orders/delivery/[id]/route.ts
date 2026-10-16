import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deliveryOrders, orderStatusLogs } from "@/lib/db/delivery_orders_schema";
import { eq, and, asc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession(req);
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const [order] = await db
      .select()
      .from(deliveryOrders)
      .where(
        and(
          eq(deliveryOrders.id, id),
          eq(deliveryOrders.tenantId, session.tenantId as string)
        )
      )
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const logs = await db
      .select()
      .from(orderStatusLogs)
      .where(
        and(
          eq(orderStatusLogs.orderId, id),
          eq(orderStatusLogs.tenantId, session.tenantId as string)
        )
      )
      .orderBy(asc(orderStatusLogs.createdAt));

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        statusLogs: logs,
      },
    });
  } catch (error: any) {
    console.error("Error fetching delivery order details:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
