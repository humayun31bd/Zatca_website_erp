# PRD: UAE WPS Payroll Module

**Product:** SaaS ERP + POS for UAE SMEs
**Module:** Payroll with Wage Protection System (WPS) compliance
**Version:** 0.1 (Draft)
**Status:** For review
**Owner:** [Product Manager]
**Date:** 3 October 2026

> **Verification note.** Regulatory and file-format details below are based on public secondary sources and general knowledge of UAE labour rules. Before build, confirm every format rule against the current MOHRE WPS specification and the specific bank/exchange-house SIF requirements. Items needing confirmation are tagged **[VERIFY]**.

---

## 1. Overview

### 1.1 Summary
A payroll module inside the ERP that lets UAE SMEs calculate monthly pay, generate a bank-ready WPS Salary Information File (SIF), track submission and rejection, and stay compliant on end-of-service gratuity and document expiries, without leaving the ERP or re-keying data into a bank portal.

### 1.2 Problem
- Most UAE employers must pay salaries through WPS: the employer's bank sends funds to an approved agent (bank, exchange house or financial institution), which credits employee accounts, with each transfer matched against a SIF listing every employee's pay.
- SMEs commonly build SIFs by hand in Excel. A single wrong ID, IBAN, routing code or total causes bank rejection, late salaries and possible MOHRE flags.
- Persistent non-payment can block work-permit issuance and renewals for the whole establishment **[VERIFY current enforcement]**.
- Payroll is usually disconnected from HR records, attendance and accounting, causing double entry and reconciliation errors.

### 1.3 Goals
1. Generate a SIF that passes bank validation on first submission (target 99%+ first-pass acceptance).
2. Cut monthly payroll run time for a 25-employee company to under 15 minutes.
3. Post payroll journals to the general ledger automatically.
4. Warn users about compliance risks (expiring documents, invalid IBANs, late payment) before they become penalties.

### 1.4 Non-goals (v1)
- Direct payment initiation or bank API money movement (SIF file download only in v1).
- Free-zone-specific schemes (e.g. DIFC/ADGM end-of-service savings schemes) beyond configuration flags. Phase 2.
- Multi-country payroll.
- Becoming a licensed WPS agent or financial institution.
- Government portal submission automation unless an official API is available **[VERIFY]**.

---

## 2. Users and personas

| Persona | Needs |
|---|---|
| **HR/Payroll admin** (owner-operator or office manager) | Run payroll fast, avoid rejections, no technical jargon |
| **Finance manager / accountant** | Accurate ledger postings, payroll cost reports, audit trail |
| **Business owner** | Approve payroll, see cost and compliance status at a glance |
| **Employee** (self-service, phase 2) | Payslips, leave balance, gratuity estimate |
| **External accountant / PRO** | Multi-client access, bulk file generation |

---

## 3. Scope

### 3.1 In scope (v1 / MVP)
- Employee payroll master data (salary structure, bank details, WPS identifiers)
- Monthly pay run: earnings, deductions, loans/advances, unpaid leave, overtime
- WPS SIF generation (EDR + SCR), validation and download
- Payslips (bilingual Arabic/English PDF)
- End-of-service gratuity (EOSB) calculation and accrual
- Visa, labour card and Emirates ID expiry tracking with alerts
- Payroll journal posting to GL
- Payment status tracking (generated, submitted, accepted, rejected, paid)
- Audit log and role-based access

### 3.2 Out of scope (v1), planned later
- Employee self-service app
- Attendance/biometric device integration
- Bank API payment initiation
- Free-zone savings schemes, multi-entity consolidation
- Mid-month/off-cycle bulk corrections beyond a supplementary run

---

## 4. Functional requirements

Priority: **P0** = MVP must-have, **P1** = MVP should-have, **P2** = post-MVP.

### 4.1 Company WPS configuration

| ID | Requirement | Priority |
|---|---|---|
| WPS-C1 | Store employer MOHRE establishment ID (13-digit; validate length/digits) | P0 |
| WPS-C2 | Store employer's WPS bank/agent name and 9-digit routing code; validate against a maintained routing-code reference list | P0 |
| WPS-C3 | Support multiple establishments (establishment IDs) per tenant | P1 |
| WPS-C4 | Configure pay cycle (monthly default), pay date, and cut-off day | P0 |
| WPS-C5 | Bank-specific SIF profile (file extension, delimiter, header/footer variants) selectable per bank **[VERIFY per bank]** | P1 |

### 4.2 Employee payroll profile

| ID | Requirement | Priority |
|---|---|---|
| WPS-E1 | Fields: full name (English/Arabic), nationality, joining date, 14-digit MOHRE labour card/person number, Emirates ID, passport, visa expiry | P0 |
| WPS-E2 | Bank details: IBAN (23 characters, starts with "AE"), employee bank/agent routing code | P0 |
| WPS-E3 | Validate IBAN length, structure and check digits (mod-97) on entry | P0 |
| WPS-E4 | Check that the IBAN's embedded bank code is consistent with the selected routing code **[VERIFY mapping]** | P1 |
| WPS-E5 | Salary structure: basic, housing, transport, other allowances, with effective-dated changes | P0 |
| WPS-E6 | Payment method flag: WPS-bank, salary card, cash/exempt (with reason) | P1 |
| WPS-E7 | Employment status: active, on leave, terminated, absconding, with dates | P0 |
| WPS-E8 | Contract type (unlimited/fixed, as applicable under current law) and probation dates | P1 |
| WPS-E9 | Bulk import via Excel/CSV with row-level error report | P0 |

### 4.3 Pay run

| ID | Requirement | Priority |
|---|---|---|
| WPS-P1 | Create pay run for a period; auto-populate active employees with current salary structure | P0 |
| WPS-P2 | Variable inputs per employee: overtime, bonus, commission, other earnings | P0 |
| WPS-P3 | Deductions: unpaid leave, absence, loans/advances (with installment schedules), fines (with limits **[VERIFY legal caps]**) | P0 |
| WPS-P4 | Proration for joiners/leavers and partial months | P0 |
| WPS-P5 | Pull leave data from ERP HR module; approved unpaid leave flows into pay run | P1 |
| WPS-P6 | Pull POS-based commissions/incentives from sales data | P2 |
| WPS-P7 | Draft, review, approve, lock workflow with approver roles; locked runs cannot be edited, only reversed | P0 |
| WPS-P8 | Supplementary/off-cycle run | P1 |
| WPS-P9 | Pre-run compliance checklist (missing IBAN, expired documents, missing labour card number) | P0 |
| WPS-P10 | Net pay shown as fixed salary vs. variable pay, matching SIF structure | P0 |

### 4.4 SIF generation

The SIF is a text file with one Salary Control Record (SCR) first, followed by one Employee Detail Record (EDR) per employee.

**Filename convention [VERIFY]:** establishment ID + `YYMMDD` + `HHMMSS` + `.sif`. The date/time in the name must match the values in the SCR, or the file may be rejected.

**EDR fields (typical):**

| Field | Rule |
|---|---|
| Record type | `EDR` |
| Person/Employee ID | 14-digit MOHRE labour card number; left-pad with zeros if shorter |
| Employee agent ID | 9-digit routing code of the employee's bank/agent |
| Employee account | IBAN, 23 characters starting with `AE` |
| Pay period | Start and end dates, days in period |
| Fixed salary | Amount, 2 decimals |
| Variable pay | Amount, 2 decimals |
| Days on leave | Integer |

**SCR fields (typical):**

| Field | Rule |
|---|---|
| Record type | `SCR` |
| Employer ID | MOHRE establishment ID |
| Employer agent ID | 9-digit routing code of employer's bank |
| File creation date and time | Must match filename |
| Salary month | `MMYYYY` |
| Total salaries | Must equal the sum of all EDR amounts to the fils |
| Record count | Must equal the number of EDR rows |
| Currency | `AED` |

> Exact field order, delimiter and header layout differ by bank/agent and change over time. The product must make the layout a **configurable template**, not hard-coded. **[VERIFY with the target banks' current specs.]**

| ID | Requirement | Priority |
|---|---|---|
| WPS-S1 | Generate a SIF from a locked pay run using the configured bank profile | P0 |
| WPS-S2 | Block generation if validation errors exist; show error list grouped by employee and field with a one-click jump to fix | P0 |
| WPS-S3 | Validate: record count, total equals sum of EDRs, ID lengths, routing code length, IBAN format and check digits, non-negative amounts, 2-decimal precision, filename/timestamp consistency | P0 |
| WPS-S4 | Handle zero or negative net pay (exclude or flag; do not write negative values) | P0 |
| WPS-S5 | Preview file before download; download as `.sif`/`.csv`/`.txt` per bank profile | P0 |
| WPS-S6 | Regenerate with versioning; previous versions retained with timestamps and user | P0 |
| WPS-S7 | Mark file status: Generated, Submitted to bank, Accepted, Rejected (with reason), Paid | P0 |
| WPS-S8 | Capture bank rejection message and map common rejection codes to plain-language fixes | P1 |
| WPS-S9 | Generate a reconciliation report (SIF totals vs. payroll register vs. GL) | P1 |
| WPS-S10 | Bank-specific "dry run" test mode that validates but flags the file as non-final | P2 |

### 4.5 Payslips

| ID | Requirement | Priority |
|---|---|---|
| WPS-PS1 | Bilingual (English/Arabic RTL) payslip PDF with earnings, deductions, net pay, leave balance | P0 |
| WPS-PS2 | Bulk generate and email; password-protected PDF option | P1 |
| WPS-PS3 | Retain payslips per statutory record-keeping requirements **[VERIFY retention period]** | P0 |

### 4.6 End-of-service gratuity (EOSB)

Summary of current UAE private-sector rules (Federal Decree-Law No. 33 of 2021 and executive regulations) **[VERIFY with legal counsel before release]**:

- Eligibility generally requires at least one year of continuous service.
- 21 days of basic wage per year for the first five years, and 30 days per year thereafter.
- Total gratuity capped at two years of total wage.
- Calculated on **basic wage**, with different treatment for fixed-term vs. unlimited contracts and resignation vs. termination cases.

| ID | Requirement | Priority |
|---|---|---|
| WPS-G1 | Calculate gratuity on termination/resignation using configurable rule set (rates, cap, eligibility) | P0 |
| WPS-G2 | Monthly accrual provision per employee with GL posting | P1 |
| WPS-G3 | Final settlement statement: gratuity, unused leave encashment, notice pay, deductions, loans outstanding | P0 |
| WPS-G4 | Rule set versioned and effective-dated so law changes do not alter historical results | P0 |
| WPS-G5 | Gratuity "what if" estimator for owner (all employees, as of a date) | P2 |

### 4.7 Document expiry and compliance alerts

| ID | Requirement | Priority |
|---|---|---|
| WPS-D1 | Track visa, labour card/work permit, Emirates ID and passport expiry per employee | P0 |
| WPS-D2 | Alerts at 90/60/30/7 days via in-app, email and WhatsApp (if enabled) | P1 |
| WPS-D3 | Compliance dashboard: expired documents, employees not paid, files rejected, upcoming pay deadlines | P0 |
| WPS-D4 | Alert if the pay date is approaching without an approved pay run or submitted SIF | P1 |
| WPS-D5 | Optional mandatory unemployment insurance (ILOE) status field per employee **[VERIFY current rules]** | P2 |

### 4.8 Accounting integration

| ID | Requirement | Priority |
|---|---|---|
| WPS-A1 | Auto-post payroll journal on approval: salary expense (by department/cost center), payroll payable, deductions, loans receivable, EOSB provision | P0 |
| WPS-A2 | On "Paid" status, post bank clearing entry and settle payroll payable | P1 |
| WPS-A3 | Cost allocation by branch/outlet (linked to POS branches) | P1 |
| WPS-A4 | Payroll cost report by department, branch, month; headcount trend | P1 |

### 4.9 Security and access

| ID | Requirement | Priority |
|---|---|---|
| WPS-X1 | Role-based access: payroll admin, approver, viewer, auditor | P0 |
| WPS-X2 | Field-level protection for salary, IBAN, Emirates ID (masked by default) | P0 |
| WPS-X3 | Complete audit log of changes to salary, bank details, pay runs and file generation | P0 |
| WPS-X4 | Two-person approval option for pay runs above a configurable threshold | P1 |

---

## 5. Key workflows

### 5.1 Monthly payroll run
1. Payroll admin opens a new pay run for the period.
2. System pre-fills employees and runs the compliance checklist.
3. Admin enters variable pay and reviews deductions.
4. Approver reviews and locks the run.
5. System validates and generates the SIF.
6. Admin downloads the file and uploads it to the bank portal; marks status "Submitted".
7. Admin updates status (Accepted/Rejected/Paid), or system receives status from a bank integration in later phases.
8. System posts the journal and issues payslips.

### 5.2 Rejected file
1. Admin pastes or uploads the bank's rejection reason.
2. System maps it to the probable field/employee and highlights the fix.
3. Admin corrects the data, regenerates (new version) and resubmits.

### 5.3 Employee exit
1. HR records exit date and reason.
2. System prorates the final month, calculates gratuity, leave encashment and deductions.
3. Final settlement is approved and included in a pay run or off-cycle run.
4. Employee is marked inactive after payment.

---

## 6. Data model (high level)

- **Establishment**: id, MOHRE establishment ID, bank/agent, routing code, SIF profile
- **Employee**: id, names (EN/AR), labour card number, Emirates ID, passport, nationality, join/exit dates, status
- **EmployeeBank**: employee id, IBAN, routing code, payment method
- **SalaryStructure**: employee id, basic, allowances, effective from/to
- **Document**: employee id, type (visa, labour card, EID, passport), number, expiry
- **PayRun**: id, period, status, approvals, locked_at
- **PayRunLine**: pay run id, employee id, earnings, deductions, net, fixed, variable, unpaid-leave days
- **SIFFile**: id, pay run id, version, filename, generated_at, generated_by, hash, status, bank_response
- **GratuityRuleSet**: version, effective dates, rates, cap, eligibility
- **LoanAdvance**: employee id, amount, installments, balance
- **AuditLog**: entity, field, old/new, user, timestamp

---

## 7. Validation rules (summary)

| Rule | Check |
|---|---|
| Establishment ID | Present, numeric, valid length |
| Labour card number | 14 digits, left-padded with zeros if shorter, no spaces |
| IBAN | 23 characters, `AE` prefix, mod-97 check digits |
| Routing codes | 9 digits, present in reference list |
| Totals | SCR total equals sum of EDR fixed + variable to the fils |
| Record count | SCR count equals EDR rows |
| Amounts | No negatives, 2 decimals, AED |
| Period | Matches salary month in SCR |
| Filename | Establishment ID + timestamp matches SCR |
| Status | Terminated employees excluded unless in final settlement |

---

## 8. Non-functional requirements

- **Accuracy:** payroll arithmetic uses decimal types, never floating point; rounding rules documented and consistent between payslip, ledger and SIF.
- **Performance:** generate and validate a 500-employee SIF in under 10 seconds.
- **Availability:** 99.9% monthly, with extra attention in the last 3 days of each month and first 5 days of the next.
- **Security:** encryption in transit and at rest; salary and ID data treated as sensitive personal data; UAE-region hosting preferred; compliance with UAE PDPL **[VERIFY applicability]**.
- **Auditability:** immutable logs; locked pay runs reproducible from stored inputs.
- **Localization:** full Arabic/English UI and documents; Hijri and Gregorian date display.
- **Accessibility:** WCAG 2.1 AA for admin screens.
- **Data retention:** configurable per statutory minimum **[VERIFY]**.

---

## 9. Integrations

| Integration | Phase | Notes |
|---|---|---|
| ERP HR module (employees, leave) | MVP | Internal |
| ERP accounting (GL, cost centers) | MVP | Internal |
| POS branches/commissions | P1/P2 | Internal |
| Bank portals (file upload) | MVP | Manual upload; per-bank profiles |
| Bank APIs (status, payment) | Later | Depends on bank partnerships |
| MOHRE systems | Later | Only if an official API exists **[VERIFY]** |
| Email/WhatsApp | P1 | Alerts and payslips |

---

## 10. Success metrics

| Metric | Target |
|---|---|
| First-submission SIF acceptance rate | 99%+ |
| Time to complete monthly payroll (25 employees) | Under 15 minutes |
| Customers on time (salary paid by pay date) | 95%+ |
| Payroll module adoption among ERP customers | 40% within 12 months |
| Support tickets related to SIF rejection | Below 2% of pay runs |
| Expired-document incidents among active customers | Decreasing quarter over quarter |

---

## 11. Release plan

| Phase | Scope | Indicative duration |
|---|---|---|
| **0. Discovery** | Confirm MOHRE and bank specs with 3 to 5 target banks/exchange houses; legal review of gratuity rules; pilot customer recruitment | 3 to 4 weeks |
| **1. MVP** | Employee profiles, pay run, SIF generation + validation, payslips, GL posting, document expiry tracking | 10 to 14 weeks |
| **2. Beta** | 5 to 10 pilot SMEs; rejection feedback loop; EOSB final settlement | 6 weeks |
| **3. GA** | Hardening, bank profile library, accountant multi-client view | 6 weeks |
| **4. Expansion** | Employee self-service, attendance import, bank status APIs, free-zone schemes | Roadmap |

Timelines are planning assumptions and should be re-estimated with engineering.

---

## 12. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| SIF layout varies by bank and changes over time | Rejected files, support load | Configurable bank profiles; per-bank test files; regression suite of known-good samples |
| Law changes (gratuity, WPS enforcement) | Wrong calculations | Effective-dated rule sets; legal advisory subscription; changelog |
| Incorrect source data (IDs, IBANs) | Rejections | Strict input validation; pre-run checklist; import error reports |
| Sensitive data breach | Legal and reputational harm | Encryption, field masking, RBAC, audit, UAE hosting |
| Users expect payment execution, not only file generation | Adoption friction | Clear positioning; roadmap for bank API partnerships |
| Free-zone and special-case employers | Feature gaps | Capture in discovery; configuration flags in v1 |

---

## 13. Dependencies

- Reference data: UAE bank/agent routing code list (maintained and updatable)
- Legal review of gratuity and deduction rules
- ERP HR and accounting modules (employee master, GL)
- Pilot banks/exchange houses for sample SIFs and rejection codes
- Arabic payslip template design

---

## 14. Open questions

1. Which banks and exchange houses will we support first, and do we have sample SIF specifications from each?
2. Are there official MOHRE or Central Bank APIs for submission/status that we can legitimately integrate?
3. Do we target mainland only at launch, or also free zones with different payroll schemes?
4. Will we handle cash-paid or WPS-exempt employees (e.g. certain categories) in v1?
5. Should we support multiple currencies for allowances or salaries stated in foreign currency?
6. What retention period and data residency commitments do enterprise customers require?
7. Pricing model: per employee per month, per pay run, or bundled in ERP tiers?

---

## 15. Acceptance criteria (MVP)

- A pay run for at least 100 employees can be created, approved, locked and exported as a SIF in the configured bank profile.
- Intentionally broken data (bad IBAN, wrong length ID, mismatched totals) is blocked with specific, actionable messages.
- Generated SIFs for at least three target banks are accepted in their test or production environments.
- Gratuity results match a legal-reviewed set of at least 20 test scenarios.
- Payroll journal reconciles to payslips and SIF totals to the fils.
- Audit log shows who changed salary or bank details and when.

---

## Appendix A: Sources consulted

- Zoho Payroll academy, WPS SIF file format guide (structure, ID lengths, IBAN length, total and record count rules)
- ZenHR WPS UAE page (payment channel, EDR/SCR field descriptions, filename convention, enforcement notes)
- Third-party Odoo UAE payroll listing (feature examples: WPS export, EOSB, expiry tracking)

These are secondary sources. Primary sources to obtain: MOHRE WPS documentation, Central Bank of the UAE routing-code list, and each bank's SIF specification.
