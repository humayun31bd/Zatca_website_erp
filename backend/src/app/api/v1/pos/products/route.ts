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

    return NextResponse.json(tenantProducts);
  } catch (error: any) {
    console.error("GET Products error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const body = await req.json();
    const parseResult = ProductPayloadSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid payload", details: parseResult.error.format() }, { status: 400 });
    }

    const { categoryId, name, barcode, description, price, costPrice, stockQuantity, minStockLevel, units, branchInventory } = parseResult.data;

    const newProduct = await db.transaction(async (tx) => {
      const [product] = await tx.insert(products).values({
        tenantId: session.tenantId as string,
        categoryId: categoryId || null,
        name,
        barcode: barcode || null,
        description: description || null,
        price: price.toString() as any, // drizzle decimal expects string
        costPrice: costPrice ? costPrice.toString() as any : null,
        stockQuantity,
        minStockLevel,
      }).returning();

      if (units.length > 0) {
        await tx.insert(productUnits).values(
          units.map(u => ({
            tenantId: session.tenantId as string,
            productId: product.id,
            unitCode: u.unitName, // using unitName payload field as unitCode
            conversionFactor: u.conversionFactor as any,
            barcode: u.barcode || null,
            price: u.price ? u.price as any : null,
          }))
        );
      }



      return product;
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    console.error("POST Product error:", error);
    if (error.code === '23505') { 
      return NextResponse.json({ error: "Product with this barcode already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
