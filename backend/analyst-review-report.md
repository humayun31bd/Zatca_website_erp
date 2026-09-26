# 🔍 Senior System Analyst Review Report

**Reviewed By:** Senior System Analyst
**Date:** 2026-09-19
**Files Reviewed:** `dfd.md`, `database.md`

---

## DFD Issues Found & Fixed

| # | Severity | Issue | Fix Applied |
| :--- | :--- | :--- | :--- |
| 1 | 🔴 High | **Process 5.0 (Billing) missing Level 2 decomposition.** All other processes (1.0–4.0) have Level 2 breakdowns but 5.0 was skipped. Violates DFD leveling consistency. | Added Level 2 DFD for Process 5.0 with sub-processes 5.1–5.4 |
| 2 | 🔴 High | **Context Diagram: DLQ is NOT an external entity.** DLQ is an internal data store (D5), not an external system. Showing it as an external entity violates DFD rules — entities must be outside system boundary. | Removed DLQ from Context Diagram external entities. DLQ correctly remains as D5 in Level 1. |
| 3 | 🟡 Medium | **Context Diagram: Billing flow direction inverted.** Flow 11 shows Billing → System ("Usage Credit Deducted") which implies Billing pushes deductions. In reality, the System deducts credits internally and reports usage to Billing. | Fixed flow direction: System sends usage data to Billing, Billing returns subscription status. |
| 4 | 🟡 Medium | **Level 1: Process 5.0 writes credits to D1 (Tenants DB) instead of D2.** Billing credits should be logged in D2 (Transaction Logs) or a dedicated store, not in the Tenants table. D1 is for tenant config, not financial transactions. | Changed P5 write target from D1 to D2, added read from D1 for tenant plan lookup. |
| 5 | 🟡 Medium | **Data Flow Table missing 4 flows.** Flows 29–32 are missing: Admin → D1 (key management), Billing ↔ P5 (subscription sync), and P5 → D2 (credit logging). | Added flows 29–32. |
| 6 | 🟢 Low | **Validation Report row 3 claims "All 4 core processes decomposed" but there are 5 processes (1.0–5.0).** Inconsistency between actual content and validation claim. | Updated validation to reflect 5 processes. |

## Database Issues Found & Fixed

| # | Severity | Issue | Fix Applied |
| :--- | :--- | :--- | :--- |
| 7 | 🔴 High | **`invoices` table missing `UNIQUE(tenant_id, invoice_number)` constraint.** An agency could accidentally submit duplicate invoice numbers. ZATCA requires unique invoice numbers per taxpayer. | Added composite unique constraint. |
| 8 | 🔴 High | **`invoices.seller_vat` missing CHECK constraint.** Unlike `tenants.vat_number`, the seller VAT field has no regex validation, so malformed VATs could slip into the DB. | Added `CHECK (seller_vat ~ '^3[0-9]{13}3$')` |
| 9 | 🔴 High | **`billing_credits` table has race condition in credit balance.** The `balance_after` field is derived from reading the latest row then inserting, but under concurrent requests this can cause double-spend. | Added `SERIALIZABLE` isolation level note + advisory lock in the transaction code. |
| 10 | 🟡 Medium | **`invoices.total_amount` allows negative values but `subtotal_amount` doesn't.** Credit notes (type_code `381`) can have negative totals, but currently no CHECK distinguishes this — `subtotal_amount >= 0` would reject valid credit notes. | Changed to: subtotal CHECK only for type_code `388`, removed CHECK for credit notes. Added comment. |
| 11 | 🟡 Medium | **`whatsapp_messages` relationship listed as One-to-One with `invoices` but schema allows multiple.** A retry scenario could send multiple WA messages for the same invoice. Relationship table says One-to-One but actual FK has no UNIQUE constraint. | Changed relationship to One-to-Many with note about retry scenarios. |
| 12 | 🟡 Medium | **`audit_logs` table missing `updated_at` column.** While audit logs are immutable, the schema inconsistency with other tables makes ORM mapping fragile. | Confirmed immutable design — added explicit comment that `updated_at` is intentionally omitted. |
| 13 | 🟡 Medium | **Aggregation 6.4 (Credit Balance) is wrong.** `REFUND` should add to balance (it's money returned to tenant), but the query subtracts it alongside `DEDUCT`. | Fixed: REFUND now adds to balance. |
| 14 | 🟢 Low | **Sample data `invoiceHash` is a dummy string.** While it's sample data, it's not a valid 44-char Base64 SHA-256 hash (it decodes to "abcdefghijklmnopqrstuvwxyz123456" which is 32 bytes but the Base64 is 40 chars, not 44). | Fixed to a proper 44-char Base64 SHA-256. |
| 15 | 🟢 Low | **Missing `updated_at` trigger.** Tables have `updated_at` columns but no PostgreSQL trigger to auto-update them. Prisma handles this, but raw SQL migrations would not. | Added trigger function in schema section. |
