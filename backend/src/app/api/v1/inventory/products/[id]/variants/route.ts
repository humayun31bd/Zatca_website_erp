import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { unifiedProducts } from "@/lib/db/product_schema";
import { eq, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession(request);
    if (!session || !session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = session.tenantId as string;
    const parentId = params.id;

    const variants = await db.select().from(unifiedProducts)
      .where(and(
        eq(unifiedProducts.parentProductId, parentId),
        eq(unifiedProducts.tenantId, tenantId)
      ));

    return NextResponse.json(variants);
  } catch (error) {
    console.error("GET Variants error:", error);
    return NextResponse.json({ error: "Failed to fetch variants" }, { status: 500 });
  }
}
