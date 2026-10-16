import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exchangeRates } from "@/lib/db/accounting_schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.nextUrl.searchParams.get("tenantId") || "default-tenant";
    const rates = await db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.tenantId, tenantId))
      .orderBy(desc(exchangeRates.effectiveDate));

    return NextResponse.json({ success: true, rates });
  } catch (error: any) {
    console.error("GET Exchange Rates Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId = "default-tenant", currencyCode, baseCurrency = "BDT", exchangeRate, effectiveDate = new Date() } = body;

    if (!currencyCode || !exchangeRate || Number(exchangeRate) <= 0) {
      return NextResponse.json(
        { error: "currencyCode and a valid positive exchangeRate are required" },
        { status: 400 }
      );
    }

    const [rateRecord] = await db
      .insert(exchangeRates)
      .values({
        tenantId,
        currencyCode: currencyCode.toUpperCase(),
        baseCurrency: baseCurrency.toUpperCase(),
        exchangeRate: Number(exchangeRate),
        effectiveDate: new Date(effectiveDate),
      })
      .returning();

    return NextResponse.json({ success: true, rate: rateRecord });
  } catch (error: any) {
    console.error("POST Exchange Rate Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
