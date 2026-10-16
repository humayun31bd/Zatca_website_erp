const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
require('dotenv').config();

// Standard Chart of Accounts as per accountspolicy.md
const defaultAccounts = [
  // Assets
  { code: '1', name: 'Assets', type: 'ASSET', level: 1, isControl: true },
  { code: '1.10', name: 'Current Assets', type: 'ASSET', level: 2, isControl: true },
  { code: '1.10.01', name: 'Cash & Bank', type: 'ASSET', level: 3, isControl: true },
  { code: '1.10.01.001', name: 'Cash on Hand', type: 'ASSET', level: 4, isControl: true },
  { code: '1.10.01.001.001', name: 'Petty Cash', type: 'ASSET', level: 5, isControl: false },
  { code: '1.10.01.002', name: 'Bank Accounts', type: 'ASSET', level: 4, isControl: true },
  { code: '1.10.01.002.001', name: 'Operating Account', type: 'ASSET', level: 5, isControl: false },
  // Liabilities
  { code: '2', name: 'Liabilities', type: 'LIABILITY', level: 1, isControl: true },
  { code: '2.10', name: 'Current Liabilities', type: 'LIABILITY', level: 2, isControl: true },
  { code: '2.10.03', name: 'Accrued Payroll', type: 'LIABILITY', level: 3, isControl: true },
  { code: '2.10.03.001', name: 'Accrued Payroll Control', type: 'LIABILITY', level: 4, isControl: true },
  { code: '2.10.03.001.001', name: 'Salaries Payable', type: 'LIABILITY', level: 5, isControl: false },
  // Expenses
  { code: '5', name: 'Expenses', type: 'EXPENSE', level: 1, isControl: true },
  { code: '5.20', name: 'Operating Expenses', type: 'EXPENSE', level: 2, isControl: true },
  { code: '5.20.02', name: 'Staff Costs', type: 'EXPENSE', level: 3, isControl: true },
  { code: '5.20.02.001', name: 'Salaries & Wages', type: 'EXPENSE', level: 4, isControl: true },
  { code: '5.20.02.001.001', name: 'Salaries Expense', type: 'EXPENSE', level: 5, isControl: false },
];

async function seed() {
  const sql = postgres(process.env.DATABASE_URL.replace('6543', '5432'), { ssl: 'require' });
  const db = drizzle(sql);

  console.log("Seeding Chart of Accounts for all tenants...");
  
  const tenants = await sql`SELECT id FROM tenants`;
  
  for (const tenant of tenants) {
    const tenantId = tenant.id;
    
    for (const acc of defaultAccounts) {
      // Check if exists
      const existing = await sql`SELECT id FROM accounts WHERE tenant_id = ${tenantId} AND code = ${acc.code}`;
      if (existing.length === 0) {
        await sql`
          INSERT INTO accounts (tenant_id, code, name, type, level, is_control)
          VALUES (${tenantId}, ${acc.code}, ${acc.name}, ${acc.type}, ${acc.level}, ${acc.isControl})
        `;
      }
    }
  }

  console.log("Seeding complete.");
  process.exit(0);
}

seed().catch(err => {
  console.error("SEED ERROR:", err);
  process.exit(1);
});
