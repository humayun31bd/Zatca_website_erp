# Product Requirements Document (PRD): Human Resource Management (HRM) Final
**Target Market:** Kingdom of Saudi Arabia (KSA)
**System Architecture:** Multi-Tenant ERP System

## 1. Purpose & Objectives
The Human Resource Management module provides a centralized employee, attendance, leave, payroll, and workforce administration capability within a multi-tenant ERP. 
It supports branch-aware and tenant-aware employee records, integrates payroll activity with the accounting module, and strictly complies with Saudi Arabian Labor Laws (including End-of-Service Benefits, specific leave types, and strict overtime regulations).

## 2. Multi-Tenancy & Architecture
- **Global Data:** The `User` entity is shared across all tenants.
- **Tenant-Isolated Data:** Roles, Permissions, Departments, Designations, Branches, Attendance records, Leave Management, Payroll, Loans, Advances, and all other HR master data are strictly segregated per `Tenant ID`.

## 3. Users and Access (RBAC)
The module enforces strict Role-Based Access Control (RBAC), multi-factor authentication (MFA), and immutable audit trails (logging User ID, Timestamp, IP Address, and Action).
Users can hold multiple roles. The core roles include:
- **HR Administrator:** Maintains HR configurations and employee records; manages attendance, leave, payroll, and reports.
- **Payroll Officer:** Configures salary rules, generates payroll, reviews salary charts, approves payroll, and issues payslips.
- **HR or Branch Manager:** Can clock in/out, reviews staff attendance, approves assigned leave applications, and is eligible for overtime.
- **Owner/Super Admin:** Can do all transactions, generate reports, and is eligible for overtime.
- **Staff / Cashier:** Restricted mainly to clock-in/clock-out operations in the HR context.
- **Finance/Accounting User:** Consumes payroll accounting entries and reviews payroll-related financial impact.

## 4. Functional Requirements

### 4.1 Employee and Organization Management
- **Organization Setup:** Departments, sub-departments, divisions, positions, duty types, and branches.
- **Employee Master:** Personal info (Name, DOB, gender, marital status, blood group, national ID, contact details, profile image).
- **Employment Info:** Joining date, promotion date, department, sub-department, position, division, duty type, employee type, work city, roster, and active/left status.
- **Additional Data:** Emergency contacts, present/permanent addresses, bank account details, tax identification number (TIN), gross salary, academic qualifications, skills, and certificates.
- **KSA Compliance Documents (Employee Files):** 
  - Iqama (Residence Permit) for expats / National ID for Saudi citizens.
  - Passport Copy & Valid Visa (for expats).
  - GOSI (General Organization for Social Insurance) Registration Certificate.
  - Medical Insurance Certificate.
  - Employment Contract (stamped/registered via Qiwa/GOSI).
  - IBAN Certificate (for Wage Protection System - WPS compliance).
- **Outputs:** Downloadable employee profile/documents and employee ID card printing.

### 4.2 Attendance and Workforce Scheduling
- **Clock-In/Clock-Out:** Daily attendance recording with exact times and `Status` (Present/Absent/Late/Leave).
- **Entry Methods:** Individual entry, bulk entry, monthly import, and future biometric API support.
- **Late Policy:** Strict enforcement where early clock-outs are also categorized as "Late".
- **Shift Management:** Rosters, shift definitions, assignments, shift swapping, shift changes, and shift reports.

### 4.3 Overtime Management (KSA Specific)
- **Eligibility:** Overtime (and overtime payment) is strictly allowed **only for Managers and Owners**.
- **Hard Limits:**
  - Max 2 hours per day
  - Max 10 hours per week
  - Max 40 hours per month
  - Max 120 hours per quarter
  - Max 480 hours per year
- **Tracking:** Captures Date, Check-in/out time, Status (Approved/Rejected/Pending), and Reason.

### 4.4 Leave Management
- **Leave Types (KSA Labor Law Aligned):** Annual leave, Sick leave, Official holidays (Eid Al-Fitr, Eid Al-Adha, Saudi National Day, Founding Day), Maternity/Paternity-related rights, and Unpaid leave.
- **Entitlements:** Generate annual entitlements without duplicating existing records.
- **Workflow:** Leave applications must support a two-stage approval process: Manager Approval followed by HR/Final Approval.
- **Tracking:** Updates employee leave balance automatically upon final approval.

### 4.5 Regular Payroll & End-of-Service Benefits (EOSB)
- **Payroll Generation:** Idempotent monthly generation including Basic Salary, Allowances (Housing, Transport), Deductions (GOSI), Advances, and Loans to calculate Net Salary.
- **Attendance Integration:** Incorporates working days, holidays, approved leave, absent days, and leave without pay.
- **EOSB (KSA Specific):** Final salary settlement and unused-leave settlement based on final salary.
- **Outputs:** Salary charts, approval screens, PDF payslips, and automated accounting ledger posting.

### 4.6 Cash Payroll
- Separate setup and approval flow for employees paid in cash. Cash payroll records must remain distinguishable from regular (bank) payroll records.

### 4.7 Salary Advances and Loans
- **Advances:** Record salary advances, track release/payment, and automatically deduct from upcoming payroll.
- **Loans:** Manage loan disbursement, repayment start dates, installment periods, and installment amounts. Updates cleared installments automatically when payroll is processed.

### 4.8 Reports and Outputs
- Staff attendance and detailed employee attendance.
- Employee job card (present/absent/holiday/weekend).
- Allowance and deduction reports (filtered by department/position).
- Leave reports, loan reports, and salary advance reports.
- Comprehensive salary lists and charts.

## 5. Integrations and Data Integrity
- **Accounting Integration:** Payroll approval creates/prepares corresponding accounting vouchers.
- **File Storage:** Uploaded employee files, leave attachments, and academic documents must use managed secure storage.
- **Transaction Safety:** Payroll generation must be transactional. Failed generations must rollback completely to avoid partial loan/advance deductions.
- **Audit:** All critical actions (payroll modification, loan approval, leave approval) must be audit-logged.
