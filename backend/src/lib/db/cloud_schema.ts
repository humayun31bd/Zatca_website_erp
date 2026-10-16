import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Cloud Centralized Voucher Ledger Schema (SQLite compatible)

export const cloudVouchers = sqliteTable('cloud_vouchers', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  branchId: text('branch_id'),
  voucherNumber: text('voucher_number').notNull(),
  voucherType: text('voucher_type').notNull(),
  voucherDate: integer('voucher_date', { mode: 'timestamp' }).notNull(),
  fiscalYear: text('fiscal_year').notNull(),
  periodNumber: integer('period_number').notNull(),
  fundId: text('fund_id'),
  costCenterId: text('cost_center_id'),
  narration: text('narration').notNull(),
  totalAmount: real('total_amount').notNull(),
  status: text('status').notNull(),
  makerId: text('maker_id').notNull(),
  checkerId: text('checker_id'),
  approverId: text('approver_id'),
  localDeviceId: text('local_device_id'),
  syncedAt: integer('synced_at', { mode: 'timestamp' }).defaultNow(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const cloudGlLedger = sqliteTable('cloud_gl_ledger', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  voucherId: text('voucher_id').references(() => cloudVouchers.id).notNull(),
  voucherNumber: text('voucher_number').notNull(),
  voucherDate: integer('voucher_date', { mode: 'timestamp' }).notNull(),
  accountId: text('account_id').notNull(),
  costCenterId: text('cost_center_id'),
  fundId: text('fund_id'),
  debitAmount: real('debit_amount').notNull(),
  creditAmount: real('credit_amount').notNull(),
  postedAt: integer('posted_at', { mode: 'timestamp' }).defaultNow(),
  fiscalYear: text('fiscal_year').notNull(),
  periodNumber: integer('period_number').notNull(),
});

// Client Hosted Websites Schema
export const clientWebsites = sqliteTable('client_websites', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  clientId: text('client_id'),
  domainName: text('domain_name').notNull().unique(),
  appType: text('app_type').notNull(), // 'nextjs', 'laravel', 'static'
  appPort: integer('app_port'),
  documentRoot: text('document_root'),
  phpVersion: text('php_version'),
  status: text('status').default('pending').notNull(), // 'pending', 'active', 'error'
  sslActive: integer('ssl_active', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

// Client Onboarding & Self-Service Subscriptions Schema
export const onboardingSubscriptions = sqliteTable('onboarding_subscriptions', {
  id: text('id').primaryKey(),
  companyName: text('company_name').notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  subdomain: text('subdomain').notNull().unique(),
  packagePlan: text('package_plan').notNull(), // 'basic', 'standard', 'premium', 'free'
  billingCycle: text('billing_cycle').default('annual').notNull(),
  paymentStatus: text('payment_status').default('pending').notNull(), // 'pending', 'paid'
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false).notNull(),
  verificationToken: text('verification_token'),
  vpsProvisioned: integer('vps_provisioned', { mode: 'boolean' }).default(false).notNull(),
  clientUrl: text('client_url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});



