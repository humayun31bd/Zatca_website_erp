import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { suppliers } from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/session";
import { z } from "zod";

const SupplierItemSchema = z.object({
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

const BulkSupplierSchema = z.array(SupplierItemSchema);

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const items = Array.isArray(body) ? body : body.items;

    const parseResult = BulkSupplierSchema.safeParse(items);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid payload", details: parseResult.error.format() }, { status: 400 });
    }

    const insertedSuppliers = [];
    for (const item of parseResult.data) {
      const [newSup] = await db.insert(suppliers).values({
        tenantId: session.tenantId as string,
        name: item.name,
        vatNumber: item.vatNumber || null,
        crNumber: item.crNumber || null,
        address: item.address || null,
        email: item.email || null,
        phoneNumber: item.phoneNumber || null,
        bankDetails: item.bankDetails || null,
        category: item.category || 'MERCHANDISE',
        supplierTier: item.supplierTier || 'TIER_2_STANDARD',
        paymentTerms: item.paymentTerms || 'NET_30',
      }).returning();
      insertedSuppliers.push(newSup);
    }

    return NextResponse.json({
      success: true,
      count: insertedSuppliers.length,
      suppliers: insertedSuppliers,
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST Bulk Suppliers error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
