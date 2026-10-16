import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenantSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

function getDefaultFlowForBusinessType(businessType: string): string {
  const type = businessType.toLowerCase();
  if (type.includes("services") || type.includes("sme") || type.includes("office")) {
    return "SIMPLE";
  }
  if (type.includes("trade") || type.includes("manufacturing") || type.includes("ecommerce") || type.includes("warehouse")) {
    return "COMPLEX";
  }
  return "NORMAL"; // Retail, F&B, Healthcare default
}

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || "tenant-grocery-01";

    let settings = await db
      .select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, tenantId))
      .get();

    if (!settings) {
      [settings] = await db
        .insert(tenantSettings)
        .values({
          id: crypto.randomUUID(),
          tenantId,
          businessType: "Retail Business",
          purchaseFlowType: "NORMAL",
          productPolicy: {},
          receiptSettings: {},
        })
        .returning();
    }

    return NextResponse.json({
      success: true,
      tenantId: settings.tenantId,
      businessType: settings.businessType || "Retail Business",
      purchaseFlowType: settings.purchaseFlowType || "NORMAL",
    });
  } catch (error: any) {
    console.error("GET Purchase Flow Settings Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || "tenant-grocery-01";
    const body = await req.json();

    const { businessType, purchaseFlowType } = body;

    let settings = await db
      .select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, tenantId))
      .get();

    let targetBusinessType = businessType || settings?.businessType || "Retail Business";
    let targetPurchaseFlowType = purchaseFlowType || (businessType ? getDefaultFlowForBusinessType(businessType) : (settings?.purchaseFlowType || "NORMAL"));

    if (settings) {
      const [updated] = await db
        .update(tenantSettings)
        .set({
          businessType: targetBusinessType,
          purchaseFlowType: targetPurchaseFlowType,
          updatedAt: new Date(),
        })
        .where(eq(tenantSettings.id, settings.id))
        .returning();

      return NextResponse.json({
        success: true,
        businessType: updated.businessType,
        purchaseFlowType: updated.purchaseFlowType,
      });
    } else {
      const [inserted] = await db
        .insert(tenantSettings)
        .values({
          id: crypto.randomUUID(),
          tenantId,
          businessType: targetBusinessType,
          purchaseFlowType: targetPurchaseFlowType,
          productPolicy: {},
          receiptSettings: {},
        })
        .returning();

      return NextResponse.json({
        success: true,
        businessType: inserted.businessType,
        purchaseFlowType: inserted.purchaseFlowType,
      });
    }
  } catch (error: any) {
    console.error("PUT Purchase Flow Settings Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
