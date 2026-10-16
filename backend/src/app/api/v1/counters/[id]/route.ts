import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { counters, counterSessions, invoices } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const counterId = params.id;

    const [updatedCounter] = await db
      .update(counters)
      .set({
        ...body,
      })
      .where(and(eq(counters.id, counterId), eq(counters.tenantId, session.tenantId as string)))
      .returning();

    if (!updatedCounter) {
      return NextResponse.json({ error: "Counter not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, counter: updatedCounter });
  } catch (error: any) {
    console.error("PUT Counter Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const counterId = params.id;
    const tenantId = session.tenantId as string;

    // Check relations
    const relatedSessions = await db.select().from(counterSessions).where(and(eq(counterSessions.counterId, counterId), eq(counterSessions.tenantId, tenantId))).limit(1);
    const relatedInvoices = await db.select().from(invoices).where(and(eq(invoices.counterId, counterId), eq(invoices.tenantId, tenantId))).limit(1);

    if (relatedSessions.length > 0 || relatedInvoices.length > 0) {
      return NextResponse.json({ success: false, error: "Cannot delete this counter because it contains related data (Sessions or Invoices)." }, { status: 400 });
    }

    const [deletedCounter] = await db
      .delete(counters)
      .where(and(eq(counters.id, counterId), eq(counters.tenantId, tenantId)))
      .returning();

    if (!deletedCounter) {
      return NextResponse.json({ success: false, error: "Counter not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Counter deleted successfully" });
  } catch (error: any) {
    console.error("DELETE Counter Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
