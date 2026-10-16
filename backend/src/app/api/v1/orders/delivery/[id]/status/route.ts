import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deliveryOrders, orderStatusLogs, ORDER_STATUS, deliveryDrivers } from "@/lib/db/delivery_orders_schema";
import { eq, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { z } from "zod";

const UpdateStatusSchema = z.object({
  status: z.enum(['WFC', 'OUP', 'RTS', 'RFT', 'RFD', 'OOW', 'TA', 'Srvd', 'Dlvd', 'CANCELLED']),
  note: z.string().optional().nullable(),
  podNotes: z.string().optional().nullable(),
  actorRole: z.enum(['cashier', 'kitchen', 'driver', 'admin', 'customer']).optional().default('cashier'),
});

export async function PATCH(
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
    const parseResult = UpdateStatusSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Bad Request", details: parseResult.error.format() }, { status: 400 });
    }

    const { status: targetStatus, note, podNotes, actorRole } = parseResult.data;

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
      return NextResponse.json({ error: "Cannot change status of a cancelled order" }, { status: 400 });
    }

    const fromStatus = order.status;
    const now = new Date();

    const updateFields: any = {
      status: targetStatus,
      updatedAt: now,
    };

    // Update operational timestamps depending on target status
    if (targetStatus === ORDER_STATUS.OUP && !order.cookingStartedAt) {
      updateFields.cookingStartedAt = now;
      if (!order.confirmedAt) updateFields.confirmedAt = now;
    } else if (
      (targetStatus === ORDER_STATUS.RTS || targetStatus === ORDER_STATUS.RFT || targetStatus === ORDER_STATUS.RFD) &&
      !order.readyAt
    ) {
      updateFields.readyAt = now;
    } else if (targetStatus === ORDER_STATUS.OOW && !order.dispatchedAt) {
      updateFields.dispatchedAt = now;
    } else if (
      (targetStatus === ORDER_STATUS.Dlvd || targetStatus === ORDER_STATUS.TA || targetStatus === ORDER_STATUS.Srvd) &&
      !order.deliveredAt
    ) {
      updateFields.deliveredAt = now;
    } else if (targetStatus === ORDER_STATUS.CANCELLED && !order.cancelledAt) {
      updateFields.cancelledAt = now;
    }

    await db
      .update(deliveryOrders)
      .set(updateFields)
      .where(
        and(
          eq(deliveryOrders.id, id),
          eq(deliveryOrders.tenantId, session.tenantId as string)
        )
      );

    // Free driver if order reached terminal state
    if (order.driverId && (targetStatus === ORDER_STATUS.Dlvd || targetStatus === ORDER_STATUS.TA || targetStatus === ORDER_STATUS.Srvd || targetStatus === ORDER_STATUS.CANCELLED)) {
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
    const logId = crypto.randomUUID();
    const finalNote = podNotes 
      ? `Proof of Delivery: ${podNotes}${note ? ` (${note})` : ''}` 
      : (note || `Status transitioned from ${fromStatus} to ${targetStatus}`);

    await db.insert(orderStatusLogs).values({
      id: logId,
      tenantId: session.tenantId as string,
      orderId: id,
      fromStatus: fromStatus,
      toStatus: targetStatus,
      changedBy: (session.email as string) || (session.userId as string) || 'system',
      actorRole: actorRole || 'cashier',
      note: finalNote,
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
      transition: {
        from: fromStatus,
        to: targetStatus,
        at: now,
      },
    });
  } catch (error: any) {
    console.error("Error updating order status:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
