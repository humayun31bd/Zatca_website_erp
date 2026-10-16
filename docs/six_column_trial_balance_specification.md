# 6-Column Periodic Trial Balance Specification

**Module:** Financial Accounting & General Ledger  
**Component:** 6-Column Periodic Trial Balance Statement (Arbitrary Date Ranges)  
**Status:** Implemented  
**Target Stack:** Node.js / Next.js / TypeScript / Drizzle ORM / SQLite  

---

## 1. Overview & Business Definition

The **6-Column Trial Balance** (also known as the *Periodic Trial Balance* or *Extended Trial Balance*) is the primary verification tool used by auditors and financial controllers to verify:
1. **Initial Position (Opening Balance)** as of the beginning of any arbitrary reporting window $[T_{start}, T_{end}]$.
2. **Activity & Turnovers (Transactional Balance)** during the selected window.
3. **Ending Position (Closing Balance)** as of the end of the window.

### Structure of the 6 Columns

| Column Group | Column 1 | Column 2 | Accounting Meaning |
|---|---|---|---|
| **1. Opening Balance** | **Opening Debit** | **Opening Credit** | Cumulative financial state as of the millisecond before $T_{start}$. |
| **2. Transactional Balance** | **Transaction Debit** | **Transaction Credit** | Raw gross debit and credit turnovers recorded between $T_{start}$ and $T_{end}$. |
| **3. Closing Balance** | **Closing Debit** | **Closing Credit** | Net financial state as of $T_{end}$ inclusive: $\text{Opening} + \text{Period Turnovers}$. |

---

## 2. Mathematical & Accounting Invariants

For **ANY arbitrary date range** $[T_{start}, T_{end}]$ (e.g., custom weeks, quarters, odd dates like 15-Mar to 22-Oct):

### 1. Opening Balance Resolution
$$\text{Opening Net} = (\text{Annual Frozen Opening Debit} + \sum_{FY.from}^{T_{start}-1} \text{Debit}) - (\text{Annual Frozen Opening Credit} + \sum_{FY.from}^{T_{start}-1} \text{Credit})$$
- If $\text{Opening Net} > 0$: $\text{Opening Debit} = \text{Opening Net}, \quad \text{Opening Credit} = 0$.
- If $\text{Opening Net} < 0$: $\text{Opening Debit} = 0, \quad \text{Opening Credit} = |\text{Opening Net}|$.

### 2. Transactional Movement Turnovers
$$\text{Transaction Debit} = \sum_{T_{start}}^{T_{end}} \text{Debit}, \quad \text{Transaction Credit} = \sum_{T_{start}}^{T_{end}} \text{Credit}$$

### 3. Closing Balance Resolution
$$\text{Closing Net} = (\text{Opening Debit} - \text{Opening Credit}) + (\text{Transaction Debit} - \text{Transaction Credit})$$
- If $\text{Closing Net} > 0$: $\text{Closing Debit} = \text{Closing Net}, \quad \text{Closing Credit} = 0$.
- If $\text{Closing Net} < 0$: $\text{Closing Debit} = 0, \quad \text{Closing Credit} = |\text{Closing Net}|$.

### 4. Tri-Column Equation Invariant
The report mathematically validates three separate equilibrium checks:
$$\sum \text{Opening Debit} \equiv \sum \text{Opening Credit}$$
$$\sum \text{Transaction Debit} \equiv \sum \text{Transaction Credit}$$
$$\sum \text{Closing Debit} \equiv \sum \text{Closing Credit}$$

---

## 3. Implementation Details

- **Calculation Engine:** [backend/src/lib/accounting/trial_balance_service.ts](file:///e:/aiprojects/Zatca_website/backend/src/lib/accounting/trial_balance_service.ts)
- **API Routes:**
  - `GET /api/v1/accounting/reports/trial-balance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&level=5&hideZero=true`
  - `GET /api/v1/reports/trial-balance` (Enhanced with backwards compatibility)

### Sample JSON Output

```json
{
  "status": "SUCCESS",
  "dateRange": {
    "fromDate": "2026-03-01T00:00:00.000Z",
    "toDate": "2026-06-30T23:59:59.999Z",
    "label": "From 2026-03-01 to 2026-06-30"
  },
  "rows": [
    {
      "code": "1.10.01.001.001",
      "name": "Petty Cash - Main Branch",
      "type": "ASSET",
      "level": 5,
      "openingDebit": 5000.00,
      "openingCredit": 0.00,
      "transactionDebit": 12450.00,
      "transactionCredit": 11200.00,
      "closingDebit": 6250.00,
      "closingCredit": 0.00
    }
  ],
  "totals": {
    "openingDebit": 250000.00,
    "openingCredit": 250000.00,
    "transactionDebit": 84300.00,
    "transactionCredit": 84300.00,
    "closingDebit": 284500.00,
    "closingCredit": 284500.00
  },
  "invariants": {
    "openingBalanced": true,
    "transactionsBalanced": true,
    "closingBalanced": true,
    "allBalanced": true
  }
}
```
