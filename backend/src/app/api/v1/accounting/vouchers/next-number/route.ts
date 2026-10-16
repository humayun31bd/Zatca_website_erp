import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { generateVoucherNumber } from "@/lib/accounting/voucher_number_generator";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.nextUrl.searchParams.get("tenantId") || "default-tenant";

    const voucherType = req.nextUrl.searchParams.get("type") || req.nextUrl.searchParams.get("voucherType") || "PV";
    const dateStr = req.nextUrl.searchParams.get("date") || req.nextUrl.searchParams.get("voucherDate");

    const result = await generateVoucherNumber({
      tenantId,
      voucherType,
      date: dateStr ? new Date(dateStr) : new Date(),
    });

    return NextResponse.json({
      success: true,
      voucherNumber: result.voucherNumber,
      sequenceNumber: result.sequenceNumber,
      formula: result.formula,
    });
  } catch (error: any) {
    console.error("GET Next Voucher Number Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
