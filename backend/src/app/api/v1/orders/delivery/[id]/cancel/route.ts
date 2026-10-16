import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deliveryOrders, orderStatusLogs, ORDER_STATUS, deliveryDrivers } from "@/lib/db/delivery_orders_schema";
import { eq, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { z } from "zod";

const CancelOrderSchema = z.object({
  reason: z.string().min(1, "Cancellation reason is required"),
  cancelledBy: z.enum(['server', 'customer', 'admin']).default('admin'),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession(req);
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const parseResult = CancelOrderSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Bad Request", details: parseResult.error.format() }, { status: 400 });
    }

    const { reason, cancelledBy } = parseResult.data;

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

    if (order.status === ORDER_STATUS.CANCELLED) {
      return NextResponse.json({ error: "Order is already cancelled" }, { status: 400 });
    }

    const now = new Date();

    await db
      .update(deliveryOrders)
      .set({
        status: ORDER_STATUS.CANCELLED,
        cancelledAt: now,
        cancelReason: reason,
        cancelledBy,
        updatedAt: now,
      })
      .where(
        and(
          eq(deliveryOrders.id, id),
          eq(deliveryOrders.tenantId, session.tenantId as string)
        )
      );

    // If a driver was assigned, release the driver back to available
    if (order.driverId) {
      await db
        .update(deliveryDrivers)
        .set({ isAvailable: true, updatedAt: now })
        .where(
          and(
            eq(deliveryDrivers.id, order.driverId),
            eq(deliveryDrivers.tenantId, session.tenantId as string)
          )
        );
    }

    // Audit Log Entry
    await db.insert(orderStatusLogs).values({
      id: crypto.randomUUID(),
      tenantId: session.tenantId as string,
      orderId: id,
      fromStatus: order.status,
      toStatus: ORDER_STATUS.CANCELLED,
      changedBy: (session.email as string) || (session.userId as string) || 'system',
      actorRole: cancelledBy,
      note: `Order cancelled by ${cancelledBy.toUpperCase()}. Reason: ${reason}`,
      createdAt: now,
    });

    const [updatedOrder] = await db
      .select()
      .from(deliveryOrders)
      .where(eq(deliveryOrders.id, id))
      .limit(1);

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: "Order cancelled successfully",
    });
  } catch (error: any) {
    console.error("Error cancelling order:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
