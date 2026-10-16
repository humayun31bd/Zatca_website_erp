import { sqliteTable, integer, text, real, blob, unique, check, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql, relations } from 'drizzle-orm';
import { tenants, users, branches } from './schema';

// --- HR Module Tables ---

export const departments = sqliteTable('departments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const designations = sqliteTable('designations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  departmentId: text('department_id').references(() => departments.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const employees = sqliteTable('employees', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }), // Optional, linking to login
  departmentId: text('department_id').references(() => departments.id),
  designationId: text('designation_id').references(() => designations.id),
  branchId: text('branch_id').references(() => branches.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  fatherName: text('father_name'),
  motherName: text('mother_name'),
  address: text('address'),
  email: text('email'),
  phone: text('phone'),
  departmentName: text('department_name'),
  designationName: text('designation_name'),
  managerId: text('manager_id'),
  managerName: text('manager_name'),
  jobResponsibility: text('job_responsibility'),
  workingHours: text('working_hours'),
  offDay: text('off_day'),
  shiftInfo: text('shift_info'),
  yearlyBenefits: text('yearly_benefits'),
  nationalId: text('national_id'), // Iqama or Saudi National ID
  iqamaExpiryDate: integer('iqama_expiry_date', { mode: 'timestamp' }),
  passportNumber: text('passport_number'),
  passportExpiryDate: integer('passport_expiry_date', { mode: 'timestamp' }),
  gosiNumber: text('gosi_number'),
  joiningDate: integer('joining_date', { mode: 'timestamp' }),
  basicSalary: real('basic_salary').default(0),
  payGrade: text('pay_grade'),
  payScale: text('pay_scale'),
  housingAllowance: real('housing_allowance').default(0),
  transportAllowance: real('transport_allowance').default(0),
  otherAllowance: real('other_allowance').default(0),
  profilePicture: text('profile_picture'),
  experiences: text('experiences'), // JSON string array
  skills: text('skills'),           // JSON string array
  educations: text('educations'),   // JSON string array
  documents: text('documents'),     // JSON string array for uploaded docs & IDs
  paymentMethod: text('payment_method').default('BANK').notNull(),
  status: text('status').default('ACTIVE').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('employee_status_check', sql`${t.status} IN ('ACTIVE','INACTIVE','LEFT')`)
]);

export const attendance = sqliteTable('attendance', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  employeeId: text('employee_id').references(() => employees.id, { onDelete: 'cascade' }).notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  checkIn: integer('check_in', { mode: 'timestamp' }),
  checkOut: integer('check_out', { mode: 'timestamp' }),
  status: text('status').default('PRESENT').notNull(),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('attendance_status_check', sql`${t.status} IN ('PRESENT','ABSENT','LATE','LEAVE')`)
]);

export const leaveRequests = sqliteTable('leave_requests', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  employeeId: text('employee_id').references(() => employees.id, { onDelete: 'cascade' }).notNull(),
  leaveType: text('leave_type').notNull(), // Annual, Sick, Unpaid, etc.
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }).notNull(),
  durationDays: real('duration_days').notNull(),
  status: text('status').default('PENDING').notNull(), // PENDING, MANAGER_APPROVED, APPROVED, REJECTED
  reason: text('reason'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('leave_status_check', sql`${t.status} IN ('PENDING','MANAGER_APPROVED','APPROVED','REJECTED')`)
]);

export const overtime = sqliteTable('overtime', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  employeeId: text('employee_id').references(() => employees.id, { onDelete: 'cascade' }).notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  hours: real('hours').notNull(),
  status: text('status').default('PENDING').notNull(), // PENDING, APPROVED, REJECTED
  reason: text('reason'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('overtime_status_check', sql`${t.status} IN ('PENDING','APPROVED','REJECTED')`)
]);

export const payroll = sqliteTable('payroll', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  employeeId: text('employee_id').references(() => employees.id, { onDelete: 'cascade' }).notNull(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  basicSalary: real('basic_salary').default(0).notNull(),
  housingAllowance: real('housing_allowance').default(0),
  transportAllowance: real('transport_allowance').default(0),
  otherAllowance: real('other_allowance').default(0),
  allowances: real('allowances').default(0).notNull(),
  overtimeHours: real('overtime_hours').default(0),
  overtimePay: real('overtime_pay').default(0),
  presentDays: integer('present_days').default(0),
  absentDays: integer('absent_days').default(0),
  lateDays: integer('late_days').default(0),
  finesPenalties: real('fines_penalties').default(0),
  loanDeduction: real('loan_deduction').default(0),
  gosiDeduction: real('gosi_deduction').default(0),
  deductions: real('deductions').default(0).notNull(), // Includes loans/advances/fines
  netSalary: real('net_salary').default(0).notNull(),
  startDate: text('start_date'),
  endDate: text('end_date'),
  paymentDate: integer('payment_date', { mode: 'timestamp' }),
  paymentMethod: text('payment_method'), // BANK, CASH
  status: text('status').default('DRAFT').notNull(), // DRAFT, APPROVED, PAID
  departmentName: text('department_name'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('payroll_status_check', sql`${t.status} IN ('DRAFT','APPROVED','PAID')`),
  unique('uq_tenant_employee_month_year').on(t.tenantId, t.employeeId, t.month, t.year)
]);

export const loans = sqliteTable('loans', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  employeeId: text('employee_id').references(() => employees.id, { onDelete: 'cascade' }).notNull(),
  amount: real('amount').notNull(),
  monthlyInstallment: real('monthly_installment').notNull(),
  remainingAmount: real('remaining_amount').notNull(),
  status: text('status').default('PENDING').notNull(), // PENDING, APPROVED, ACTIVE, COMPLETED, REJECTED
  reason: text('reason'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
}, (t) => [
  check('loan_status_check', sql`${t.status} IN ('PENDING','APPROVED','ACTIVE','COMPLETED','REJECTED')`)
]);

export const payGrades = sqliteTable('pay_grades', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  gradeCode: text('grade_code').notNull(),
  gradeName: text('grade_name').notNull(),
  minSalary: real('min_salary').default(0).notNull(),
  maxSalary: real('max_salary').default(0).notNull(),
  housingAllowancePercent: real('housing_allowance_percent').default(25).notNull(),
  transportAllowancePercent: real('transport_allowance_percent').default(10).notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const payScales = sqliteTable('pay_scales', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  gradeId: text('grade_id').references(() => payGrades.id, { onDelete: 'cascade' }),
  gradeCode: text('grade_code'),
  scaleName: text('scale_name').notNull(),
  basicSalary: real('basic_salary').default(0).notNull(),
  housingAllowance: real('housing_allowance').default(0).notNull(),
  transportAllowance: real('transport_allowance').default(0).notNull(),
  medicalAllowance: real('medical_allowance').default(0).notNull(),
  otherAllowances: real('other_allowances').default(0).notNull(),
  totalPackage: real('total_package').default(0).notNull(),
  incrementRate: real('increment_rate').default(0),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});
