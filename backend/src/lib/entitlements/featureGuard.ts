import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tenantSettings, invoices, users } from '@/lib/db/schema';
import { eq, count, and, gte } from 'drizzle-orm';
import { PLAN_FEATURE_PRESETS } from './provisioner';

export interface FeatureCheckResult {
  allowed: boolean;
  reason?: string;
  packagePlan?: string;
  upgradeRequired?: boolean;
}

export const PURCHASE_MODULE_FEATURE_KEYS = new Set([
  'purchases',
  'purchasemodule',
  'purchaseorders',
  'goodsreceived',
  'qualitycheck',
  'quotations',
  'quotationcs',
  'batchexpiry',
  'deliverychallans',
  'suppliers',
  'receivedbills',
]);

/**
 * Check if a tenant has access to a specific feature based on their entitlement feature flags.
 */
export async function checkFeatureAccess(tenantId: string, featureKey: string): Promise<FeatureCheckResult> {
  try {
    // In development mode, unlock all purchase module features
    const isPurchaseDevUnlocked =
      process.env.UNLOCK_PURCHASE_MODULE !== 'false' &&
      (process.env.NODE_ENV !== 'production' || process.env.UNLOCK_PURCHASE_MODULE === 'true');

    if (isPurchaseDevUnlocked && PURCHASE_MODULE_FEATURE_KEYS.has(featureKey.toLowerCase())) {
      return {
        allowed: true,
        packagePlan: 'development-unlocked',
        upgradeRequired: false,
      };
    }

    const settings = await db
      .select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, tenantId));

    if (settings.length === 0) {
      // Default to free preset if no settings row exists
      const freeFlags = PLAN_FEATURE_PRESETS.free.featureFlags;
      const isAllowed = freeFlags[featureKey] ?? false;
      return {
        allowed: isAllowed,
        packagePlan: 'free',
        upgradeRequired: !isAllowed,
        reason: isAllowed
          ? undefined
          : `The feature '${featureKey}' is excluded from the Free Plan. Please upgrade your subscription to access this feature.`,
      };
    }

    const tenant = settings[0];
    const featureFlags = (tenant.featureFlags || {}) as Record<string, boolean>;
    const isAllowed = featureFlags[featureKey] ?? false;

    return {
      allowed: isAllowed,
      packagePlan: tenant.packagePlan,
      upgradeRequired: !isAllowed,
      reason: isAllowed
        ? undefined
        : `The feature '${featureKey}' is not included in your current '${tenant.packagePlan.toUpperCase()}' plan. Please upgrade to unlock this feature.`,
    };
  } catch (err: any) {
    console.error(`[FeatureGuard] Error checking feature '${featureKey}' for tenant '${tenantId}':`, err);
    return { allowed: true }; // Fail-open gracefully in dev/error cases
  }
}

/**
 * Check if a tenant has reached their monthly bill generation quota (e.g. 300 bills/mo for Free plan).
 */
export async function checkBillQuota(tenantId: string): Promise<FeatureCheckResult> {
  try {
    const settings = await db
      .select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, tenantId));

    const limit = settings.length > 0 ? settings[0].monthlyBillLimit : 300;
    const plan = settings.length > 0 ? settings[0].packagePlan : 'free';

    // -1 signifies unlimited billing
    if (limit === -1) {
      return { allowed: true, packagePlan: plan };
    }

    // Start of current month timestamp
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await db
      .select({ val: count() })
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          gte(invoices.createdAt, startOfMonth)
        )
      );

    const currentCount = result[0]?.val || 0;

    if (currentCount >= limit) {
      return {
        allowed: false,
        packagePlan: plan,
        upgradeRequired: true,
        reason: `Monthly bill quota limit reached (${currentCount}/${limit} bills this month). Upgrade to Basic or Standard plan for unlimited billing.`,
      };
    }

    return { allowed: true, packagePlan: plan };
  } catch (err: any) {
    console.error(`[FeatureGuard] Error checking bill quota for tenant '${tenantId}':`, err);
    return { allowed: true };
  }
}

/**
 * Next.js API Guard helper to enforce feature access in API route handlers.
 * Returns NextResponse error if blocked, or null if permitted.
 */
export async function enforceFeatureGuard(tenantId: string, featureKey: string): Promise<NextResponse | null> {
  const check = await checkFeatureAccess(tenantId, featureKey);
  if (!check.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: check.reason,
        featureKey,
        currentPlan: check.packagePlan,
        upgradeRequired: true,
      },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Next.js API Guard helper to enforce monthly bill quota limits.
 */
export async function enforceBillQuotaGuard(tenantId: string): Promise<NextResponse | null> {
  const check = await checkBillQuota(tenantId);
  if (!check.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: check.reason,
        currentPlan: check.packagePlan,
        upgradeRequired: true,
      },
      { status: 403 }
    );
  }
  return null;
}
