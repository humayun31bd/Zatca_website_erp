import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { suppliers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { z } from "zod";

const SupplierUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  vatNumber: z.string().optional().nullable(),
  crNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  bankDetails: z.string().optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supplier = await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.tenantId, session.tenantId as string), eq(suppliers.id, params.id)))
      .limit(1);

    if (supplier.length === 0) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    return NextResponse.json(supplier[0]);
  } catch (error: any) {
    console.error("GET Supplier error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parseResult = SupplierUpdateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid payload", details: parseResult.error.format() }, { status: 400 });
    }

    const updatedSupplier = await db
      .update(suppliers)
      .set({ ...parseResult.data, updatedAt: new Date() })
      .where(and(eq(suppliers.tenantId, session.tenantId as string), eq(suppliers.id, params.id)))
      .returning();

    if (updatedSupplier.length === 0) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    return NextResponse.json(updatedSupplier[0]);
  } catch (error: any) {
    console.error("PUT Supplier error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const deletedSupplier = await db
      .delete(suppliers)
      .where(and(eq(suppliers.tenantId, session.tenantId as string), eq(suppliers.id, params.id)))
      .returning();

    if (deletedSupplier.length === 0) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Supplier error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
