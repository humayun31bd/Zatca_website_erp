import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vouchers, syncQueue } from "@/lib/db/accounting_schema";
import { verifySession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession(req);
    const checkerId = session?.userId || req.headers.get("x-user-id") || "checker-user-2";
    const voucherId = params.id;

    const existing = db
      .select()
      .from(vouchers)
      .where(eq(vouchers.id, voucherId))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "Voucher not found." }, { status: 404 });
    }

    if (existing.status !== "SUBMITTED") {
      return NextResponse.json(
        { error: `Cannot check voucher with status '${existing.status}'. Must be SUBMITTED.` },
        { status: 400 }
      );
    }

    // Segregation of Duties Check: Maker cannot check their own voucher
    if (existing.makerId === checkerId) {
      return NextResponse.json(
        { error: "Segregation of Duties Violation: Maker cannot check their own created voucher." },
        { status: 403 }
      );
    }

    const updated = db.transaction((tx) => {
      const v = tx
        .update(vouchers)
        .set({
          status: "CHECKED",
          checkerId,
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
          payload: JSON.stringify({ voucherId, status: "CHECKED", checkerId }),
          status: "PENDING",
        })
        .run();

      return v;
    });

    return NextResponse.json({ success: true, voucher: updated });
  } catch (error: any) {
    console.error("POST Check Voucher Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
