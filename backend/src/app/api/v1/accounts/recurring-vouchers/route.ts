import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recurringVouchers } from "@/lib/db/accounting_schema";
import { validateVoucherInvariants } from "@/lib/accounting/validator";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.nextUrl.searchParams.get("tenantId") || "default-tenant";
    const templates = await db
      .select()
      .from(recurringVouchers)
      .where(eq(recurringVouchers.tenantId, tenantId))
      .orderBy(desc(recurringVouchers.createdAt));

    return NextResponse.json({ success: true, templates });
  } catch (error: any) {
    console.error("GET Recurring Vouchers Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenantId = "default-tenant",
      templateName,
      voucherType, // JV, PV, RV
      frequency = "MONTHLY", // MONTHLY, QUARTERLY, ANNUAL
      amount,
      lines,
      narration,
      startDate = new Date(),
      maxRuns,
    } = body;

    if (!templateName || !voucherType || !amount || !lines || !lines.length) {
      return NextResponse.json(
        { error: "Missing required fields: templateName, voucherType, amount, lines" },
        { status: 400 }
      );
    }

    // Validate double-entry invariant on template lines
    const validation = validateVoucherInvariants(lines);
    if (!validation.isValid) {
      return NextResponse.json({ error: `Template Invariant error: ${validation.error}` }, { status: 400 });
    }

    const payloadJson = JSON.stringify({ lines, narration });
    const firstRunDate = new Date(startDate);

    const [template] = await db
      .insert(recurringVouchers)
      .values({
        tenantId,
        templateName,
        voucherType,
        frequency,
        amount: Number(amount),
        payloadJson,
        nextRunDate: firstRunDate,
        maxRuns: maxRuns ? Number(maxRuns) : null,
        isActive: true,
      })
      .returning();

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error("POST Recurring Voucher Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
