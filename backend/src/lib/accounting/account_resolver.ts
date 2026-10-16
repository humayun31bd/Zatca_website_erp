import { accountMappings, accounts } from '@/lib/db/accounting_schema';
import { eq, and } from 'drizzle-orm';

/**
 * Resolves the target Account ID for automated General Ledger auto-posting.
 * Priority:
 * 1. User-configured custom mapping in `account_mappings` table.
 * 2. Tenant Chart of Accounts (COA) lookup by fallback code.
 * 3. System global fallback account.
 */
export async function resolveMappedAccountId(
  dbOrTx: any,
  tenantId: string,
  moduleKey: string,   // 'PURCHASE', 'POS', 'TAX', 'INVENTORY'
  mappingKey: string,  // 'AP_VENDORS', 'INVENTORY_ASSET', 'INPUT_VAT', 'OUTPUT_VAT', 'COGS', 'POS_REVENUE'
  fallbackCode: string // e.g. '2.10.01.001.001'
): Promise<string | null> {
  try {
    // 1. Check user-configured account mapping in `account_mappings`
    const userMappings = await dbOrTx
      .select({ accountId: accountMappings.accountId })
      .from(accountMappings)
      .where(
        and(
          eq(accountMappings.tenantId, tenantId),
          eq(accountMappings.moduleKey, moduleKey),
          eq(accountMappings.mappingKey, mappingKey)
        )
      )
      .limit(1);

    if (userMappings.length > 0 && userMappings[0].accountId) {
      return userMappings[0].accountId;
    }

    // 2. Fallback to Chart of Accounts by fallback standard code for this tenant
    const tenantAccounts = await dbOrTx
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(
          eq(accounts.tenantId, tenantId),
          eq(accounts.code, fallbackCode)
        )
      )
      .limit(1);

    if (tenantAccounts.length > 0) {
      return tenantAccounts[0].id;
    }

    // 3. Fallback to global account matching fallback code
    const globalAccounts = await dbOrTx
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.code, fallbackCode))
      .limit(1);

    return globalAccounts.length > 0 ? globalAccounts[0].id : null;
  } catch (err) {
    console.error(`[AccountResolver] Error resolving mapping ${moduleKey}:${mappingKey}:`, err);
    return null;
  }
}
