import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { unifiedProducts } from "@/lib/db/product_schema";
import { eq, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession(request);
    if (!session || !session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = session.tenantId as string;
    const parentId = params.id;

    const parentProduct = await db.query.unifiedProducts.findFirst({
      where: and(eq(unifiedProducts.id, parentId), eq(unifiedProducts.tenantId, tenantId))
    });

    if (!parentProduct) return NextResponse.json({ error: "Parent product not found" }, { status: 404 });

    const body = await request.json();
    const { colorIds = [], sizeIds = [] } = body;

    // Generate cartesian product of variants
    const newVariants = [];
    
    // We will generate combinations of color and size. If one is empty, we just iterate the other.
    const colors = colorIds.length > 0 ? colorIds : [null];
    const sizes = sizeIds.length > 0 ? sizeIds : [null];

    let variantCounter = 1;

    for (const colorId of colors) {
      for (const sizeId of sizes) {
        if (!colorId && !sizeId) continue; // Skip if both are null, that's just the parent

        // Create a unique SKU for the variant
        const variantSku = `${parentProduct.sku}-V${variantCounter}`;

        // Create the variant object, copying base attributes from parent
        const variant = {
          ...parentProduct,
          id: undefined, // Let DB generate new ID
          sku: variantSku,
          parentProductId: parentId,
          colorId: colorId,
          sizeId: sizeId,
          createdAt: undefined,
          updatedAt: undefined,
          barcode: null, // Barcode must be unique or null, let user set it later
        };

        newVariants.push(variant);
        variantCounter++;
      }
    }

    if (newVariants.length === 0) {
      return NextResponse.json({ error: "No variants to generate" }, { status: 400 });
    }

    const insertedVariants = await db.insert(unifiedProducts).values(newVariants).returning();

    return NextResponse.json({ 
      success: true, 
      message: `Generated ${insertedVariants.length} variants`, 
      variants: insertedVariants 
    }, { status: 201 });

  } catch (error) {
    console.error("POST Generate Variants error:", error);
    return NextResponse.json({ error: "Failed to generate variants" }, { status: 500 });
  }
}
