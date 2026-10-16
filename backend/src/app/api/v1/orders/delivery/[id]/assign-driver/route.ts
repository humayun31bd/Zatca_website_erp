import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deliveryOrders, orderStatusLogs, ORDER_STATUS, deliveryDrivers } from "@/lib/db/delivery_orders_schema";
import { eq, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { z } from "zod";

const AssignDriverSchema = z.object({
  driverId: z.string().optional().nullable(),
  driverName: z.string().min(1, "Driver name is required"),
  driverPhone: z.string().min(1, "Driver phone is required"),
  vehicleInfo: z.string().optional().nullable(),
  aggregatorReference: z.string().optional().nullable(),
  riderTrackingNote: z.string().optional().nullable(),
  autoDispatch: z.boolean().optional().default(true), // Automatically transition to OOW if ready
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
    const parseResult = AssignDriverSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Bad Request", details: parseResult.error.format() }, { status: 400 });
    }

    const { driverId, driverName, driverPhone, vehicleInfo, aggregatorReference, riderTrackingNote, autoDispatch } = parseResult.data;

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
      return NextResponse.json({ error: "Cannot assign driver to a cancelled order" }, { status: 400 });
    }

    const now = new Date();
    const shouldDispatch = autoDispatch && (order.status === ORDER_STATUS.RFD || order.status === ORDER_STATUS.OUP);
    const targetStatus = shouldDispatch ? ORDER_STATUS.OOW : order.status;

    const updateFields: any = {
      driverId: driverId || null,
      driverName,
      driverPhone,
      vehicleInfo: vehicleInfo || null,
      updatedAt: now,
    };

    if (aggregatorReference) {
      updateFields.aggregatorReference = aggregatorReference;
    }

    if (shouldDispatch) {
      updateFields.status = ORDER_STATUS.OOW;
      if (!order.dispatchedAt) updateFields.dispatchedAt = now;
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

    // If a registered driver was selected, mark isAvailable = false temporarily
    if (driverId) {
      await db
        .update(deliveryDrivers)
        .set({ isAvailable: false, updatedAt: now })
        .where(
          and(
            eq(deliveryDrivers.id, driverId),
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
      toStatus: targetStatus,
      changedBy: (session.email as string) || (session.userId as string) || 'system',
      actorRole: 'driver',
      note: `Assigned driver ${driverName} (${driverPhone})${shouldDispatch ? ' and dispatched (OOW)' : ''}${riderTrackingNote ? ` - Note: ${riderTrackingNote}` : ''}`,
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
      message: `Driver ${driverName} assigned successfully`,
    });
  } catch (error: any) {
    console.error("Error assigning driver:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
