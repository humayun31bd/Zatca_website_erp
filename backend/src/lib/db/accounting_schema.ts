import { sqliteTable, integer, text, real, blob, unique, check, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql, relations } from 'drizzle-orm';
import { tenants, branches, counters, clients, suppliers, categories } from './schema';

// --- Accounting Module Tables ---

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  code: text('code').notNull(), // e.g. 1.10.01.001.001
  name: text('name').notNull(),
  type: text('type').notNull(), // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  accountSubtype: text('account_subtype'), // e.g., FIXED_ASSET, INVENTORY, RECEIVABLES, PAYABLES
  level: integer('level').notNull(), // 1 to 5
  parentId: text('parent_id'), // Self-referential for tree structure
  isControl: integer('is_control', { mode: 'boolean' }).default(false).notNull(), // True if it cannot have direct transactions
  isTransaction: integer('is_transaction', { mode: 'boolean' }).default(false).notNull(),
  isCashNature: integer('is_cash_nature', { mode: 'boolean' }).default(false).notNull(),
  isBankNature: integer('is_bank_nature', { mode: 'boolean' }).default(false).notNull(),
  hasCostCenter: integer('has_cost_center', { mode: 'boolean' }).default(false).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('account_type_check', sql`${t.type} IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')`),
  check('account_level_check', sql`${t.level} BETWEEN 1 AND 5`),
]);

export const costCenters = sqliteTable('cost_centers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  code: text('code').default('CC-001').notNull(),
  name: text('name').notNull(),
  sourceType: text('source_type').default('GENERAL').notNull(), // 'BRANCH', 'EMPLOYEE', 'SUPPLIER', 'CUSTOMER', 'DEALER', 'CAR_VEHICLE', 'GENERAL'
  sourceId: text('source_id'),
  category: text('category'),
  monthlyBudget: real('monthly_budget').default(0).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('cc_source_type_check', sql`${t.sourceType} IN ('BRANCH','EMPLOYEE','SUPPLIER','CUSTOMER','DEALER','CAR_VEHICLE','PROJECT','GENERAL')`),
]);

export const financialYears = sqliteTable('financial_years', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(), // e.g., 'FY2026-2027'
  fromDate: integer('from_date', { mode: 'timestamp' }).notNull(),
  toDate: integer('to_date', { mode: 'timestamp' }).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(false).notNull(),
  isClosed: integer('is_closed', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const financialPeriods = sqliteTable('financial_periods', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull(),
  financialYearId: text('financial_year_id').references(() => financialYears.id, { onDelete: 'cascade' }).notNull(),
  periodNumber: integer('period_number').notNull(), // 1 to 13
  periodName: text('period_name').notNull(), // e.g., 'July 2026', 'Period 13 Closing'
  fromDate: integer('from_date', { mode: 'timestamp' }).notNull(),
  toDate: integer('to_date', { mode: 'timestamp' }).notNull(),
  isLocked: integer('is_locked', { mode: 'boolean' }).default(false).notNull(),
  lockedAt: integer('locked_at', { mode: 'timestamp' }),
  lockedBy: text('locked_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('period_num_check', sql`${t.periodNumber} BETWEEN 1 AND 13`),
]);

export const journalEntries = sqliteTable('journal_entries', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  entryNumber: text('entry_number').notNull(), // Unique per tenant e.g. JE-2026-0001
  referenceType: text('reference_type'), // INVOICE, PURCHASE, PAYROLL, MANUAL, etc.
  referenceId: text('reference_id'), // e.g. invoice_id or payroll_id
  entryDate: integer('entry_date', { mode: 'timestamp' }).notNull(),
  description: text('description'),
  status: text('status').default('DRAFT').notNull(), // DRAFT, POSTED, VOID
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('je_status_check', sql`${t.status} IN ('DRAFT','POSTED','VOID')`),
]);

export const journalEntryLines = sqliteTable('journal_entry_lines', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  journalEntryId: text('journal_entry_id').references(() => journalEntries.id, { onDelete: 'cascade' }).notNull(),
  accountId: text('account_id').references(() => accounts.id).notNull(),
  debit: real('debit').default(0).notNull(),
  credit: real('credit').default(0).notNull(),
  description: text('description'),
  
  // Dimensions / Tags
  branchId: text('branch_id').references(() => branches.id),
  costCenterId: text('cost_center_id').references(() => costCenters.id),
  categoryId: text('category_id').references(() => categories.id), // Product Category
  supplierId: text('supplier_id').references(() => suppliers.id),
  clientId: text('client_id').references(() => clients.id),
  counterId: text('counter_id').references(() => counters.id),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('debit_credit_check', sql`${t.debit} >= 0 AND ${t.credit} >= 0 AND (${t.debit} > 0 OR ${t.credit} > 0)`),
]);

export const journalEntriesRelations = relations(journalEntries, ({ many }) => ({
  lines: many(journalEntryLines),
}));

export const journalEntryLinesRelations = relations(journalEntryLines, ({ one }) => ({
  journalEntry: one(journalEntries, {
    fields: [journalEntryLines.journalEntryId],
    references: [journalEntries.id],
  }),
  account: one(accounts, {
    fields: [journalEntryLines.accountId],
    references: [accounts.id],
  }),
  costCenter: one(costCenters, {
    fields: [journalEntryLines.costCenterId],
    references: [costCenters.id],
  }),
}));

// --- Vouchers & Sub-Ledger Sync Tables ---

export const chequeBooks = sqliteTable('cheque_books', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  bankAccountId: text('bank_account_id').references(() => accounts.id).notNull(),
  chequeBookNumber: text('cheque_book_number').notNull(),
  startLeafNumber: integer('start_leaf_number').notNull(),
  endLeafNumber: integer('end_leaf_number').notNull(),
  totalLeaves: integer('total_leaves').notNull(),
  status: text('status').default('ACTIVE').notNull(), // ACTIVE, EXHAUSTED, CANCELLED
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('cheque_book_status_check', sql`${t.status} IN ('ACTIVE','EXHAUSTED','CANCELLED')`),
]);

export const chequeLeaves = sqliteTable('cheque_leaves', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  chequeBookId: text('cheque_book_id').references(() => chequeBooks.id),
  bankAccountId: text('bank_account_id').references(() => accounts.id).notNull(),
  leafNumber: text('leaf_number').notNull(),
  status: text('status').default('AVAILABLE').notNull(), // AVAILABLE, ISSUED, RECEIVED, PRESENTED, CLEARED, CANCELLED, BOUNCED
  voucherId: text('voucher_id'),
  payeeName: text('payee_name'),
  amount: real('amount').default(0.0),
  issuedDate: integer('issued_date', { mode: 'timestamp' }),
  clearedDate: integer('cleared_date', { mode: 'timestamp' }),
  bouncedDate: integer('bounced_date', { mode: 'timestamp' }),
  remarks: text('remarks'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('cheque_leaf_status_check', sql`${t.status} IN ('AVAILABLE','ISSUED','RECEIVED','PRESENTED','CLEARED','CANCELLED','BOUNCED')`),
]);

export const vouchers = sqliteTable('vouchers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  voucherNumber: text('voucher_number').notNull(),
  voucherType: text('voucher_type').notNull(), // RV, PV, JV, CV
  voucherDate: integer('voucher_date', { mode: 'timestamp' }).notNull(),
  fiscalYear: text('fiscal_year').notNull(),
  periodNumber: integer('period_number').notNull(),
  fundId: text('fund_id'),
  costCenterId: text('cost_center_id').references(() => costCenters.id),
  chequeLeafId: text('cheque_leaf_id').references(() => chequeLeaves.id),
  chequeNumber: text('cheque_number'),
  narration: text('narration').notNull(),
  totalAmount: real('total_amount').notNull(),
  status: text('status').default('DRAFT').notNull(), // DRAFT, SUBMITTED, CHECKED, APPROVED, POSTED, REJECTED, VOID
  makerId: text('maker_id').notNull(),
  checkerId: text('checker_id'),
  approverId: text('approver_id'),
  syncStatus: text('sync_status').default('PENDING').notNull(), // PENDING, SYNCED, FAILED
  syncedAt: integer('synced_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('voucher_type_check', sql`${t.voucherType} IN ('RV','PV','JV','CV')`),
  check('voucher_status_check', sql`${t.status} IN ('DRAFT','SUBMITTED','CHECKED','APPROVED','POSTED','REJECTED','VOID')`),
  check('voucher_sync_status_check', sql`${t.syncStatus} IN ('PENDING','SYNCED','FAILED')`),
]);

export const voucherLines = sqliteTable('voucher_lines', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  voucherId: text('voucher_id').references(() => vouchers.id, { onDelete: 'cascade' }).notNull(),
  accountId: text('account_id').references(() => accounts.id).notNull(),
  costCenterId: text('cost_center_id').references(() => costCenters.id),
  debit: real('debit').default(0).notNull(),
  credit: real('credit').default(0).notNull(),
  narration: text('narration'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('voucher_line_debit_credit_check', sql`${t.debit} >= 0 AND ${t.credit} >= 0 AND (${t.debit} > 0 OR ${t.credit} > 0)`),
]);

export const syncQueue = sqliteTable('sync_queue', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull(),
  entityType: text('entity_type').notNull(), // VOUCHER, ACCOUNT, BUDGET
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(), // INSERT, UPDATE, DELETE
  payload: text('payload').notNull(), // Encrypted/JSON string
  status: text('status').default('PENDING').notNull(), // PENDING, PROCESSING, SYNCED, FAILED
  retryCount: integer('retry_count').default(0).notNull(),
  lastError: text('last_error'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  syncedAt: integer('synced_at', { mode: 'timestamp' }),
}, (t) => [
  check('sync_queue_status_check', sql`${t.status} IN ('PENDING','PROCESSING','SYNCED','FAILED')`),
]);

export const tdsVdsRates = sqliteTable('tds_vds_rates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull(),
  categoryName: text('category_name').notNull(), // e.g. 'Vendor Supply', 'Consultancy Fee', 'Rent'
  tdsPercentage: real('tds_percentage').default(0.0).notNull(),
  vdsPercentage: real('vds_percentage').default(0.0).notNull(),
  effectiveDate: integer('effective_date', { mode: 'timestamp' }).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
});

export const fixedAssets = sqliteTable('fixed_assets', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull(),
  assetTag: text('asset_tag').notNull(),
  assetName: text('asset_name').notNull(),
  assetCategoryId: text('asset_category_id'),
  costCenterId: text('cost_center_id').references(() => costCenters.id),
  acquisitionDate: integer('acquisition_date', { mode: 'timestamp' }).notNull(),
  purchaseCost: real('purchase_cost').notNull(),
  salvageValue: real('salvage_value').default(0.0).notNull(),
  usefulLifeMonths: integer('useful_life_months').notNull(),
  depreciationMethod: text('depreciation_method').default('STRAIGHT_LINE').notNull(), // STRAIGHT_LINE, REDUCING_BALANCE
  depreciationRate: real('depreciation_rate').default(0.0).notNull(), // Percentage rate for REDUCING_BALANCE e.g. 20.0
  accumulatedDepreciation: real('accumulated_depreciation').default(0.0).notNull(),
  bookValue: real('book_value').notNull(),
  depreciationExpenseAccountId: text('depreciation_expense_account_id').notNull(),
  accumulatedDepreciationAccountId: text('accumulated_depreciation_account_id').notNull(),
  status: text('status').default('ACTIVE').notNull(), // ACTIVE, DISPOSED, WRITE_OFF
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('asset_dep_method_check', sql`${t.depreciationMethod} IN ('STRAIGHT_LINE','REDUCING_BALANCE')`),
  check('asset_status_check', sql`${t.status} IN ('ACTIVE','DISPOSED','WRITE_OFF')`),
]);

export const exchangeRates = sqliteTable('exchange_rates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull(),
  currencyCode: text('currency_code').notNull(), // e.g. 'USD', 'EUR', 'SAR'
  baseCurrency: text('base_currency').default('BDT').notNull(),
  exchangeRate: real('exchange_rate').notNull(), // e.g. 118.50 BDT per 1 USD
  effectiveDate: integer('effective_date', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const recurringVouchers = sqliteTable('recurring_vouchers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull(),
  templateName: text('template_name').notNull(),
  voucherType: text('voucher_type').notNull(),
  frequency: text('frequency').default('MONTHLY').notNull(), // MONTHLY, QUARTERLY, ANNUAL
  amount: real('amount').notNull(),
  payloadJson: text('payload_json').notNull(), // JSON string containing lines & narration
  nextRunDate: integer('next_run_date', { mode: 'timestamp' }).notNull(),
  lastRunDate: integer('last_run_date', { mode: 'timestamp' }),
  totalRuns: integer('total_runs').default(0).notNull(),
  maxRuns: integer('max_runs'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('rec_freq_check', sql`${t.frequency} IN ('MONTHLY','QUARTERLY','ANNUAL')`),
]);

export const voucherAuditComments = sqliteTable('voucher_audit_comments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull(),
  voucherId: text('voucher_id').references(() => vouchers.id, { onDelete: 'cascade' }).notNull(),
  auditorId: text('auditor_id').notNull(),
  auditorType: text('auditor_type').default('INTERNAL').notNull(), // INTERNAL, EXTERNAL
  queryType: text('query_type').default('OBSERVATION').notNull(), // OBSERVATION, COMPLIANCE_QUERY, DOCUMENT_REQUEST, FLAG
  commentText: text('comment_text').notNull(),
  status: text('status').default('OPEN').notNull(), // OPEN, RESPONDED, RESOLVED, CLOSED
  managementResponse: text('management_response'),
  respondedBy: text('responded_by'),
  respondedAt: integer('responded_at', { mode: 'timestamp' }),
  resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('audit_query_type_check', sql`${t.queryType} IN ('OBSERVATION','COMPLIANCE_QUERY','DOCUMENT_REQUEST','FLAG')`),
  check('audit_status_check', sql`${t.status} IN ('OPEN','RESPONDED','RESOLVED','CLOSED')`),
]);

export const chequeBooksRelations = relations(chequeBooks, ({ many, one }) => ({
  leaves: many(chequeLeaves),
  bankAccount: one(accounts, {
    fields: [chequeBooks.bankAccountId],
    references: [accounts.id],
  }),
}));

export const chequeLeavesRelations = relations(chequeLeaves, ({ one }) => ({
  chequeBook: one(chequeBooks, {
    fields: [chequeLeaves.chequeBookId],
    references: [chequeBooks.id],
  }),
  voucher: one(vouchers, {
    fields: [chequeLeaves.voucherId],
    references: [vouchers.id],
  }),
}));

export const vouchersRelations = relations(vouchers, ({ many, one }) => ({
  lines: many(voucherLines),
  auditComments: many(voucherAuditComments),
  chequeLeaf: one(chequeLeaves, {
    fields: [vouchers.chequeLeafId],
    references: [chequeLeaves.id],
  }),
}));

export const voucherLinesRelations = relations(voucherLines, ({ one }) => ({
  voucher: one(vouchers, {
    fields: [voucherLines.voucherId],
    references: [vouchers.id],
  }),
  account: one(accounts, {
    fields: [voucherLines.accountId],
    references: [accounts.id],
  }),
}));

export const accountMappings = sqliteTable('account_mappings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull(),
  moduleKey: text('module_key').notNull(), // 'POS', 'PURCHASE', 'TAX', 'INVENTORY'
  mappingKey: text('mapping_key').notNull(), // e.g. 'POS_CASH', 'POS_BANK', 'POS_REVENUE', 'AP_VENDORS', 'VAT_PAYABLE'
  accountId: text('account_id').references(() => accounts.id, { onDelete: 'cascade' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('idx_account_mapping_tenant_key').on(t.tenantId, t.moduleKey, t.mappingKey),
]);

export const accountMappingsRelations = relations(accountMappings, ({ one }) => ({
  account: one(accounts, {
    fields: [accountMappings.accountId],
    references: [accounts.id],
  }),
}));

export const chequeLeafAuditLogs = sqliteTable('cheque_leaf_audit_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull(),
  chequeLeafId: text('cheque_leaf_id').references(() => chequeLeaves.id, { onDelete: 'cascade' }).notNull(),
  actionType: text('action_type').notNull(), // CREATED, ISSUED, PDC_RECEIVED, DEPOSITED, CLEARED, BOUNCED, CANCELLED
  previousStatus: text('previous_status'),
  newStatus: text('new_status').notNull(),
  performedBy: text('performed_by').default('System / Financial Controller').notNull(),
  remarks: text('remarks'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const chequeLeafAuditLogsRelations = relations(chequeLeafAuditLogs, ({ one }) => ({
  chequeLeaf: one(chequeLeaves, {
    fields: [chequeLeafAuditLogs.chequeLeafId],
    references: [chequeLeaves.id],
  }),
}));

export const voucherEntryPolicies = sqliteTable('voucher_entry_policies', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull().unique(),
  requireCashierApproval: integer('require_cashier_approval', { mode: 'boolean' }).default(true).notNull(),
  posVoucherControl: text('pos_voucher_control').default('ACCOUNTANT_APPROVAL').notNull(),
  directPostSystemVouchers: integer('direct_post_system_vouchers', { mode: 'boolean' }).default(true).notNull(),
  numberingFormula: text('numbering_formula').default('{TYPE}-{YYYY}-{MM}-{DD}-{SEQ}').notNull(),
  resetPeriod: text('reset_period').default('YEARLY').notNull(),
  pvCode: text('pv_code').default('PV').notNull(),
  rvCode: text('rv_code').default('RV').notNull(),
  cvCode: text('cv_code').default('CV').notNull(),
  jvCode: text('jv_code').default('JV').notNull(),
  seqPadding: integer('seq_padding').default(6).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});
export const fiscalYearOpeningBalances = sqliteTable('fiscal_year_opening_balances', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  financialYearId: text('financial_year_id').references(() => financialYears.id, { onDelete: 'cascade' }).notNull(),
  accountId: text('account_id').references(() => accounts.id, { onDelete: 'cascade' }).notNull(),
  openingDebit: real('opening_debit').default(0).notNull(),
  openingCredit: real('opening_credit').default(0).notNull(),
  openingNet: real('opening_net').default(0).notNull(),
  isGenesis: integer('is_genesis', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  unique('uq_tenant_fy_account_ob').on(t.tenantId, t.financialYearId, t.accountId)
]);

export const fiscalYearOpeningBalancesRelations = relations(fiscalYearOpeningBalances, ({ one }) => ({
  financialYear: one(financialYears, {
    fields: [fiscalYearOpeningBalances.financialYearId],
    references: [financialYears.id],
  }),
  account: one(accounts, {
    fields: [fiscalYearOpeningBalances.accountId],
    references: [accounts.id],
  }),
}));

export const yearEndClosingAudit = sqliteTable('year_end_closing_audit', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  financialYearId: text('financial_year_id').references(() => financialYears.id).notNull(),
  closingJournalEntryId: text('closing_journal_entry_id').notNull(),
  netIncomeAmount: real('net_income_amount').notNull(),
  closedByUserId: text('closed_by_user_id').notNull(),
  closedAt: integer('closed_at', { mode: 'timestamp' }).defaultNow().notNull(),
});
