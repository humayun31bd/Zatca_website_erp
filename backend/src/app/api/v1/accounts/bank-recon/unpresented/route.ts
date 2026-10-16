import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chequeLeaves, vouchers } from "@/lib/db/accounting_schema";
import { verifySession } from "@/lib/auth/session";
import { eq, and, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const bankAccountId = req.nextUrl.searchParams.get("bankAccountId");

    if (!bankAccountId) {
      return NextResponse.json(
        { error: "Missing required query parameter: bankAccountId" },
        { status: 400 }
      );
    }

    // Fetch uncleared cheques (ISSUED, RECEIVED, PRESENTED)
    const unpresentedLeaves = db
      .select()
      .from(chequeLeaves)
      .where(
        and(
          eq(chequeLeaves.bankAccountId, bankAccountId),
          inArray(chequeLeaves.status, ["ISSUED", "RECEIVED", "PRESENTED"])
        )
      )
      .all();

    const resultItems = [];
    for (const leaf of unpresentedLeaves) {
      let voucherNo = "N/A";
      let voucherType = "N/A";

      if (leaf.voucherId) {
        const v = db.select().from(vouchers).where(eq(vouchers.id, leaf.voucherId)).get();
        if (v) {
          voucherNo = v.voucherNumber;
          voucherType = v.voucherType;
        }
      }

      resultItems.push({
        id: leaf.id,
        leafNumber: leaf.leafNumber,
        status: leaf.status,
        type: leaf.status === "RECEIVED" ? "DEPOSIT" : "PAYMENT",
        payeeName: leaf.payeeName || "N/A",
        amount: leaf.amount || 0,
        issuedDate: leaf.issuedDate,
        voucherId: leaf.voucherId,
        voucherNumber: voucherNo,
        voucherType,
      });
    }

    const totalUnpresentedPayments = resultItems
      .filter((i) => i.type === "PAYMENT")
      .reduce((sum, i) => sum + i.amount, 0);

    const totalUnclearedDeposits = resultItems
      .filter((i) => i.type === "DEPOSIT")
      .reduce((sum, i) => sum + i.amount, 0);

    return NextResponse.json({
      success: true,
      bankAccountId,
      unpresentedCount: resultItems.length,
      summary: {
        totalUnpresentedPayments,
        totalUnclearedDeposits,
        netReconciliationAdjustment: totalUnclearedDeposits - totalUnpresentedPayments,
      },
      unpresentedCheques: resultItems,
    });
  } catch (error: any) {
    console.error("GET Unpresented Cheques Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
