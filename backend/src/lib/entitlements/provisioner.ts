import { db } from '@/lib/db';
import { tenantSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export type PackagePlanTier = 'free' | 'basic' | 'standard' | 'premium' | 'agency';

export interface PlanPreset {
  maxBranches: number;
  maxUsers: number;
  monthlyBillLimit: number; // -1 for unlimited
  featureFlags: Record<string, boolean>;
}

export const PLAN_FEATURE_PRESETS: Record<PackagePlanTier, PlanPreset> = {
  free: {
    maxBranches: 1,
    maxUsers: 2,
    monthlyBillLimit: 300,
    featureFlags: {
      multiBranch: false,
      zatcaPhase2: true,
      posModule: true,
      purchases: true,
      purchaseModule: true,
      purchaseOrders: true,
      goodsReceived: false,
      qualityCheck: false,
      quotationCs: false,
      kotRestaurant: false,
      tableQrMenu: false,
      batchExpiry: false,
      serialWarranty: false,
      bomManufacturing: false,
      forexRevaluation: false,
      recurringVouchers: false,
      wpsPayroll: false,
      aiAssistant: false,
      apiAccess: false,
      whatsappIntegration: false,
      quotations: false,
      deliveryChallans: false,
      customerPortal: false,
      loyaltyPoints: false,
    },
  },
  basic: {
    maxBranches: 1,
    maxUsers: 5,
    monthlyBillLimit: -1,
    featureFlags: {
      multiBranch: false,
      zatcaPhase2: true,
      posModule: true,
      purchases: true,
      purchaseModule: true,
      purchaseOrders: true,
      goodsReceived: false,
      qualityCheck: false,
      quotationCs: true,
      kotRestaurant: false,
      tableQrMenu: false,
      batchExpiry: false,
      serialWarranty: false,
      bomManufacturing: true,
      forexRevaluation: false,
      recurringVouchers: false,
      wpsPayroll: false,
      aiAssistant: false,
      apiAccess: false,
      whatsappIntegration: false,
      quotations: true,
      deliveryChallans: true,
      customerPortal: true,
      loyaltyPoints: true,
    },
  },
  standard: {
    maxBranches: 3,
    maxUsers: 15,
    monthlyBillLimit: -1,
    featureFlags: {
      multiBranch: true,
      zatcaPhase2: true,
      posModule: true,
      purchases: true,
      purchaseModule: true,
      purchaseOrders: true,
      goodsReceived: true,
      qualityCheck: true,
      quotationCs: true,
      kotRestaurant: true,
      tableQrMenu: true,
      batchExpiry: true,
      serialWarranty: true,
      bomManufacturing: true,
      forexRevaluation: true,
      recurringVouchers: true,
      wpsPayroll: true,
      aiAssistant: true,
      apiAccess: false,
      whatsappIntegration: true,
      quotations: true,
      deliveryChallans: true,
      customerPortal: true,
      loyaltyPoints: true,
    },
  },
  premium: {
    maxBranches: 5,
    maxUsers: 30,
    monthlyBillLimit: -1,
    featureFlags: {
      multiBranch: true,
      zatcaPhase2: true,
      posModule: true,
      purchases: true,
      purchaseModule: true,
      purchaseOrders: true,
      goodsReceived: true,
      qualityCheck: true,
      quotationCs: true,
      kotRestaurant: true,
      tableQrMenu: true,
      batchExpiry: true,
      serialWarranty: true,
      bomManufacturing: true,
      forexRevaluation: true,
      recurringVouchers: true,
      wpsPayroll: true,
      aiAssistant: true,
      apiAccess: true,
      whatsappIntegration: true,
      quotations: true,
      deliveryChallans: true,
      customerPortal: true,
      loyaltyPoints: true,
    },
  },
  agency: {
    maxBranches: 999,
    maxUsers: 999,
    monthlyBillLimit: -1,
    featureFlags: {
      multiBranch: true,
      zatcaPhase2: true,
      posModule: true,
      purchases: true,
      purchaseModule: true,
      purchaseOrders: true,
      goodsReceived: true,
      qualityCheck: true,
      quotationCs: true,
      kotRestaurant: true,
      tableQrMenu: true,
      batchExpiry: true,
      serialWarranty: true,
      bomManufacturing: true,
      forexRevaluation: true,
      recurringVouchers: true,
      wpsPayroll: true,
      aiAssistant: true,
      apiAccess: true,
      whatsappIntegration: true,
      quotations: true,
      deliveryChallans: true,
      customerPortal: true,
      loyaltyPoints: true,
    },
  },
};

export async function provisionTenantFeatures(tenantId: string, plan: string): Promise<boolean> {
  try {
    const normalizedPlan = (plan.toLowerCase() as PackagePlanTier) in PLAN_FEATURE_PRESETS
      ? (plan.toLowerCase() as PackagePlanTier)
      : 'free';

    const preset = PLAN_FEATURE_PRESETS[normalizedPlan];

    const existingSettings = await db
      .select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, tenantId));

    if (existingSettings.length > 0) {
      await db
        .update(tenantSettings)
        .set({
          packagePlan: normalizedPlan,
          maxBranches: preset.maxBranches,
          maxUsers: preset.maxUsers,
          monthlyBillLimit: preset.monthlyBillLimit,
          featureFlags: preset.featureFlags,
          updatedAt: new Date(),
        })
        .where(eq(tenantSettings.tenantId, tenantId));
    } else {
      await db.insert(tenantSettings).values({
        id: randomUUID(),
        tenantId,
        packagePlan: normalizedPlan,
        maxBranches: preset.maxBranches,
        maxUsers: preset.maxUsers,
        monthlyBillLimit: preset.monthlyBillLimit,
        featureFlags: preset.featureFlags,
      });
    }

    console.log(`[Entitlements] Provisioned plan '${normalizedPlan}' for tenantId: ${tenantId}`);
    return true;
  } catch (err: any) {
    console.error(`[Entitlements] Error provisioning plan for tenantId ${tenantId}:`, err);
    return false;
  }
}
