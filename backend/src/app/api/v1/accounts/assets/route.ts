import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fixedAssets } from "@/lib/db/accounting_schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.nextUrl.searchParams.get("tenantId") || "default-tenant";
    const assets = await db
      .select()
      .from(fixedAssets)
      .where(eq(fixedAssets.tenantId, tenantId))
      .orderBy(desc(fixedAssets.createdAt));

    return NextResponse.json({ success: true, assets });
  } catch (error: any) {
    console.error("GET Assets Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenantId = "default-tenant",
      assetTag,
      assetName,
      assetCategoryId,
      costCenterId,
      acquisitionDate = new Date(),
      purchaseCost,
      salvageValue = 0,
      usefulLifeMonths,
      depreciationMethod = "STRAIGHT_LINE",
      depreciationRate = 0,
      depreciationExpenseAccountId,
      accumulatedDepreciationAccountId,
    } = body;

    if (!assetTag || !assetName || !purchaseCost || !usefulLifeMonths || !depreciationExpenseAccountId || !accumulatedDepreciationAccountId) {
      return NextResponse.json(
        { error: "Missing required asset fields (assetTag, assetName, purchaseCost, usefulLifeMonths, depreciationExpenseAccountId, accumulatedDepreciationAccountId)" },
        { status: 400 }
      );
    }

    const cost = Number(purchaseCost);
    const salvage = Number(salvageValue);
    const bookValue = cost - salvage;

    const [newAsset] = await db
      .insert(fixedAssets)
      .values({
        tenantId,
        assetTag,
        assetName,
        assetCategoryId: assetCategoryId || null,
        costCenterId: costCenterId || null,
        acquisitionDate: new Date(acquisitionDate),
        purchaseCost: cost,
        salvageValue: salvage,
        usefulLifeMonths: Number(usefulLifeMonths),
        depreciationMethod,
        depreciationRate: Number(depreciationRate),
        accumulatedDepreciation: 0,
        bookValue,
        depreciationExpenseAccountId,
        accumulatedDepreciationAccountId,
        status: "ACTIVE",
      })
      .returning();

    return NextResponse.json({ success: true, asset: newAsset });
  } catch (error: any) {
    console.error("POST Asset Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
