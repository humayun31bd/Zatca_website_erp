tenants wise staff, manager, cashier and owner can login and do the transaction and generate reports

Demo tenant 1:
User: staff1,Pass: staff1,tenant_id:1,role:staff,branch_id:1
User: manager1,Pass: manager1,tenant_id:1,role:manager,branch_id:1
User: cashier1,Pass: cashier1,tenant_id:1,role:cashier,branch_id:1
User: owner1,Pass: owner1,tenant_id:1,role:owner,branch_id:1

Demo tenant 2:
User: staff2,Pass: staff2,tenant_id:2,role:staff,branch_id:2
User: manager2,Pass: manager2,tenant_id:2,role:manager,branch_id:2
User: cashier2,Pass: cashier2,tenant_id:2,role:cashier,branch_id:2
User: owner2,Pass: owner2,tenant_id:2,role:owner,branch_id:2    

User can have multiple roles, for example cashiers can also be staff. 
Manager can do all transactions and generate reports
Staff can do all transactions and generate reports
Cashier can do all transactions and generate reports
Owner can do all transactions and generate reports
Super admin can do all transactions and generate reports


1. Role-Based Access Control (RBAC): User roles must be clearly defined (e.g., Admin, Manager, Staff, Cashier). Each role has specific permissions for accessing features, performing actions, and viewing reports. For example, Cashiers can only perform sales transactions, while Managers and Admins can view all financial reports. This ensures compliance with internal controls and segregation of duties.

2. Authentication and Authorization: Secure login credentials must be enforced for all users, including Multi-Factor Authentication (MFA). Role-based authorization must be implemented to ensure users can only access functions and data permitted by their role. This prevents unauthorized access to sensitive information and business operations.

3. Audit Trail: All user activities must be tracked and logged in an immutable audit trail. This includes login/logout times, transactions performed, reports generated, and any configuration changes. Each log entry should include user ID, timestamp, IP address, and the specific action taken. This ensures accountability and provides a basis for forensic analysis in case of security incidents.



staff and manager can clock in and clock out only
cashier can do transactions and generate reports
owner can do transactions and generate reports
admin can do all transactions and generate reports


departmets, designations, roles, permissions, users, attendance, leave management, payroll,hr master data management


user table is common for all tenants. tenant wise users, roles, permissions, departments, designations, attendance, leave management, payroll,hr master data management

User: User ID, First Name, Last Name, Email, Password (Hashed), Phone Number, Role ID, Tenant ID, Branch ID, Created Date, Updated Date, Status (Active/Inactive),  Last Login, Login Attempts, Is Locked

Role: Role ID, Role Name, Description, Permissions (JSON/Table), Tenant ID, Is System Role

Permission: Permission ID, Permission Name, Description, Module

Department: Department ID, Department Name, Description, Tenant ID

Designation: Designation ID, Designation Name, Description, Department ID, Tenant ID

Branch: Branch ID, Branch Name, Description, Tenant ID

Attendance: Attendance ID, User ID, Branch ID, Check-in Time, Check-out Time, Date, Status (Present/Absent/Late/Leave), Notes

Overtime:
    - Overtime ID, 
    - User ID, 
    - Branch ID, 
    - Check-in Time, 
    - Check-out Time, 
    - Date, 
    - Status (Approved/Rejected/Pending), 
    - Reason

Overtime policy:
    - Overtime is allowed only for managers and owners
    - Overtime is allowed only for 2 hours per day
    - Overtime is allowed only for 10 hours per week
    - Overtime is allowed only for 40 hours per month
    - Overtime is allowed only for 120 hours per quarter
    - Overtime is allowed only for 480 hours per year
    - Overtime payment is allowed only for managers and owners
    - Overtime payment is allowed only for 2 hours per day
    - Overtime payment is allowed only for 10 hours per week
    - Overtime payment is allowed only for 40 hours per month
    - Overtime payment is allowed only for 120 hours per quarter
    - Overtime payment is allowed only for 480 hours per year

Late policy (early clock out also considered as late)

Shift Management: Roster, Shift, Shift Assignment, Shift Swap, Shift Change, Shift Report  

Leave Management: 
    - Leave ID, 
    - User ID, 
    - Leave Type, 
    - Start Date, 
    - End Date, 
    - Duration, 
    - Status (Approved/Rejected/Pending), 
    - Reason

Leave Types: 
    - Annual leave, 
    - Sick leave, 
    - Official holidays, 
    - Maternity-related rights, 
    - Unpaid leave

End-of-service benefits.
    - Final salary settlement 
    - Unused-leave settlement     

Payroll: 
    - Payroll ID, 
    - User ID, 
    - Month, 
    - Year, 
    - Basic Salary, 
    - Allowances, 
    - Deductions, 
    - Net Salary, 
    - Payment Date, 
    - Payment Method, 
    - Status




