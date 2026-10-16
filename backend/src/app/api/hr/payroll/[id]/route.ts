import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payroll } from '@/lib/db/hr_schema';

import { accounts, journalEntries, journalEntryLines } from '@/lib/db/accounting_schema';
import { eq, and } from 'drizzle-orm';
import { verifySession as verifyAuth } from '@/lib/auth/session';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status } = await request.json();

    if (!status || !['DRAFT', 'APPROVED', 'PAID'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const targetPayroll = await db.select().from(payroll).where(
      and(
        eq(payroll.id, params.id),
        eq(payroll.tenantId, auth.tenantId)
      )
    );

    if (targetPayroll.length === 0) {
      return NextResponse.json({ error: 'Payroll not found' }, { status: 404 });
    }

    const currentRecord = targetPayroll[0];

    // Check if we are approving this payroll
    if (status === 'APPROVED' && currentRecord.status !== 'APPROVED') {
      // Fetch required accounts for the journal entry
      const accList = await db.select().from(accounts).where(eq(accounts.tenantId, auth.tenantId as string));
      const expenseAcc = accList.find(a => a.code === '5.20.02.001.001'); // Salaries Expense
      const liabilityAcc = accList.find(a => a.code === '2.10.03.001.001'); // Salaries Payable
      const bankAcc = accList.find(a => a.code === '1.10.01.002.001'); // Operating Account
      const cashAcc = accList.find(a => a.code === '1.10.01.001.001'); // Petty Cash

      let creditAcc = liabilityAcc;
      if (currentRecord.paymentMethod === 'CASH') {
        creditAcc = cashAcc || liabilityAcc;
      } else if (currentRecord.paymentMethod === 'BANK') {
        creditAcc = bankAcc || liabilityAcc;
      }

      if (expenseAcc && creditAcc) {
        // Create a POSTED journal entry automatically mapping the expense
        const jeNumber = `PR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        
        const [newJe] = await db.insert(journalEntries).values({
          tenantId: auth.tenantId as string,
          entryNumber: jeNumber,
          referenceType: 'PAYROLL',
          referenceId: currentRecord.id,
          entryDate: new Date(),
          description: `Payroll Voucher - Emp ${currentRecord.employeeId} for ${currentRecord.month}/${currentRecord.year}`,
          status: 'POSTED',
        }).returning();

        await db.insert(journalEntryLines).values([
          {
            journalEntryId: newJe.id,
            accountId: expenseAcc.id,
            debit: currentRecord.netSalary,
            credit: 0,
            description: `Salary Expense for ${currentRecord.month}/${currentRecord.year}`,
          },
          {
            journalEntryId: newJe.id,
            accountId: creditAcc.id,
            debit: 0,
            credit: currentRecord.netSalary,
            description: `Payroll Accrual/Payment for ${currentRecord.month}/${currentRecord.year}`,
          }
        ]);
      }
    }

    const updated = await db.update(payroll)
      .set({ status })
      .where(
        and(
          eq(payroll.id, params.id),
          eq(payroll.tenantId, auth.tenantId)
        )
      )
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Failed to update payroll:', error);
    return NextResponse.json({ error: 'Failed to update payroll' }, { status: 500 });
  }
}
