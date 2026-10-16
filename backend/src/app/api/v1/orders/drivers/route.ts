import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deliveryDrivers } from "@/lib/db/delivery_orders_schema";
import { eq, and, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { z } from "zod";

const CreateDriverSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone number is required"),
  vehicleType: z.enum(['bike', 'car', 'van']).optional().default('bike'),
  vehiclePlate: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  isAvailable: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const availableOnly = searchParams.get('availableOnly') === 'true';

    const conditions = [
      eq(deliveryDrivers.tenantId, session.tenantId as string),
      eq(deliveryDrivers.isActive, true),
    ];

    if (availableOnly) {
      conditions.push(eq(deliveryDrivers.isAvailable, true));
    }

    const drivers = await db
      .select()
      .from(deliveryDrivers)
      .where(and(...conditions))
      .orderBy(desc(deliveryDrivers.createdAt));

    return NextResponse.json({
      success: true,
      drivers,
      count: drivers.length,
    });
  } catch (error: any) {
    console.error("Error fetching delivery drivers:", error);
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
    const parseResult = CreateDriverSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Bad Request", details: parseResult.error.format() }, { status: 400 });
    }

    const data = parseResult.data;
    const now = new Date();
    const driverId = crypto.randomUUID();

    const newDriver = {
      id: driverId,
      tenantId: session.tenantId as string,
      name: data.name,
      phone: data.phone,
      vehicleType: data.vehicleType,
      vehiclePlate: data.vehiclePlate || null,
      isActive: data.isActive,
      isAvailable: data.isAvailable,
      currentLatitude: null,
      currentLongitude: null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(deliveryDrivers).values(newDriver);

    return NextResponse.json({
      success: true,
      driver: newDriver,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating delivery driver:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
