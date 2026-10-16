import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || "tenant-grocery-01";

    let tenant = await db.select().from(tenants).where(eq(tenants.id, tenantId)).get();

    if (!tenant) {
      // Fallback: get first tenant or create sample
      tenant = await db.select().from(tenants).get();
    }

    return NextResponse.json({ success: true, tenant });
  } catch (error: any) {
    console.error("GET Tenant Info Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || "tenant-grocery-01";
    const body = await req.json();

    let tenant = await db.select().from(tenants).where(eq(tenants.id, tenantId)).get();

    if (tenant) {
      const [updated] = await db
        .update(tenants)
        .set({
          name: body.name ?? tenant.name,
          vatNumber: body.vatNumber ?? tenant.vatNumber,
          email: body.email ?? tenant.email,
          logoUrl: body.logoUrl ?? tenant.logoUrl,
          whatsappNumber: body.whatsappNumber ?? tenant.whatsappNumber,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenant.id))
        .returning();

      return NextResponse.json({ success: true, tenant: updated });
    } else {
      const [inserted] = await db
        .insert(tenants)
        .values({
          id: tenantId,
          name: body.name || "Shapla Supermarket Chain Ltd",
          vatNumber: body.vatNumber || "1801122334455",
          email: body.email || "accounts@shaplamart.com",
          logoUrl: body.logoUrl,
          whatsappNumber: body.whatsappNumber,
        })
        .returning();

      return NextResponse.json({ success: true, tenant: inserted });
    }
  } catch (error: any) {
    console.error("PUT Tenant Info Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
