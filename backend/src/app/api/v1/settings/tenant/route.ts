import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants, tenantSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

function mapTenant(tenant: any, settings: any) {
  if (!tenant) return null;
  return {
    id: tenant.id,
    name: tenant.name,
    vatNumber: tenant.vatNumber,
    email: tenant.email,
    subdomain: tenant.subdomain,
    logoUrl: tenant.logoUrl,
    status: tenant.status,
    whatsappNumber: tenant.whatsappNumber,
    address: tenant.address,
    countryCode: tenant.countryCode || 'SA',
    currencyCode: tenant.currencyCode || 'SAR',
    currencySymbol: tenant.currencySymbol || 'SAR',
    taxRate: tenant.taxRate ?? 15,
    taxType: tenant.taxType || 'VAT',
    timezone: tenant.timezone || 'Asia/Riyadh',
    dateFormat: tenant.dateFormat || 'YYYY-MM-DD',
    decimalPlaces: tenant.decimalPlaces ?? 2,
    marketingPlan: tenant.marketingPlan || settings?.packagePlan || 'STANDARD',
    businessType: settings?.businessType || 'retail',
    code: tenant.subdomain,
    phone: tenant.whatsappNumber,
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || "tenant-grocery-01";

    let tenant = await db.select().from(tenants).where(eq(tenants.id, tenantId)).get();

    if (!tenant) {
      tenant = await db.select().from(tenants).get();
    }

    let settings = null;
    if (tenant?.id) {
      settings = await db.select().from(tenantSettings).where(eq(tenantSettings.tenantId, tenant.id)).get();
    }

    return NextResponse.json({ success: true, tenant: mapTenant(tenant, settings) });
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
    const now = new Date();

    let tenant = await db.select().from(tenants).where(eq(tenants.id, tenantId)).get();

    const tenantFields = {
      name: body.name ?? tenant?.name,
      vatNumber: body.vatNumber ?? tenant?.vatNumber,
      email: body.email ?? tenant?.email,
      logoUrl: body.logoUrl ?? tenant?.logoUrl,
      whatsappNumber: body.whatsappNumber ?? body.phone ?? tenant?.whatsappNumber,
      subdomain: body.code ?? body.subdomain ?? tenant?.subdomain,
      address: body.address ?? tenant?.address,
      countryCode: body.countryCode ?? tenant?.countryCode,
      currencyCode: body.currencyCode ?? tenant?.currencyCode,
      currencySymbol: body.currencySymbol ?? tenant?.currencySymbol,
      taxRate: body.taxRate ?? tenant?.taxRate,
      taxType: body.taxType ?? tenant?.taxType,
      timezone: body.timezone ?? tenant?.timezone,
      dateFormat: body.dateFormat ?? tenant?.dateFormat,
      decimalPlaces: body.decimalPlaces ?? tenant?.decimalPlaces,
      marketingPlan: body.marketingPlan ?? tenant?.marketingPlan,
      updatedAt: now,
    };

    let saved;
    if (tenant) {
      const [updated] = await db
        .update(tenants)
        .set(tenantFields)
        .where(eq(tenants.id, tenant.id))
        .returning();
      saved = updated;
    } else {
      const [inserted] = await db
        .insert(tenants)
        .values({
          id: tenantId,
          name: tenantFields.name || "Demo Client Enterprise",
          vatNumber: tenantFields.vatNumber || "300000000000003",
          email: tenantFields.email || "hello@demo-client.com",
          logoUrl: tenantFields.logoUrl,
          whatsappNumber: tenantFields.whatsappNumber,
          subdomain: tenantFields.subdomain,
          address: tenantFields.address,
          countryCode: tenantFields.countryCode || 'SA',
          currencyCode: tenantFields.currencyCode || 'SAR',
          currencySymbol: tenantFields.currencySymbol || 'SAR',
          taxRate: tenantFields.taxRate ?? 15,
          taxType: tenantFields.taxType || 'VAT',
          timezone: tenantFields.timezone || 'Asia/Riyadh',
          dateFormat: tenantFields.dateFormat || 'YYYY-MM-DD',
          decimalPlaces: tenantFields.decimalPlaces ?? 2,
          marketingPlan: tenantFields.marketingPlan || 'STANDARD',
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      saved = inserted;
    }

    const existingSettings = await db
      .select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, saved.id))
      .get();

    const plan = (body.marketingPlan || saved.marketingPlan || 'STANDARD').toUpperCase();
    const planLimits: Record<string, { maxBranches: number; maxUsers: number; monthlyBillLimit: number }> = {
      STARTER: { maxBranches: 1, maxUsers: 2, monthlyBillLimit: 500 },
      STANDARD: { maxBranches: 3, maxUsers: 10, monthlyBillLimit: 2000 },
      PRO: { maxBranches: 99, maxUsers: 99, monthlyBillLimit: 999999 },
      AGENCY: { maxBranches: 99, maxUsers: 99, monthlyBillLimit: 999999 },
    };
    const limits = planLimits[plan] || planLimits.STANDARD;

    if (existingSettings) {
      await db
        .update(tenantSettings)
        .set({
          businessType: body.businessType ?? existingSettings.businessType,
          packagePlan: plan.toLowerCase(),
          maxBranches: limits.maxBranches,
          maxUsers: limits.maxUsers,
          monthlyBillLimit: limits.monthlyBillLimit,
          updatedAt: now,
        })
        .where(eq(tenantSettings.tenantId, saved.id));
    } else {
      await db.insert(tenantSettings).values({
        tenantId: saved.id,
        businessType: body.businessType || 'retail',
        packagePlan: plan.toLowerCase(),
        maxBranches: limits.maxBranches,
        maxUsers: limits.maxUsers,
        monthlyBillLimit: limits.monthlyBillLimit,
        updatedAt: now,
      });
    }

    const settings = await db.select().from(tenantSettings).where(eq(tenantSettings.tenantId, saved.id)).get();
    return NextResponse.json({ success: true, tenant: mapTenant(saved, settings) });
  } catch (error: any) {
    console.error("PUT Tenant Info Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
