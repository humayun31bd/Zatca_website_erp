import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productImages } from "@/lib/db/product_schema";
import { eq, and, asc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession(request);
    if (!session || !session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = session.tenantId as string;

    const images = await db.select().from(productImages)
      .where(and(eq(productImages.productId, params.id), eq(productImages.tenantId, tenantId)))
      .orderBy(asc(productImages.displayOrder));

    return NextResponse.json(images);
  } catch (error: any) {
    console.error("GET Product Images error:", error);
    return NextResponse.json({ error: "Failed to fetch images", details: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession(request);
    if (!session || !session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = session.tenantId as string;

    const body = await request.json();
    const imagesToInsert = Array.isArray(body) ? body : [body];

    if (imagesToInsert.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const created = [];
    for (const img of imagesToInsert) {
      if (!img.imageUrl) continue;
      const [inserted] = await db.insert(productImages).values({
        tenantId,
        productId: params.id,
        colorId: img.colorId || null,
        sizeId: img.sizeId || null,
        imageUrl: img.imageUrl,
        isPrimary: img.isPrimary ?? false,
        displayOrder: img.displayOrder ?? 0,
      }).returning();
      created.push(inserted);
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("POST Product Images error:", error);
    return NextResponse.json({ error: "Failed to create image", details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession(request);
    if (!session || !session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = session.tenantId as string;

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get("imageId");

    if (imageId) {
      await db.delete(productImages)
        .where(and(eq(productImages.id, imageId), eq(productImages.tenantId, tenantId)));
    } else {
      await db.delete(productImages)
        .where(and(eq(productImages.productId, params.id), eq(productImages.tenantId, tenantId)));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Product Images error:", error);
    return NextResponse.json({ error: "Failed to delete image", details: error.message }, { status: 500 });
  }
}
