import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tdsVdsRates } from "@/lib/db/accounting_schema";
import { calculateTdsVdsDeductions } from "@/lib/accounting/tax_calculator";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { grossBillAmount, rateId, tdsPercentage, vdsPercentage } = body;

    if (!grossBillAmount || grossBillAmount <= 0) {
      return NextResponse.json(
        { error: "grossBillAmount must be greater than 0" },
        { status: 400 }
      );
    }

    let tdsPct = tdsPercentage ?? 0;
    let vdsPct = vdsPercentage ?? 0;

    if (rateId) {
      const [rate] = await db
        .select()
        .from(tdsVdsRates)
        .where(eq(tdsVdsRates.id, rateId))
        .limit(1);

      if (rate) {
        tdsPct = rate.tdsPercentage;
        vdsPct = rate.vdsPercentage;
      }
    }

    const deduction = calculateTdsVdsDeductions(grossBillAmount, tdsPct, vdsPct);

    return NextResponse.json({
      success: true,
      deduction,
    });
  } catch (error: any) {
    console.error("Calculate Tax Deduction Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
