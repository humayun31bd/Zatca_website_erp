import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { journalEntries, journalEntryLines, accounts, voucherEntryPolicies } from "@/lib/db/accounting_schema";
import { verifySession } from "@/lib/auth/session";
import { eq, desc, and } from "drizzle-orm";

// Types of Vouchers: 
// RECEIPT_VOUCHER, PAYMENT_VOUCHER, CONTRA_VOUCHER, JOURNAL_VOUCHER

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId as string;
    const { searchParams } = new URL(req.url);
    const voucherType = searchParams.get('voucherType') || searchParams.get('type');
    const status = searchParams.get('status');

    // Fetch journal entries from database
    const entries = await db.query.journalEntries.findMany({
      where: (je, { eq, and }) => {
        const conditions = [eq(je.tenantId, tenantId)];
        if (voucherType && voucherType !== 'ALL') {
          conditions.push(eq(je.referenceType, voucherType));
        }
        if (status && status !== 'ALL') {
          conditions.push(eq(je.status, status));
        }
        return and(...conditions);
      },
      orderBy: [desc(journalEntries.entryDate), desc(journalEntries.createdAt)],
      with: {
        lines: {
          with: {
            account: true,
            costCenter: true,
          }
        }
      }
    });

    const formatted = entries.map((entry) => {
      const totalDebit = entry.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
      const totalCredit = entry.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
      const totalAmount = totalDebit > 0 ? totalDebit : totalCredit;

      return {
        id: entry.id,
        voucherNumber: entry.entryNumber,
        voucherType: entry.referenceType || 'JOURNAL_VOUCHER',
        voucherDate: entry.entryDate ? new Date(entry.entryDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        fiscalYear: '2026-2027',
        periodNumber: 4,
        narration: entry.description || '',
        totalAmount: totalAmount,
        status: entry.status || 'POSTED',
        lines: entry.lines.map((line: any) => ({
          id: line.id,
          accountId: line.accountId,
          costCenterId: line.costCenterId || null,
          costCenter: line.costCenter ? {
            id: line.costCenter.id,
            code: line.costCenter.code,
            name: line.costCenter.name,
            sourceType: line.costCenter.sourceType,
            sourceId: line.costCenter.sourceId,
            category: line.costCenter.category,
          } : null,
          costCenterName: line.costCenter?.name || null,
          costCenterCode: line.costCenter?.code || null,
          costCenterRef: line.costCenter ? (line.costCenter.sourceId ? `${line.costCenter.sourceType}: ${line.costCenter.sourceId}` : line.costCenter.sourceType) : null,
          code: line.account?.code || 'N/A',
          accountName: line.account?.name || 'Unknown Account',
          hasCostCenter: Boolean(line.account?.hasCostCenter),
          debit: line.debit,
          credit: line.credit,
          description: line.description || ''
        }))
      };
    });

    return NextResponse.json({ success: true, vouchers: formatted });
  } catch (error: any) {
    console.error("GET Vouchers Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId as string;
    const body = await req.json();
    
    // body: { voucherType, date, description, lines: [{ accountId, debit, credit, description }] }
    const { voucherType, date, description, lines } = body;

    if (!lines || lines.length < 2) {
      return NextResponse.json({ error: "A voucher must have at least 2 lines." }, { status: 400 });
    }

    const missingAccount = lines.some((l: any) => !l.accountId || String(l.accountId).trim() === '');
    if (missingAccount) {
      return NextResponse.json({ error: "All voucher lines must have a valid account selected." }, { status: 400 });
    }

    // Validate Debit = Credit
    let totalDebit = 0;
    let totalCredit = 0;
    lines.forEach((l: any) => {
      totalDebit += parseFloat(l.debit || 0);
      totalCredit += parseFloat(l.credit || 0);
    });

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      return NextResponse.json({ error: "Debits and Credits must balance." }, { status: 400 });
    }

    // Fetch Tenant Voucher Entry Policy
    const policy = await db.select()
      .from(voucherEntryPolicies)
      .where(eq(voucherEntryPolicies.tenantId, tenantId))
      .get();

    let initialStatus = 'POSTED';
    const isPosVoucher = voucherType === 'POS_DAYEND' || voucherType === 'POS';
    const isSystemModule = body.isSystemModule === true || voucherType === 'PURCHASE' || voucherType === 'INVOICE' || voucherType === 'STOCK';

    if (isPosVoucher) {
      initialStatus = (policy?.posVoucherControl === 'ACCOUNTANT_APPROVAL') ? 'DRAFT' : 'POSTED';
    } else if (isSystemModule) {
      initialStatus = (policy?.directPostSystemVouchers === false) ? 'DRAFT' : 'POSTED';
    } else {
      // Manual Cashier / User Voucher
      initialStatus = (policy?.requireCashierApproval ?? true) ? 'DRAFT' : 'POSTED';
    }

    const entryNumber = `${voucherType}-${new Date().getTime()}`;

    // Create Journal Entry
    const [je] = await db.insert(journalEntries).values({
      tenantId,
      entryNumber,
      referenceType: voucherType,
      entryDate: new Date(date),
      description: description || `Created via ${voucherType}`,
      status: initialStatus
    }).returning();

    // Create Lines
    const linesToInsert = lines.map((l: any) => ({
      journalEntryId: je.id,
      accountId: l.accountId,
      costCenterId: l.costCenterId || null,
      debit: Number(l.debit || 0),
      credit: Number(l.credit || 0),
      description: l.description || '',
    }));

    await db.insert(journalEntryLines).values(linesToInsert);

    return NextResponse.json({ success: true, journalEntry: je });
  } catch (error: any) {
    console.error("POST Voucher Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId as string;
    const body = await req.json();
    const { id, status, remarks } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Voucher ID and target status are required." }, { status: 400 });
    }

    if (!['POSTED', 'APPROVED', 'REJECTED', 'DRAFT'].includes(status)) {
      return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
    }

    const targetStatus = status === 'APPROVED' ? 'POSTED' : status;

    const [updated] = await db.update(journalEntries)
      .set({
        status: targetStatus,
        description: remarks ? `${remarks}` : undefined,
        updatedAt: new Date()
      })
      .where(and(eq(journalEntries.id, id), eq(journalEntries.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Voucher not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, voucher: updated });
  } catch (error: any) {
    console.error("PUT Voucher Approval Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
