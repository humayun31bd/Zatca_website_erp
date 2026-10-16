import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vouchers, voucherLines, syncQueue } from "@/lib/db/accounting_schema";
import { validateVoucherInvariants } from "@/lib/accounting/validator";
import { verifySession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession(req);
    const approverId = session?.userId || req.headers.get("x-user-id") || "approver-user-3";
    const voucherId = params.id;

    const existing = db
      .select()
      .from(vouchers)
      .where(eq(vouchers.id, voucherId))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "Voucher not found." }, { status: 404 });
    }

    if (existing.status !== "CHECKED" && existing.status !== "SUBMITTED") {
      return NextResponse.json(
        { error: `Cannot approve voucher with status '${existing.status}'. Must be CHECKED or SUBMITTED.` },
        { status: 400 }
      );
    }

    // Segregation of Duties Check: Maker cannot approve their own voucher
    if (existing.makerId === approverId) {
      return NextResponse.json(
        { error: "Segregation of Duties Violation: Maker cannot approve their own created voucher." },
        { status: 403 }
      );
    }

    // Fetch lines & re-verify invariants before posting
    const lines = db
      .select()
      .from(voucherLines)
      .where(eq(voucherLines.voucherId, voucherId))
      .all();

    const validation = validateVoucherInvariants(
      lines.map((l) => ({
        accountId: l.accountId,
        costCenterId: l.costCenterId || undefined,
        debit: l.debit,
        credit: l.credit,
        narration: l.narration || undefined,
      }))
    );

    if (!validation.isValid) {
      return NextResponse.json(
        { error: `Posting rejected: ${validation.error}` },
        { status: 400 }
      );
    }

    const updated = db.transaction((tx) => {
      const v = tx
        .update(vouchers)
        .set({
          status: "APPROVED",
          approverId,
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
          payload: JSON.stringify({
            voucherId,
            status: "APPROVED",
            approverId,
            lines,
          }),
          status: "PENDING",
        })
        .run();

      return v;
    });

    return NextResponse.json({ success: true, voucher: updated });
  } catch (error: any) {
    console.error("POST Approve Voucher Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
