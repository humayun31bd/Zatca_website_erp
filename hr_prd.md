# Product Requirements Document (PRD): Human Resources Management (HRM) Module
**Target Market:** Kingdom of Saudi Arabia (KSA)
**System Architecture:** Multi-Tenant ERP System

## 1. Executive Summary
This document outlines the product requirements for the Human Resources Management (HRM) module. The module is designed to operate within a multi-tenant ERP system, ensuring compliance with Saudi Arabian Labor Laws (such as end-of-service benefits and specific leave types) while offering robust Role-Based Access Control (RBAC), shift management, attendance tracking, and payroll integration.

## 2. Multi-Tenancy & Data Architecture
- **Global Data:** The `User` entity is common and shared across all tenants.
- **Tenant-Isolated Data:** Roles, Permissions, Departments, Designations, Branches, Attendance records, Leave Management, Payroll, and all other HR master data are strictly segregated per `Tenant ID`.

## 3. Role-Based Access Control (RBAC) & Security
### 3.1 Standard Roles
Users can have multiple roles (e.g., a cashier can also be staff).
- **Staff:** Restricted to clock-in/clock-out operations.
- **Manager:** Restricted to clock-in/clock-out operations (HR context) but holds elevated operational permissions elsewhere.
- **Cashier / Owner / Super Admin:** Can perform business transactions and generate reports across the ERP.

### 3.2 Authentication & Audit
- **Authentication:** Must enforce secure login credentials, including Multi-Factor Authentication (MFA). Password storage must use secure hashing algorithms.
- **Authorization:** Strict role-based boundaries must prevent unauthorized access to sensitive HR data.
- **Audit Trail:** Immutable audit logging for all user activities. Logs must include: `User ID`, `Timestamp`, `IP Address`, and `Action`.

## 4. Core HR Modules

### 4.1 Master Data Management
- **Departments:** `Department ID`, `Name`, `Description`, `Tenant ID`.
- **Designations:** `Designation ID`, `Name`, `Description`, `Department ID`, `Tenant ID`.
- **Branches:** `Branch ID`, `Name`, `Description`, `Tenant ID`.

### 4.2 Time & Attendance
- **Clock-In / Clock-Out:** Users can record their daily attendance.
- **Records:** Tracks `Check-in Time`, `Check-out Time`, `Date`, `Status` (Present/Absent/Late/Leave), and `Notes`.
- **Late Policy:** Early clock-outs are strictly categorized and penalized under the "Late" policy.

### 4.3 Shift Management
- Comprehensive shift handling including: Rosters, Shift Definitions, Assignments, Shift Swapping, Shift Changes, and Shift Reports.

### 4.4 Overtime Management
- **Eligibility:** Overtime (and corresponding payment) is strictly limited to **Managers** and **Owners**.
- **Limits (KSA Compliance / Internal Policy):**
  - Max 2 hours per day
  - Max 10 hours per week
  - Max 40 hours per month
  - Max 120 hours per quarter
  - Max 480 hours per year
- **Tracking:** `Overtime ID`, `User ID`, `Branch ID`, `Times`, `Status` (Approved/Rejected/Pending), and `Reason`.

### 4.5 Leave Management
- **Types of Leave (Aligned with KSA Labor Law):**
  - Annual Leave
  - Sick Leave
  - Official Holidays (Eid Al-Fitr, Eid Al-Adha, Saudi National Day, Founding Day)
  - Maternity / Paternity rights
  - Unpaid Leave
- **Leave Request:** Tracks `Leave Type`, `Start/End Date`, `Duration`, `Status`, and `Reason`.

### 4.6 Payroll & Final Settlement
- **Monthly Payroll:** Handles `Basic Salary`, `Allowances` (Housing, Transportation), `Deductions` (GOSI contributions), `Net Salary`, `Payment Date`, and `Method`.
- **End-of-Service Benefits (EOSB):** Critical for the KSA region. System must calculate:
  - Final Salary Settlement.
  - Unused-Leave Settlement based on the final salary and accrued leave balance.

## 5. System Entities (Schema Overview)
*Note: Refer to technical documentation for exact datatypes.*
* **User:** `ID`, `First/Last Name`, `Email`, `Password (Hashed)`, `Phone`, `Role ID`, `Tenant ID`, `Branch ID`, `Status`, `Login Data`.
* **Role/Permission:** System roles vs. custom roles, JSON/Relational permission mapping.
* **Attendance/Overtime/Leave/Payroll:** All linked via `User ID` and scoped by `Tenant ID`.
