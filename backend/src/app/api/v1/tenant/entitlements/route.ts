import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tenantSettings, invoices, users } from '@/lib/db/schema';
import { verifySession } from '@/lib/auth/session';
import { eq, count, and, gte } from 'drizzle-orm';
import { PLAN_FEATURE_PRESETS } from '@/lib/entitlements/provisioner';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.nextUrl.searchParams.get('tenantId') || 'default-tenant';

    const settings = await db
      .select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, tenantId));

    const tenant = settings.length > 0 ? settings[0] : null;
    const plan = tenant?.packagePlan || 'free';
    const preset = PLAN_FEATURE_PRESETS[plan.toLowerCase() as keyof typeof PLAN_FEATURE_PRESETS] || PLAN_FEATURE_PRESETS.free;

    const rawFlags =
      tenant?.featureFlags && Object.keys(tenant.featureFlags).length > 0
        ? tenant.featureFlags
        : preset.featureFlags;
    const featureFlags: Record<string, boolean> = { ...rawFlags };

    // In development mode, unlock all purchase module and procurement features
    const isPurchaseDevUnlocked =
      process.env.UNLOCK_PURCHASE_MODULE !== 'false' &&
      (process.env.NODE_ENV !== 'production' || process.env.UNLOCK_PURCHASE_MODULE === 'true');

    if (isPurchaseDevUnlocked) {
      featureFlags['purchases'] = true;
      featureFlags['purchaseModule'] = true;
      featureFlags['purchaseOrders'] = true;
      featureFlags['goodsReceived'] = true;
      featureFlags['qualityCheck'] = true;
      featureFlags['quotations'] = true;
      featureFlags['quotationCs'] = true;
      featureFlags['batchExpiry'] = true;
      featureFlags['deliveryChallans'] = true;
      featureFlags['suppliers'] = true;
      featureFlags['receivedBills'] = true;
    }

    const maxBranches = tenant?.maxBranches || preset.maxBranches;
    const maxUsers = tenant?.maxUsers || preset.maxUsers;
    const monthlyBillLimit = tenant?.monthlyBillLimit || preset.monthlyBillLimit;

    // Calculate monthly bill usage
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const billCountResult = await db
      .select({ val: count() })
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          gte(invoices.createdAt, startOfMonth)
        )
      );

    const monthlyBillsCount = billCountResult[0]?.val || 0;

    // Calculate total users count
    const userCountResult = await db
      .select({ val: count() })
      .from(users)
      .where(eq(users.tenantId, tenantId));

    const currentUsersCount = userCountResult[0]?.val || 0;

    return NextResponse.json({
      success: true,
      tenantId,
      packagePlan: plan.toUpperCase(),
      quotas: {
        maxBranches,
        maxUsers,
        currentUsersCount,
        monthlyBillLimit,
        monthlyBillsCount,
        isBillQuotaExceeded: monthlyBillLimit !== -1 && monthlyBillsCount >= monthlyBillLimit,
      },
      featureFlags,
      devUnlocked: isPurchaseDevUnlocked,
    });
  } catch (error: any) {
    console.error('Get Tenant Entitlements Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch entitlements' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const body = await req.json().catch(() => ({}));
    const tenantId = body.tenantId || session?.tenantId || '336eaf82-a524-4b0a-9326-7197b1e5459e';
    const plan = (body.plan || 'agency').toLowerCase();

    const { provisionTenantFeatures } = await import('@/lib/entitlements/provisioner');
    await provisionTenantFeatures(tenantId, plan);

    return NextResponse.json({
      success: true,
      message: `Successfully provisioned ${plan} plan for tenant ${tenantId}`,
      tenantId,
      packagePlan: plan.toUpperCase(),
    });
  } catch (error: any) {
    console.error('Provision Tenant Entitlements Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to provision plan' }, { status: 500 });
  }
}

