// @ts-nocheck
import 'dotenv/config';
import { db } from '../src/lib/db/index';
import { tenants } from '../src/lib/db/schema';
import { employees } from '../src/lib/db/hr_schema';
import { eq } from 'drizzle-orm';

async function seedEmployees() {
  console.log('Seeding 20 employees...');
  try {
    // Find the client tenant
    const clientTenantResult = await db.select().from(tenants).where(eq(tenants.email, 'hello@demo-client.com')).limit(1);
    
    if (clientTenantResult.length === 0) {
      console.log('Client tenant not found. Make sure you ran the main db:seed first.');
      process.exit(1);
    }
    
    const clientTenant = clientTenantResult[0];
    
    const employeesData = [];
    for (let i = 1; i <= 20; i++) {
      employeesData.push({
        tenantId: clientTenant.id,
        firstName: `Employee`,
        lastName: `${i}`,
        email: `employee${i}@demo-client.com`,
        phone: `+9665000000${i.toString().padStart(2, '0')}`,
        nationalId: `10000000${i.toString().padStart(2, '0')}`,
        basicSalary: (3000 + (i * 100)).toFixed(2),
        paymentMethod: 'BANK',
        status: 'ACTIVE',
      });
    }

    await db.insert(employees).values(employeesData);
    
    console.log('✅ 20 Employees seeded successfully for tenant:', clientTenant.name);
  } catch (err) {
    console.error('Error seeding employees:', err);
  } finally {
    process.exit(0);
  }
}

seedEmployees();
