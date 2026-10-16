import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { voucherEntryPolicies } from "@/lib/db/accounting_schema";
import { verifySession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = (session?.tenantId as string) || 'default-tenant';

    let policy;
    try {
      policy = await db.select()
        .from(voucherEntryPolicies)
        .where(eq(voucherEntryPolicies.tenantId, tenantId))
        .get();
    } catch (err: any) {
      console.warn("Voucher policy query notice (using default):", err?.message);
    }

    if (!policy) {
      // Default policy
      policy = {
        id: 'default',
        tenantId,
        requireCashierApproval: true,
        posVoucherControl: 'ACCOUNTANT_APPROVAL',
        directPostSystemVouchers: true,
        numberingFormula: '{TYPE}-{YYYY}-{MM}-{DD}-{SEQ}',
        resetPeriod: 'YEARLY',
        pvCode: 'PV',
        rvCode: 'RV',
        cvCode: 'CV',
        jvCode: 'JV',
        seqPadding: 6,
        updatedAt: new Date(),
      } as any;
    }

    return NextResponse.json({ success: true, policy });
  } catch (error: any) {
    console.error("GET Voucher Entry Policy Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = (session?.tenantId as string) || 'default-tenant';
    const body = await req.json();

    const {
      requireCashierApproval,
      posVoucherControl,
      directPostSystemVouchers,
      numberingFormula,
      resetPeriod,
      pvCode,
      rvCode,
      cvCode,
      jvCode,
      seqPadding,
    } = body;

    let existing;
    try {
      existing = await db.select()
        .from(voucherEntryPolicies)
        .where(eq(voucherEntryPolicies.tenantId, tenantId))
        .get();
    } catch (e) {
      existing = null;
    }

    let updatedPolicy;
    const updateData = {
      requireCashierApproval: Boolean(requireCashierApproval),
      posVoucherControl: posVoucherControl || 'ACCOUNTANT_APPROVAL',
      directPostSystemVouchers: Boolean(directPostSystemVouchers),
      numberingFormula: numberingFormula || '{TYPE}-{YYYY}-{MM}-{DD}-{SEQ}',
      resetPeriod: resetPeriod || 'YEARLY',
      pvCode: pvCode || 'PV',
      rvCode: rvCode || 'RV',
      cvCode: cvCode || 'CV',
      jvCode: jvCode || 'JV',
      seqPadding: Number(seqPadding) || 6,
      updatedAt: new Date(),
    };

    if (existing) {
      [updatedPolicy] = await db.update(voucherEntryPolicies)
        .set(updateData)
        .where(eq(voucherEntryPolicies.tenantId, tenantId))
        .returning();
    } else {
      [updatedPolicy] = await db.insert(voucherEntryPolicies)
        .values({
          tenantId,
          ...updateData,
        })
        .returning();
    }

    return NextResponse.json({ success: true, policy: updatedPolicy });
  } catch (error: any) {
    console.error("POST Voucher Entry Policy Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
