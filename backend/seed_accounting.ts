import 'dotenv/config';
import { db } from './src/lib/db/index.js';
import { accounts, journalEntries, journalEntryLines } from './src/lib/db/accounting_schema.js';

async function seedAccounting() {
  const tenantId = '336eaf82-a524-4b0a-9326-7197b1e5459e';

  try {
    console.log('Seeding COA...');
    const accountTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
    
    const seededAccounts = [];
    for (let i = 1; i <= 20; i++) {
      const type = accountTypes[i % 5];
      const res = await db.insert(accounts).values({
        tenantId,
        code: `1000${i}`,
        name: `Test Account ${i}`,
        type,
        level: 1,
        isControl: false,
        isCashNature: i === 1,
        isBankNature: i === 2,
      }).returning();
      seededAccounts.push(res[0]);
    }
    console.log(`Seeded ${seededAccounts.length} accounts.`);

    console.log('Seeding Vouchers (Journal Entries)...');
    for (let i = 1; i <= 20; i++) {
      // Pick 2 random accounts for debit/credit
      const debitAccount = seededAccounts[(i * 2) % 20];
      const creditAccount = seededAccounts[((i * 2) + 1) % 20];
      
      const amount = parseFloat((Math.random() * 1000 + 100).toFixed(2));
      
      const je = await db.insert(journalEntries).values({
        tenantId,
        entryNumber: `VOUCHER-2026-${String(i).padStart(4, '0')}`,
        referenceType: 'MANUAL',
        entryDate: new Date(),
        description: `Manual Voucher Entry ${i}`,
        status: 'POSTED',
      }).returning();

      await db.insert(journalEntryLines).values([
        {
          journalEntryId: je[0].id,
          accountId: debitAccount.id,
          debit: amount,
          credit: 0.00,
          description: `Debit line for ${i}`,
        },
        {
          journalEntryId: je[0].id,
          accountId: creditAccount.id,
          debit: 0.00,
          credit: amount,
          description: `Credit line for ${i}`,
        }
      ]);
    }
    console.log('Seeded 20 Vouchers successfully.');

  } catch (error) {
    console.error('Error seeding data:', error);
  }
  process.exit();
}

seedAccounting();
