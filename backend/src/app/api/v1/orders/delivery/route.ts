import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deliveryOrders, orderStatusLogs, ORDER_STATUS } from "@/lib/db/delivery_orders_schema";
import { eq, and, desc, like, or, inArray } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { z } from "zod";

const CreateDeliveryOrderSchema = z.object({
  orderType: z.enum(['dine_in', 'take_away', 'delivery', 'third_party_delivery']).default('take_away'),
  channel: z.enum(['pos', 'online', 'third_party']).default('pos'),
  status: z.enum(['WFC', 'OUP', 'RTS', 'RFT', 'RFD', 'OOW', 'TA', 'Srvd', 'Dlvd', 'CANCELLED']).optional().default('WFC'),
  aggregator: z.string().optional().nullable(),
  aggregatorReference: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  deliveryAddress: z.string().optional().nullable(),
  deliveryLatitude: z.number().optional().nullable(),
  deliveryLongitude: z.number().optional().nullable(),
  tableNumber: z.string().optional().nullable(),
  driverId: z.string().optional().nullable(),
  driverName: z.string().optional().nullable(),
  driverPhone: z.string().optional().nullable(),
  vehicleInfo: z.string().optional().nullable(),
  deliveryFee: z.number().min(0).optional().default(0),
  subtotal: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  discountAmount: z.number().min(0).default(0),
  totalAmount: z.number().min(0).default(0),
  items: z.array(z.any()).min(1, "At least one item is required"),
  note: z.string().optional().nullable(),
  estimatedTimeMinutes: z.number().int().min(1).optional().default(30),
  invoiceId: z.string().optional().nullable(),
});

// Helper to generate unique order number: ORD-YYYYMMDD-XXXX
function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${rand}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    const channelParam = searchParams.get('channel');
    const orderTypeParam = searchParams.get('orderType');
    const searchParam = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    const conditions = [eq(deliveryOrders.tenantId, session.tenantId as string)];

    if (statusParam) {
      const statuses = statusParam.split(',').map(s => s.trim());
      if (statuses.length === 1) {
        conditions.push(eq(deliveryOrders.status, statuses[0]));
      } else if (statuses.length > 1) {
        conditions.push(inArray(deliveryOrders.status, statuses));
      }
    }

    if (channelParam) {
      conditions.push(eq(deliveryOrders.channel, channelParam));
    }

    if (orderTypeParam) {
      conditions.push(eq(deliveryOrders.orderType, orderTypeParam));
    }

    if (searchParam) {
      const searchPattern = `%${searchParam}%`;
      conditions.push(
        or(
          like(deliveryOrders.orderNumber, searchPattern),
          like(deliveryOrders.customerName, searchPattern),
          like(deliveryOrders.customerPhone, searchPattern),
          like(deliveryOrders.aggregatorReference, searchPattern)
        )!
      );
    }

    const orders = await db
      .select()
      .from(deliveryOrders)
      .where(and(...conditions))
      .orderBy(desc(deliveryOrders.createdAt))
      .limit(limit);

    return NextResponse.json({
      success: true,
      orders,
      data: orders,
      count: orders.length,
    });
  } catch (error: any) {
    console.error("Error fetching delivery orders:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parseResult = CreateDeliveryOrderSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Bad Request", details: parseResult.error.format() }, { status: 400 });
    }

    const data = parseResult.data;
    const orderId = crypto.randomUUID();
    const orderNumber = generateOrderNumber();
    const initialStatus = data.status || ORDER_STATUS.WFC;
    const now = new Date();

    const newOrder = {
      id: orderId,
      tenantId: session.tenantId as string,
      orderNumber,
      invoiceId: data.invoiceId || null,
      orderType: data.orderType,
      channel: data.channel,
      status: initialStatus,
      aggregator: data.aggregator || null,
      aggregatorReference: data.aggregatorReference || null,
      customerName: data.customerName || null,
      customerPhone: data.customerPhone || null,
      deliveryAddress: data.deliveryAddress || null,
      deliveryLatitude: data.deliveryLatitude || null,
      deliveryLongitude: data.deliveryLongitude || null,
      tableNumber: data.tableNumber || null,
      driverId: data.driverId || null,
      driverName: data.driverName || null,
      driverPhone: data.driverPhone || null,
      vehicleInfo: data.vehicleInfo || null,
      deliveryFee: data.deliveryFee,
      subtotal: data.subtotal,
      taxAmount: data.taxAmount,
      discountAmount: data.discountAmount,
      totalAmount: data.totalAmount,
      items: data.items,
      note: data.note || null,
      estimatedTimeMinutes: data.estimatedTimeMinutes,
      confirmedAt: initialStatus !== ORDER_STATUS.WFC ? now : null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(deliveryOrders).values(newOrder);

    // Initial audit status log
    await db.insert(orderStatusLogs).values({
      id: crypto.randomUUID(),
      tenantId: session.tenantId as string,
      orderId: orderId,
      fromStatus: null,
      toStatus: initialStatus,
      changedBy: (session.email as string) || (session.userId as string) || 'system',
      actorRole: 'cashier',
      note: `Order created via ${data.channel.toUpperCase()}`,
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      order: newOrder,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating delivery order:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
