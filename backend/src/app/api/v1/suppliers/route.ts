import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { suppliers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { z } from "zod";

const SupplierSchema = z.object({
  name: z.string().min(1),
  vatNumber: z.string().optional().nullable(),
  crNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  bankDetails: z.string().optional().nullable(),
  category: z.string().optional().default('MERCHANDISE'),
  supplierTier: z.string().optional().default('TIER_2_STANDARD'),
  paymentTerms: z.string().optional().default('NET_30'),
});

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId =
      session?.tenantId ||
      req.headers.get("x-tenant-id") ||
      req.nextUrl.searchParams.get("tenantId") ||
      "336eaf82-a524-4b0a-9326-7197b1e5459e";

    const tenantSuppliers = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.tenantId, tenantId))
      .orderBy(desc(suppliers.createdAt));

    return NextResponse.json(tenantSuppliers);
  } catch (error: any) {
    console.error("GET Suppliers error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId =
      session?.tenantId ||
      req.headers.get("x-tenant-id") ||
      req.nextUrl.searchParams.get("tenantId") ||
      "336eaf82-a524-4b0a-9326-7197b1e5459e";

    const body = await req.json();
    const parseResult = SupplierSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid payload", details: parseResult.error.format() }, { status: 400 });
    }

    const newSupplier = await db.insert(suppliers).values({
      tenantId: tenantId,
      ...parseResult.data,
    }).returning();

    return NextResponse.json(newSupplier[0], { status: 201 });
  } catch (error: any) {
    console.error("POST Supplier error:", error);
    if (error.code === '23505') {
      return NextResponse.json({ error: "Supplier with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
