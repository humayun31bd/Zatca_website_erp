# existing project folder
E:\aiprojects\multibrancherp\prd_hrm.md
E:\aiprojects\multibrancherp\Modules\HumanResource\HumanResource.php

# Product Requirements Document: Human Resource Management (HRM)

## 1. Purpose

The Human Resource Management module provides a centralized employee, attendance, leave, payroll, and workforce administration capability within the ERP. It supports branch-aware employee records and connects payroll activity with the accounting module.

This PRD documents the functionality currently represented by the `Modules/HumanResource` module. It is an implementation-aligned specification, not a proposal for an unrelated HR platform.

## 2. Objectives

- Maintain a single, searchable employee record for active and inactive staff.
- Organize employees by department, sub-department, division, position, duty type, and employee type.
- Capture attendance, working hours, holidays, weekly holidays, and roster assignments.
- Manage leave policies, annual entitlements, applications, and approvals.
- Calculate, approve, and publish monthly salaries using attendance and employee pay rules.
- Support both bank/regular payroll and cash payroll processes.
- Track employee advances, loans, installment deductions, allowances, and deductions.
- Provide printable employee documents, payslips, ID cards, and HR operational reports.
- Enforce authenticated access and permission-based actions for sensitive HR data.

## 3. Scope

### In scope

1. Employee master data and employment lifecycle.
2. Organizational and HR configuration.
3. Attendance entry, bulk entry, and monthly import.
4. Rosters, holidays, and working-calendar rules.
5. Leave setup, entitlement generation, application, and approval.
6. Regular payroll, salary approval, payslips, and payroll accounting linkage.
7. Cash payroll with separate setup and approval flow.
8. Employee advances and loans.
9. HR reports and filtered operational views.
10. Bank information, employee files, and employee ID card printing.

### Out of scope or not currently evidenced

- Recruitment, applicant tracking, onboarding task management, and performance reviews.
- Benefits administration, pension administration, and time-off self-service portals.
- A production biometric-device integration API. The module has attendance data structures and an API route placeholder, but the registered API route does not currently expose biometric synchronization endpoints.
- Automated payroll disbursement through a bank gateway.

## 4. Users and Access

The module is available to authenticated users under the `/hr` route prefix. Access to operations is controlled through named permissions, including employee, attendance, leave, payroll, loan, and report permissions.

| User | Main responsibilities |
| --- | --- |
| HR administrator | Maintain HR configuration and employee records; manage attendance, leave, payroll, and reports. |
| Payroll officer | Configure salary rules, generate payroll, review salary charts, approve payroll, and issue payslips. |
| HR or branch manager | Review staff attendance and approve assigned leave applications where permitted. |
| Finance/accounting user | Consume payroll accounting entries and review payroll-related financial impact. |
| Employee | Employee record, payslip, attendance, and leave visibility where the wider application grants those permissions. |

The exact role-to-permission mapping is maintained by the application authorization configuration and must not be inferred solely from the UI.

## 5. Functional Requirements

### 5.1 Employee and Organization Management

The system shall:

- Create, view, update, deactivate, and list employees separately from inactive employees.
- Create or associate an application user account for a new employee.
- Store personal information including name, date of birth, gender, marital status, blood group, national ID, contact details, and profile image.
- Store employment information including joining date, promotion date, department, sub-department, position, division, duty type, employee type, work city, roster, and active/left status.
- Store emergency contact information and present/permanent addresses.
- Store bank account details, tax identification number, gross salary, academic qualifications, employee files, certificates, skills, and other supporting documents.
- Support configurable employee skill and certificate types.
- Generate a downloadable employee profile/document and print employee ID cards.
- Associate employees with the current branch/outlet context used by the ERP.

### 5.2 HR Configuration

Authorized users shall be able to maintain:

- Departments and sub-departments.
- Divisions and positions.
- Genders, employee types, duty types, and pay frequencies.
- Bank master data and employee bank information.
- Salary setup rules for time, allowance, and deduction components.
- Weekly holidays and date-range holidays.
- Roster definitions, including start/end times and roster assignments.

Configuration records should support active/inactive status where provided so historical employee and payroll records remain interpretable.

### 5.3 Attendance and Workforce Scheduling

The system shall:

- Record employee attendance events with date/time and employee association.
- Allow authorized users to enter individual attendance records.
- Allow bulk attendance entry and monthly attendance entry.
- Accept monthly attendance bulk import through the HR interface.
- Display attendance by employee, department, position, and date filters where supported.
- Derive daily in-time and out-time from attendance events for job-card and attendance reporting.
- Distinguish present, absent, holiday, and weekend days in job-card reporting.
- Use weekly holidays, date-range holidays, roster information, and attendance records during payroll calculation.

### 5.4 Leave Management

The system shall:

- Define leave types and their annual entitled days.
- Configure weekly holidays used by the leave calendar.
- Generate employee leave entitlements for a financial year without duplicating existing employee/year records.
- Submit, edit, view, and delete leave applications with employee, leave type, date range, requested days, reason, and optional attachment.
- Validate the application against the financial year associated with the requested start date.
- Support manager approval and HR/final approval as separate approval states.
- Record approver, approval date, approved date range, approved days, and approval descriptions.
- Update the employee leave balance by recording taken days after approval.
- Provide leave application, approval, balance, and summary reporting.

### 5.5 Regular Payroll

The monthly payroll process shall:

1. Accept a salary month and reject duplicate salary-sheet generation for the same month.
2. Create a payroll sheet with the month, date range, generation date, and generating user.
3. Include active employees who have not been marked as left.
4. Calculate attendance days, working days, holidays, weekly holidays, approved leave, absence, and leave without pay.
5. Apply employee-specific basic salary, allowance, and deduction components.
6. Include eligible salary advances and loan installments as deductions.
7. Calculate gross salary, total allowances, total deductions, and net salary.
8. Record attendance counts and normal/actual working hours on the employee salary record.
9. Update paid salary advances and loan installment progress when payroll is generated.
10. Provide salary charts, employee salary listings, approval screens, and downloadable PDF payslips.
11. Support deletion of an unneeded salary sheet only for authorized users.
12. Post or prepare accounting impact through the existing accounting integration used by the payroll controller.

Payroll generation must be transactional: a failed generation must not leave a partially generated salary sheet or partial loan/advance updates.

### 5.6 Cash Payroll

The system shall provide a separate cash-payroll flow that supports:

- Cash salary setup by employee.
- Cash salary generation for a selected period.
- Cash salary charts.
- Cash payroll approval.
- Deletion of a cash salary sheet by authorized users.

Cash payroll records must remain distinguishable from regular payroll records for review, approval, reporting, and reconciliation.

### 5.7 Salary Advances and Loans

The system shall:

- Record employee salary advances by salary month and amount.
- Track whether an advance has been released/paid and include eligible advances in payroll deductions.
- Create and manage employee loans, repayment start dates, installment periods, installment amounts, released amounts, and active status.
- Advance the cleared-installment count and released amount when a loan installment is included in payroll.
- Provide loan listings, employee-level loan views, disbursement reports, and employee loan reports.

### 5.8 Reports and Outputs

Authorized users shall have access to:

- Staff attendance report and attendance detail by employee/date.
- Employee job card report for a date range.
- Attendance summary and employee-wise attendance summary.
- Contract renewal report.
- Allowance report filtered by department and position.
- Deduction report filtered by department.
- Leave report filtered by date and department.
- Salary advance report.
- Loan and loan disbursement reports.
- Employee salary list, salary chart, and PDF payslip.
- Employee and inactive-employee lists.

Reports should preserve the selected filters in the rendered result and support the existing table/print/download behavior provided by each view.

## 6. Core Workflows

### Employee lifecycle

`Create employee` -> `Create/associate user` -> `Assign organization and pay rules` -> `Store documents and bank data` -> `Active employment` -> `Deactivate or mark left` -> `Inactive history`

### Leave lifecycle

`Configure leave type` -> `Generate annual entitlement` -> `Submit application` -> `Manager approval` -> `HR/final approval` -> `Update taken balance` -> `Leave report`

### Payroll lifecycle

`Configure salary rules` -> `Maintain attendance and holidays` -> `Record advances/loans` -> `Generate monthly salary` -> `Review salary chart` -> `Approve salary` -> `Publish/download payslip` -> `Accounting/reconciliation`

## 7. Business Rules and Data Integrity

- Employee email and phone values used to create the linked application user must be unique.
- Payroll generation for a salary month must be idempotent and reject an existing salary sheet for that month.
- Only active, not-left employees are eligible for normal monthly payroll generation.
- Leave applications must map to an existing financial year based on the application start date.
- Leave entitlements must not be generated twice for the same employee, leave type, and financial year.
- Approved leave, holidays, weekly holidays, attendance, salary components, advances, and loans must be considered consistently by payroll calculation.
- Changes to sensitive employee, payroll, approval, and loan records must be restricted by permission and recorded by the application where audit fields are available.
- Uploaded employee and leave documents must use managed storage and retain their employee/leave association.
- Payroll and cash-payroll records must not be mixed in reports or approval screens unless the report explicitly requests both.

## 8. Integrations and Dependencies

- **Authentication and authorization:** Laravel authentication, application users, and permission middleware.
- **Accounting:** Existing Accounts module for payroll-related accounting entries and financial-year validation.
- **Branch and outlet context:** Current session branch/outlet and branch master data.
- **File storage:** Public managed storage for employee images, documents, academic attachments, and leave attachments.
- **PDF output:** Dompdf-based employee and payslip document generation.
- **Data tables:** Server-rendered DataTables for large employee, attendance, leave, salary, and report lists.
- **Future attendance integration:** A documented API contract is required before connecting biometric devices or external attendance systems; the current HR API route is not such an integration.

## 9. Non-Functional Requirements

- Sensitive employee and salary data must require authentication and permission checks.
- Payroll generation and approval operations must be auditable and transaction-safe.
- Lists and reports must remain usable for a large employee population through server-side filtering/pagination.
- Uploaded files must be validated, stored outside direct application code, and linked to the owning record.
- Date and financial-year calculations must use the ERP's configured timezone and financial-year conventions.
- Historical payroll, attendance, leave, and loan records must remain readable after an employee is deactivated.

## 10. Acceptance Criteria

The HRM module is considered operational when:

- An authorized HR user can create an employee with organization, salary, bank, emergency-contact, and document information and later retrieve it.
- An employee can be deactivated without removing historical attendance, leave, payroll, or loan data.
- HR can enter or import attendance and produce a job card showing present, absent, holiday, and weekend status.
- HR can configure leave types, generate annual entitlements, submit applications, complete both approval stages, and verify the resulting balance.
- Payroll can be generated once per month, reviewed, approved, and rendered as a payslip with attendance, allowance, deduction, advance, loan, and net-pay values.
- Cash payroll follows its own setup, generation, review, and approval path.
- Loan and salary-advance deductions update correctly when included in payroll.
- Permission-restricted users cannot perform unauthorized employee, leave, payroll, loan, or report actions.
- Attendance, leave, allowance, deduction, contract, advance, loan, salary, and employee reports return results matching their filters.
- A failed payroll generation leaves no partial payroll or repayment updates.

## 11. Known Gaps and Follow-up Requirements

- Add focused automated tests for payroll calculations, leave balance updates, duplicate generation, and transaction rollback; the module test directories currently contain no substantive tests.
- Define and implement a real biometric/third-party attendance API if external synchronization is required.
- Confirm whether payroll approval must create a final accounting voucher, and document the approval-to-ledger posting rule.
- Clarify employee self-service permissions and whether employees may directly create attendance or leave records.
- Add explicit retention, access, and audit policies for national IDs, bank data, salary data, and uploaded documents.