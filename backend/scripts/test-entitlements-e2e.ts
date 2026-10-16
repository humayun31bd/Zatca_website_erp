import { provisionTenantFeatures, PLAN_FEATURE_PRESETS } from '../src/lib/entitlements/provisioner';
import { checkFeatureAccess, checkBillQuota } from '../src/lib/entitlements/featureGuard';
import { db } from '../src/lib/db';
import { tenants, tenantSettings } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

async function runEntitlementsE2ETest() {
  console.log('🧪 Starting SaaS Entitlements End-to-End Verification Test...\n');

  const testTenantId = `test-tenant-${randomUUID().substring(0, 8)}`;

  // Insert parent tenant record to satisfy Foreign Key constraint
  await db.insert(tenants).values({
    id: testTenantId,
    name: 'E2E Test Company',
    vatNumber: '300000000000003',
    email: `${testTenantId}@test.com`,
  });

  // Test 1: Provision Free Plan
  console.log(`[Test 1] Provisioning FREE Plan for tenant: ${testTenantId}`);
  const freeResult = await provisionTenantFeatures(testTenantId, 'free');
  if (!freeResult) throw new Error('Free plan provisioning failed');

  const settingsFree = await db
    .select()
    .from(tenantSettings)
    .where(eq(tenantSettings.tenantId, testTenantId));

  console.log('✓ Settings stored in DB:', {
    packagePlan: settingsFree[0]?.packagePlan,
    maxBranches: settingsFree[0]?.maxBranches,
    monthlyBillLimit: settingsFree[0]?.monthlyBillLimit,
  });

  // Test 2: Check Feature Access on Free Plan
  console.log('\n[Test 2] Checking feature guards on FREE plan...');
  const checkRecVoucherFree = await checkFeatureAccess(testTenantId, 'recurringVouchers');
  console.log('  recurringVouchers check (Free):', {
    allowed: checkRecVoucherFree.allowed,
    upgradeRequired: checkRecVoucherFree.upgradeRequired,
    reason: checkRecVoucherFree.reason,
  });

  if (checkRecVoucherFree.allowed) {
    throw new Error('FAIL: recurringVouchers should NOT be allowed on Free plan');
  }
  console.log('✓ FREE plan feature guard blocked excluded feature as expected!');

  // Test 3: Upgrade Tenant to STANDARD Plan
  console.log(`\n[Test 3] Upgrading tenant to STANDARD Plan...`);
  const stdResult = await provisionTenantFeatures(testTenantId, 'standard');
  if (!stdResult) throw new Error('Standard plan upgrade failed');

  const checkRecVoucherStd = await checkFeatureAccess(testTenantId, 'recurringVouchers');
  console.log('  recurringVouchers check (Standard):', {
    allowed: checkRecVoucherStd.allowed,
    packagePlan: checkRecVoucherStd.packagePlan,
  });

  if (!checkRecVoucherStd.allowed) {
    throw new Error('FAIL: recurringVouchers SHOULD be allowed on Standard plan');
  }
  console.log('✓ STANDARD plan feature guard unlocked feature as expected!');

  // Test 4: Check Monthly Bill Quota
  console.log('\n[Test 4] Checking Bill Quota enforcement...');
  const quotaCheck = await checkBillQuota(testTenantId);
  console.log('  Bill Quota Check (Standard):', {
    allowed: quotaCheck.allowed,
    packagePlan: quotaCheck.packagePlan,
  });
  if (!quotaCheck.allowed) {
    throw new Error('FAIL: Standard plan should have unlimited billing (-1)');
  }
  console.log('✓ Bill Quota check passed!');

  // Clean up test data
  await db.delete(tenantSettings).where(eq(tenantSettings.tenantId, testTenantId));
  await db.delete(tenants).where(eq(tenants.id, testTenantId));
  console.log(`\n🎉 ALL SAAS ENTITLEMENT E2E TESTS PASSED SUCCESSFULLY!`);
}

runEntitlementsE2ETest().catch((err) => {
  console.error('\n❌ ENTITLEMENTS E2E TEST FAILED:', err);
  process.exit(1);
});
