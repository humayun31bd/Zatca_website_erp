## Tenants wise hr service
## version - 1.0v
## Date - 2026-10-01

## Useful target customers
A Saudi HRM SaaS can be designed for:
Restaurants, cafés, and catering companies.
Cleaning and maintenance companies.
Construction and contracting businesses.
Delivery and logistics companies.
Taxi and transport operators.
Retail chains and small shops.
Security and facility-management companies.
Manpower and recruitment agencies.
Companies employing large numbers of expatriate workers.

## MVP - 
Employee database and document management.
Contract and Iqama-expiry tracking.
Attendance and shift management.
Leave management.
Saudi payroll with GOSI and end-of-service calculations.
Mudad/WPS payroll-file support.
Employee mobile self-service.
Arabic-English interface.
Multi-branch access.


## Tenants wise employee records 

### 1. Add New Employee

#### UI 
- Add Employee Header 

- Employee Personal Information
  1. First Name:
  2. Last Name: 
  3. Nationality: 
  4. Gender:  
  5. Date of Birth: 
  6. National ID:
  7. Passport:
  8. Visa:
  9. Iqama:
  10. Work Permit:
  11. Driving License:
  12. Email: 
  13. Phone:
  

- Employment Details
  1. Company:
  2. Department:
  3. Position:
  4. Employment Type:
  5. Work Schedule:
  6. Start Date: 
  7. End Date (optional):
  8. Status:
  9. Responsibilities:

- Address
  1. Address Line 1:
  2. Address Line 2:
  3. City: 
  4. State:  
  5. Postal Code:
  6. Country:
  7. Notes:

- Emergency Contact
  1. Contact Person:
  2. Relationship:
  3. Phone:
  4. Notes:

- Bank Information
  1. Bank Name:
  2. Account Number:
  3. Routing Number:
  

- Payroll
  1. Basic: 
  2. Housing:  
  3. Transportation: 
  4. Phone:
  5. Other:
  6. Total:
  7. Deductions: 
      - Social Security:
      - Tax:
      - Other:
      - Total:
  8. Net Pay: 
  9. Payment Method:
  

- Attendance Settings
  1. Check-in/Check-out:
  2. Leave:
  3. Notes:
  
- Employee Documents
    1. National: 
        - File Upload:
        - Issue Date: 
        - Expiry Date: 
    2. Saudi ID: 
        - File Upload:
        - Issue Date: 
        - Expiry Date: 
    3. Passport: 
        - File Upload:
        - Issue Date: 
        - Expiry Date: 
    4. Driving License: 
        - File Upload:
        - Issue Date: 
        - Expiry Date: 
    5. Iqama: 
        - File Upload:
        - Issue Date: 
        - Expiry Date: 
    6. Visa: 
        - File Upload:
        - Issue Date: 
        - Expiry Date: 
    7. Work Permit: 
        - File Upload:
        - Issue Date: 
        - Expiry Date: 
    8. Notes: 

- Job Description
    1. Description:
    2. Responsibilities:
    3. Notes:

- Employee Bank Account
    1. Bank Name: 
    2. Account Number: 
    3. Routing Number: 
    4. Notes: 


## Employee list Page - Tabs (Employees, Expiry Notification, Leave Policy, Attendance, accommodation)

### Employees Tab
- code, name, department, position, email, phone, iqama, visa, work permit, driving license

### Expiry Notification Tab
- List all employees with expiry date and status (Due, Expired)
- Color coded rows (Red for Expired, Orange for Due)
- Filter by document type (National, Saudi ID, Passport, Driving License, Iqama, Visa, Work Permit)
- Filter by status (Due, Expired)
- Search by employee name
- Export to Excel

## Employee Page - EU Format UI 
 - Two Column Layout 
 - Left Side ( Fixed max-width 280px) 
   - Image upload (S3)
   - Contact information (phone, email, languages) 
   - Skills Summary
   - Skill List
   - Personal Information
   - Emergency Contacts
   - Documents:
        1. National: File upload, Issue date, Expiry date
        2. Saudi ID: File upload, Issue date, Expiry date
        3. Passport: File upload, Issue date, Expiry date 
        4. Driving License: File upload, Issue date, Expiry date
        5. Iqama: File upload, Issue date, Expiry date  
        6. Visa: File upload, Issue date, Expiry date   
        7. Work Permit: File upload, Issue date, Expiry date
    - expiry-date tracking for all documents   
        - Expiry Notification

 - Right Side ( Auto expand) 
   - Header
     1. Save Button
     2. Cancel Button
     3. Delete Button
   - Summary Section 
     - Experience summary
     - Education Summary 
   - Toggle based tabs 
     1. Personall Information: employee name, nationality, resident status, gender, employee id, mobile no, phone no, email, date of birth
     2. Bank Information: bank name, bank account number, bank routing number
     3. Employment: 
        - Company (name , contact person, email, website)
        - Employment Type
        - Department
        - Work Schedule
        - Position
        - Start Date
        - End Date
        - Responsibilities
    4. Payroll : 
        - Salary: basic, housing, transportation, phone, other, total
        - Deductions: social security, tax, other, total
        - Net pay
        - Payment method
        - Bank information
        - Service Benefits
    6. Leave : 
        - Leave type
        - Leave balance
        - Leave history
    7. Dependents : 
        - Dependent information
        - Dependent documents
    8. Emergency Contacts : 
        - Contact person
        - Contact information
        - Contact type
    9. Dependents : 
        - Dependent information
        - Dependent documents
    10. Leave : 
        - Leave Policy Name
        - Leave Policy Type
        - Leave Policy Duration
        - Leave Policy Balance
        - Leave Policy History

## Leave Policy Page

### Leave Policy Tab - Leave Type (Annual, sick, emergency, unpaid, maternity, paternity, Hajj)
- List all leave policies with details (Name, Type, Duration, Balance)
- Add Leave Policy button
- Edit Leave Policy button
- Delete Leave Policy button

### Leave Application Tab - Leave Type (Annual, sick, emergency, unpaid, maternity, paternity, Hajj)
- List all leave applications with details (Employee, Type, Duration, Balance)
- Add Leave Application button
- Edit Leave Application button
- Delete Leave Application button
        
## Leave Application Page - Employee App 
    - Employee own application
        1. Leave Application
            - Panel - Apply for leave (From Date, To Date, Leave Type, Leave Balance)
            - Toggle based tabs:
                1. Leave Type
                2. Leave Balance
                3. Leave History
        2. Leave Approval Panel
            - Panel - Approve/Reject leave (From Date, To Date, Leave Type, Leave Balance) 
                - Multi selection of employees
                - Approve Button
                - Reject Button                
    

## Attendance Page / App - UI based (using GPS, QR code, or geofencing, Biometric-device integration)
- Employee login: 
    - Attendance panel - (check in-out) with lat long with location picture (optional) and notes (optional).
    - Toggle based tabs:
        1. Leave history
        2. Attendance history
    - Salary Information
        - Payslip view 
        - Salary details
            - Basic
            - Housing
            - Transportation
            - Phone
            - Other
            - Total
        - Deductions
            - Social security
            - Tax
            - Other
            - Total
        - Net pay
        - Payment method
        - Bank information
        - Service Benefits
    - Settings
        - Change bank information
        - Login Settings 
            - Change password
            - Change username/employee code
            - Change email
            - Change phone number
- Company login: 
    - Employee wise attendance panel Multi selection for check in-out
        - Date Time picker
        - Check in
        - Check out
        - Absent (leave) on selection based
    - Manual entry of in-out time and dates
    - Leave history
    - Attendance history


## Project/Branch wise employee assign / transfer
    - Employee list
    - Assign employee to project/branch
    - Transfer employee to project/branch
    - Assign employee to project/branch - with leave policy
    - Transfer employee to project/branch - with leave policy
        1. Project/Branch List
            - List all projects/branches with employee count


## Organization chart and approval hierarchies
    - UI based 
        1. Organization Chart - Org Chart
            - Tree view of employees
            - Add employee to chart
            - Remove employee from chart
            - Move employee in chart
        2. Approval Hierarchies
            - List of approval hierarchies
            - Add approval hierarchy
            - Edit approval hierarchy
            - Delete approval hierarchy
        3. Approval Setting
            - Leave approval hierarchy
            - Expense approval hierarchy
            - Purchase approval hierarchy
            - Sales approval hierarchy
            - Invoice approval hierarchy
            - Payment approval hierarchy
            - Cash Receipt approval hierarchy
            - Check-in/Check-out approval hierarchy
            - Attendance approval hierarchy
            - Leave application approval hierarchy
            - Expense application approval hierarchy
            - Purchase application approval hierarchy
            - Sales application approval hierarchy
            - Invoice application approval hierarchy
            - Payment application approval hierarchy
            - Cash Receipt application approval hierarchy
            - Check-in/Check-out application approval hierarchy
            - Attendance application approval hierarchy 
        4. Approval Settings - Role Based 
            1. Role based approval setting
                - List of roles with approval setting
                - Add approval setting
                - Edit approval setting
                - Delete approval setting
            2. Employee wise approval setting
                - List of employees with approval setting
                - Add approval setting
                - Edit approval setting
                - Delete approval setting 


## Document upload, e-signatures, and automated expiry reminders.
    - UI based 
        1. Document upload
            - Upload document
            - Document type
            - Document number
            - Issue date
            - Expiry date
            - Document file
            - Document status
            - Document actions
            - Document list
            - Add document
            - Edit document
            - Delete document
            - Document notifications
        2. E-signatures
            - E-signature
            - E-signature type
            - E-signature status
            - E-signature actions
            - E-signature list
            - Add e-signature
            - Edit e-signature
            - Delete e-signature
            - E-signature notifications
        3. Automated expiry reminders
            - Automated expiry reminders
            - Automated expiry reminder type
            - Automated expiry reminder status
            - Automated expiry reminder actions
            - Automated expiry reminder list
            - Add automated expiry reminder
            - Edit automated expiry reminder
            - Delete automated expiry reminder
            - Automated expiry reminder notifications 

## Saudi payroll
- UI based 
    1. Payroll
        - Monthly salary
        - Daily wage
        - Hourly wage
        - Different payroll cycles
        - Basic salary
        - Housing allowance
        - Transport allowance
        - Commissions
        - Overtime
        - Loans
        - Advances
        - Deductions
        - Bonuses
        - Automatic GOSI calculations
        - End-of-service benefit calculation
        - Final settlement and employee clearance
        - Payslips in Arabic and English
        - Payroll audit trail and approval workflow
        - Bank salary file generation for Mudad/WPS processing 

## Government compliance
- UI based
    1. Qiwa-related employee and contract information management.
    2. Muqeem/Iqama, visa, exit-reentry, and employee-status tracking.
    3. GOSI employee registration and contribution records.
    4. Mudad/WPS payroll-file preparation.
    5. Saudization/Nitaqat dashboard and Saudi-versus-non-Saudi workforce reporting.
    - Alerts for expired Iqamas, contracts, work permits, passports, and health certificates.
Configurable reports that can be updated when Saudi regulations change.

## Attendance and time
Mobile attendance using GPS, QR code, or geofencing.
Biometric-device integration.
Clock-in/clock-out, late arrival, early departure, and absence tracking.
Shifts, rosters, split shifts, night shifts, and rotating schedules.
Overtime approval and payroll integration.
Timesheets and worklogs.
Attendance rules 
    - for branches, 
    - field workers, 
    - drivers, 
    - restaurants, 
    - construction teams.

## Leave management
Annual, sick, emergency, unpaid, maternity, paternity, Hajj, and other company-defined leave types.
Leave entitlement based on hire date, employee category, and policy.
Arabic-English leave policies.
Multi-level approval.
Public holidays and Hijri-calendar support.
Leave balance, encashment, and payroll integration.
Employee leave requests through web or mobile app

## Employee self-service

- Web Portal
    Employees should be able to:
    View and update personal information.
    Download payslips and salary certificates.
    View attendance, schedules, contracts, and benefits.
    Upload documents.

- Mobile App
    Employees should be able to:
    Use Arabic or English through a mobile application.
    View and update personal information.
    Download payslips and salary certificates.
    View attendance, schedules, contracts, and benefits.
    Upload documents.
    Request leave, overtime, advances, loans, business travel, and accommodation.

## Mobile attendance using GPS, QR code, or geofencing.
   - Biometric-device integration.
   - Clock-in/clock-out, late arrival, early departure, and absence tracking.
   - Shifts, rosters, split shifts, night shifts, and rotating schedules.
   - Overtime approval and payroll integration.
   - Timesheets and worklogs.
   - Attendance rules for branches, field workers, drivers, restaurants, construction teams.
   - Approval rules for attendance.
   - Employee self-service for attendance.

   ## Shifts, rosters, split shifts, night shifts, and rotating schedules.
   - Clock in
   - Clock out
   - Late arrival
   - Early departure
   - Absence tracking
   - Overtime approval
   - Timesheets
   - Worklogs
   - Approval rules
   - Employee self-service

## Receive HR announcements and notifications.
- Push notifications
- Email notifications
- In-app notifications
- SMS notifications



   