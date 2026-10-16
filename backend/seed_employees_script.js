const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const dbPath = process.env.SQLITE_DB_PATH || 'sqlite.db';
const db = new Database(dbPath);

console.log('Connecting to database:', dbPath);

// 1. Get target tenant (or passed via CLI / env)
const targetTenantArg = process.argv[2] || process.env.TARGET_TENANT_ID || '336eaf82-a524-4b0a-9326-7197b1e5459e';
let tenant = db.prepare('SELECT id, name, email FROM tenants WHERE id = ? OR email = ? LIMIT 1').get(targetTenantArg, targetTenantArg);

if (!tenant) {
  tenant = db.prepare('SELECT id, name, email FROM tenants LIMIT 1').get();
}

console.log('Using target tenant:', tenant.name, '(', tenant.id, '| email:', tenant.email, ')');
const tenantId = tenant.id;

// 2. Ensure departments exist
const departmentNames = [
  'Human Resources',
  'Finance & Accounting',
  'Information Technology',
  'Sales & Marketing',
  'Supply Chain & Procurement',
  'Operations & Logistics',
  'Customer Support',
  'Quality Assurance',
  'Warehouse Management',
  'Legal & Compliance'
];

const departments = [];
for (const deptName of departmentNames) {
  let dept = db.prepare('SELECT id, name FROM departments WHERE tenant_id = ? AND name = ?').get(tenantId, deptName);
  if (!dept) {
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO departments (id, tenant_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
      id, tenantId, deptName, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)
    );
    dept = { id, name: deptName };
  }
  departments.push(dept);
}

// 3. Ensure designations exist
const designationNames = [
  'Software Engineer',
  'Senior Software Engineer',
  'Accountant',
  'Senior Accountant',
  'HR Specialist',
  'Operations Manager',
  'Procurement Officer',
  'Warehouse Supervisor',
  'Sales Executive',
  'Customer Success Representative',
  'Logistics Coordinator',
  'Quality Inspector',
  'Financial Analyst',
  'Administrative Assistant',
  'Branch Manager'
];

const designations = [];
for (const desName of designationNames) {
  let des = db.prepare('SELECT id, name, department_id FROM designations WHERE tenant_id = ? AND name = ?').get(tenantId, desName);
  if (!des) {
    const id = crypto.randomUUID();
    const dept = departments[Math.floor(Math.random() * departments.length)];
    db.prepare('INSERT INTO designations (id, tenant_id, department_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, tenantId, dept.id, desName, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)
    );
    des = { id, name: desName, department_id: dept.id };
  }
  designations.push(des);
}

// 4. Ensure branches exist
const branchNames = ['Riyadh Head Office', 'Jeddah Branch', 'Dammam Regional Hub', 'Khobar Logistics Center', 'Makkah Store'];
const branches = [];
for (const bName of branchNames) {
  let b = db.prepare('SELECT id, name FROM branches WHERE tenant_id = ? AND name = ?').get(tenantId, bName);
  if (!b) {
    const id = crypto.randomUUID();
    try {
      db.prepare('INSERT INTO branches (id, tenant_id, name, branch_code) VALUES (?, ?, ?, ?)').run(
        id, tenantId, bName, `BR-${bName.substring(0, 3).toUpperCase()}`
      );
      b = { id, name: bName };
    } catch (e) {
      b = { id: null, name: bName };
    }
  }
  if (b.id) branches.push(b);
}

// Ensure employees table exists with all needed columns
db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT,
    department_id TEXT,
    designation_id TEXT,
    branch_id TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    father_name TEXT,
    mother_name TEXT,
    address TEXT,
    email TEXT,
    phone TEXT,
    department_name TEXT,
    designation_name TEXT,
    manager_id TEXT,
    manager_name TEXT,
    job_responsibility TEXT,
    working_hours TEXT,
    off_day TEXT,
    shift_info TEXT,
    yearly_benefits TEXT,
    national_id TEXT,
    iqama_expiry_date INTEGER,
    passport_number TEXT,
    passport_expiry_date INTEGER,
    gosi_number TEXT,
    joining_date INTEGER,
    basic_salary REAL DEFAULT 0,
    pay_grade TEXT,
    pay_scale TEXT,
    housing_allowance REAL DEFAULT 0,
    transport_allowance REAL DEFAULT 0,
    other_allowance REAL DEFAULT 0,
    profile_picture TEXT,
    experiences TEXT,
    skills TEXT,
    educations TEXT,
    documents TEXT,
    payment_method TEXT DEFAULT 'BANK' NOT NULL,
    status TEXT DEFAULT 'ACTIVE' NOT NULL,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
    updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
  );
`);

// Name pools for rich generation
const firstNames = [
  'Mohammed', 'Ahmed', 'Ali', 'Omar', 'Abdullah', 'Fahad', 'Khalid', 'Sultan', 'Yousef', 'Tariq',
  'Ibrahim', 'Saud', 'Hamad', 'Mustafa', 'Zaid', 'Nasser', 'Bandar', 'Mansour', 'Majed', 'Adel',
  'Sara', 'Fatima', 'Noura', 'Mona', 'Hessa', 'Reem', 'Aisha', 'Laila', 'Maha', 'Zainab'
];

const lastNames = [
  'Al-Otaibi', 'Al-Ghamdi', 'Al-Shehri', 'Al-Zahrani', 'Al-Harbi', 'Al-Dosari', 'Al-Qahtani',
  'Al-Mutairi', 'Al-Subaie', 'Al-Shammari', 'Al-Anazi', 'Al-Rashid', 'Al-Saud', 'Al-Najjar',
  'Al-Harthi', 'Al-Bishi', 'Al-Khatib', 'Al-Husseini', 'Al-Amri', 'Al-Sulaiman'
];

const cities = ['Riyadh', 'Jeddah', 'Dammam', 'Khobar', 'Mecca', 'Medina', 'Tabuk', 'Abha', 'Taif', 'Jubail'];
const payGrades = ['GRADE_A', 'GRADE_B', 'GRADE_C', 'GRADE_D', 'GRADE_EXECUTIVE'];
const shifts = ['Morning Shift (8 AM - 4 PM)', 'Evening Shift (4 PM - 12 AM)', 'General Shift (9 AM - 5 PM)'];
const offDays = ['Friday - Saturday', 'Friday Only', 'Saturday - Sunday'];

const currentCount = db.prepare('SELECT COUNT(*) as count FROM employees WHERE tenant_id = ?').get(tenantId).count;
console.log(`Current employee count for tenant: ${currentCount}`);

const TARGET_SEED_COUNT = 6000;
console.log(`Preparing to seed ${TARGET_SEED_COUNT} employees...`);

const insertStmt = db.prepare(`
  INSERT INTO employees (
    id, tenant_id, department_id, designation_id, branch_id,
    first_name, last_name, father_name, mother_name, address,
    email, phone, department_name, designation_name,
    manager_name, job_responsibility, working_hours, off_day,
    shift_info, yearly_benefits, national_id, gosi_number,
    joining_date, basic_salary, pay_grade, pay_scale,
    housing_allowance, transport_allowance, other_allowance,
    payment_method, status, created_at, updated_at
  ) VALUES (
    @id, @tenant_id, @department_id, @designation_id, @branch_id,
    @first_name, @last_name, @father_name, @mother_name, @address,
    @email, @phone, @department_name, @designation_name,
    @manager_name, @job_responsibility, @working_hours, @off_day,
    @shift_info, @yearly_benefits, @national_id, @gosi_number,
    @joining_date, @basic_salary, @pay_grade, @pay_scale,
    @housing_allowance, @transport_allowance, @other_allowance,
    @payment_method, @status, @created_at, @updated_at
  )
`);

const startTime = Date.now();

const insertBatch = db.transaction((employeesList) => {
  for (const emp of employeesList) {
    insertStmt.run(emp);
  }
});

let batch = [];
const BATCH_SIZE = 500;
const nowSec = Math.floor(Date.now() / 1000);

for (let i = 1; i <= TARGET_SEED_COUNT; i++) {
  const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const fatherName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const motherName = firstNames[Math.floor(Math.random() * firstNames.length)];
  
  const dept = departments[Math.floor(Math.random() * departments.length)];
  const des = designations[Math.floor(Math.random() * designations.length)];
  const branch = branches.length > 0 ? branches[Math.floor(Math.random() * branches.length)] : null;
  const city = cities[Math.floor(Math.random() * cities.length)];

  const serial = (currentCount + i).toString().padStart(5, '0');
  const nationalId = '1' + (Math.floor(100000000 + Math.random() * 900000000)).toString();
  const gosiNumber = 'GOSI-' + (Math.floor(10000000 + Math.random() * 90000000)).toString();
  const phone = '+9665' + (Math.floor(10000000 + Math.random() * 90000000)).toString();
  const email = `${fName.toLowerCase()}.${lName.toLowerCase().replace(/[^a-z]/g, '')}${serial}@company.sa`;

  // Realistic salary tiers
  const basicSalary = Math.round((4500 + Math.random() * 15500) / 100) * 100;
  const housingAllowance = Math.round(basicSalary * 0.25);
  const transportAllowance = Math.round(basicSalary * 0.10);
  const otherAllowance = Math.round((300 + Math.random() * 700) / 50) * 50;

  // Joining date between 1 and 6 years ago
  const daysAgo = Math.floor(30 + Math.random() * 2000);
  const joiningDateSec = nowSec - (daysAgo * 86400);

  const emp = {
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    department_id: dept.id,
    designation_id: des.id,
    branch_id: branch ? branch.id : null,
    first_name: fName,
    last_name: lName,
    father_name: fatherName,
    mother_name: motherName,
    address: `${Math.floor(100 + Math.random() * 900)} King Fahd Road, ${city}, KSA`,
    email: email,
    phone: phone,
    department_name: dept.name,
    designation_name: des.name,
    manager_name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
    job_responsibility: `Responsible for key execution in ${dept.name} operations and compliance.`,
    working_hours: '8 Hours / Day (40 Hours Weekly)',
    off_day: offDays[Math.floor(Math.random() * offDays.length)],
    shift_info: shifts[Math.floor(Math.random() * shifts.length)],
    yearly_benefits: '30 Days Annual Leave, Medical Insurance (Class A), Annual Ticket',
    national_id: nationalId,
    gosi_number: gosiNumber,
    joining_date: joiningDateSec,
    basic_salary: basicSalary,
    pay_grade: payGrades[Math.floor(Math.random() * payGrades.length)],
    pay_scale: `Scale-${Math.floor(1 + Math.random() * 8)}`,
    housing_allowance: housingAllowance,
    transport_allowance: transportAllowance,
    other_allowance: otherAllowance,
    payment_method: Math.random() > 0.08 ? 'BANK' : 'CASH',
    status: Math.random() > 0.05 ? 'ACTIVE' : (Math.random() > 0.5 ? 'INACTIVE' : 'LEFT'),
    created_at: nowSec,
    updated_at: nowSec,
  };

  batch.push(emp);

  if (batch.length === BATCH_SIZE) {
    insertBatch(batch);
    batch = [];
    if (i % 1000 === 0) {
      console.log(`Progress: ${i} / ${TARGET_SEED_COUNT} employees inserted...`);
    }
  }
}

if (batch.length > 0) {
  insertBatch(batch);
}

const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
const newTotalCount = db.prepare('SELECT COUNT(*) as count FROM employees WHERE tenant_id = ?').get(tenantId).count;

console.log('----------------------------------------------------');
console.log(`SUCCESS! Seeded ${TARGET_SEED_COUNT} employees in ${totalTime}s.`);
console.log(`Total employees in database for tenant: ${newTotalCount}`);
console.log('----------------------------------------------------');
