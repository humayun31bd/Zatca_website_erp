import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productUnits } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { z } from "zod";

const ProductPayloadSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1),
  barcode: z.string().optional(),
  description: z.string().optional(),
  price: z.number().min(0),
  costPrice: z.number().min(0).optional(),
  discountAmount: z.number().min(0).optional().default(0),
  stockQuantity: z.number().int().min(0).optional().default(0),
  minStockLevel: z.number().int().min(0).optional().default(5),
  units: z.array(z.object({
    unitName: z.string(),
    conversionFactor: z.string(),
    barcode: z.string().optional(),
    price: z.string().optional(),
  })).optional().default([]),
  branchInventory: z.array(z.object({
    branchId: z.string().uuid(),
    stockQuantity: z.number().int(),
    minStockLevel: z.number().int(),
    shelfLocation: z.string().optional(),
  })).optional().default([]),
});

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantProducts = await db.query.products.findMany({
      where: eq(products.tenantId, session.tenantId as string),
      orderBy: [desc(products.createdAt)],
      with: {
        units: true,
      },
    });

    const mapped = tenantProducts.map(p => ({
      ...p,
      productName: p.productName || p.name,
      name: p.name || p.productName,
      baseSellingPrice: p.baseSellingPrice ?? p.price,
      price: p.price ?? p.baseSellingPrice,
      sku: p.sku || p.barcode,
      stockQuantity: p.stockQuantity ?? p.stockInHand,
      stockInHand: p.stockInHand ?? p.stockQuantity,
      minStockLevel: p.minStockLevel ?? p.minOrderQty,
      minOrderQty: p.minOrderQty ?? p.minStockLevel,
    }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    console.error("GET Products error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const body = await req.json();
    const productName = body.productName || body.name;

    if (!productName) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    const price = body.baseSellingPrice ?? body.price ?? 0;
    const units = body.units || [];

    const newProduct = await db.transaction(async (tx) => {
      const [product] = await tx.insert(products).values({
        tenantId: session.tenantId as string,
        name: productName,
        productName: productName,
        price: price,
        baseSellingPrice: price,
        costPrice: body.costPrice,
        sku: body.sku || body.barcode,
        barcode: body.barcode || body.sku,
        description: body.description || null,
        categoryId: body.categoryId || null,
        brandId: body.brandId || null,
        productTypeId: body.productTypeId || null,
        unitId: body.unitId || null,
        sizeId: body.sizeId || null,
        colorId: body.colorId || null,
        taxCategoryId: body.taxCategoryId || null,
        discountAmount: body.discountAmount ?? 0,
        stockQuantity: body.stockQuantity ?? body.stockInHand ?? 0,
        stockInHand: body.stockInHand ?? body.stockQuantity ?? 0,
        minStockLevel: body.minStockLevel ?? body.minOrderQty ?? 5,
        minOrderQty: body.minOrderQty ?? body.minStockLevel ?? 0,
        isElectronics: body.isElectronics ?? false,
        isPharmacy: body.isPharmacy ?? false,
        isApparel: body.isApparel ?? false,
        isMedicine: body.isMedicine ?? false,
        isProductDisplayPosApp: body.isProductDisplayPosApp ?? true,
      }).returning();

      if (units.length > 0) {
        await tx.insert(productUnits).values(
          units.map((u: any) => ({
            tenantId: session.tenantId as string,
            productId: product.id,
            unitCode: u.unitName || u.unitCode,
            conversionFactor: u.conversionFactor as any,
            barcode: u.barcode || null,
            price: u.price ? u.price as any : null,
          }))
        );
      }

      return product;
    });

    return NextResponse.json({
      ...newProduct,
      productName: newProduct.productName || newProduct.name,
      baseSellingPrice: newProduct.baseSellingPrice ?? newProduct.price,
      sku: newProduct.sku || newProduct.barcode,
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST Product error:", error);
    if (error.code === '23505') { 
      return NextResponse.json({ error: "Product with this barcode already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
