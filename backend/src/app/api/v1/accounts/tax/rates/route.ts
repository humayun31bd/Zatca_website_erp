import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tdsVdsRates } from "@/lib/db/accounting_schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.nextUrl.searchParams.get("tenantId") || "default-tenant";
    const rates = await db
      .select()
      .from(tdsVdsRates)
      .where(eq(tdsVdsRates.tenantId, tenantId))
      .orderBy(desc(tdsVdsRates.effectiveDate));

    return NextResponse.json({ success: true, rates });
  } catch (error: any) {
    console.error("GET Tax Rates Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId = "default-tenant", categoryName, tdsPercentage = 0, vdsPercentage = 0, effectiveDate = new Date() } = body;

    if (!categoryName) {
      return NextResponse.json({ error: "categoryName is required" }, { status: 400 });
    }

    const [newRate] = await db
      .insert(tdsVdsRates)
      .values({
        tenantId,
        categoryName,
        tdsPercentage: Number(tdsPercentage),
        vdsPercentage: Number(vdsPercentage),
        effectiveDate: new Date(effectiveDate),
        isActive: true,
      })
      .returning();

    return NextResponse.json({ success: true, rate: newRate });
  } catch (error: any) {
    console.error("POST Tax Rate Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
