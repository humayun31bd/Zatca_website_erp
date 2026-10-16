import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vouchers, syncQueue } from "@/lib/db/accounting_schema";
import { verifySession } from "@/lib/auth/session";
import { eq, and } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession(req);
    const voucherId = params.id;

    // Fetch existing voucher
    const existing = db
      .select()
      .from(vouchers)
      .where(eq(vouchers.id, voucherId))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "Voucher not found." }, { status: 404 });
    }

    if (existing.status !== "DRAFT" && existing.status !== "REJECTED") {
      return NextResponse.json(
        { error: `Cannot submit voucher with status '${existing.status}'. Must be DRAFT or REJECTED.` },
        { status: 400 }
      );
    }

    const updated = db.transaction((tx) => {
      const v = tx
        .update(vouchers)
        .set({
          status: "SUBMITTED",
          syncStatus: "PENDING",
          updatedAt: new Date(),
        })
        .where(eq(vouchers.id, voucherId))
        .returning()
        .get();

      tx.insert(syncQueue)
        .values({
          tenantId: existing.tenantId,
          entityType: "VOUCHER",
          entityId: voucherId,
          action: "UPDATE",
          payload: JSON.stringify({ voucherId, status: "SUBMITTED" }),
          status: "PENDING",
        })
        .run();

      return v;
    });

    return NextResponse.json({ success: true, voucher: updated });
  } catch (error: any) {
    console.error("POST Submit Voucher Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
