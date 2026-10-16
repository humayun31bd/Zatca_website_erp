import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { heldCarts } from "@/lib/db/pos_schema";
import { eq, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession(request);
    if (!session || !session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = session.tenantId as string;

    const [deletedCart] = await db.delete(heldCarts)
      .where(and(eq(heldCarts.id, params.id), eq(heldCarts.tenantId, tenantId)))
      .returning();

    if (!deletedCart) return NextResponse.json({ error: "Cart not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Held Cart error:", error);
    return NextResponse.json({ error: "Failed to delete held cart" }, { status: 500 });
  }
}
