// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { accounts, journalEntryLines, journalEntries } from "@/lib/db/accounting_schema";
import { eq, desc, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.tenantId, session.tenantId as string))
      .orderBy(desc(invoices.issueDatetime));

    let totalRevenue = 0;
    let invoicesCleared = 0;
    let overdueAmount = 0;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (const inv of tenantInvoices) {
      if (inv.zatcaStatus === 'CLEARED' || inv.zatcaStatus === 'REPORTED') {
        invoicesCleared++;
      }

      if (inv.paymentStatus === 'UNPAID' && inv.issueDatetime < thirtyDaysAgo) {
        overdueAmount += Number(inv.totalAmount);
      }
    }

    // Calculate actual Revenue and Cash from the Ledger
    const accList = await db.select().from(accounts).where(eq(accounts.tenantId, session.tenantId as string));
    const revenueAcc = accList.find(a => a.code === '4.10.01.001.001'); // General Sales
    const cashAcc = accList.find(a => a.code === '1.10.01.001.001'); // Petty Cash
    const bankAcc = accList.find(a => a.code === '1.10.01.002.001'); // Operating Account

    let totalCashOnHand = 0;

    if (revenueAcc) {
      const revenueLines = await db.select().from(journalEntryLines)
        .leftJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
        .where(
          and(
            eq(journalEntries.tenantId, session.tenantId as string),
            eq(journalEntries.status, 'POSTED'),
            eq(journalEntryLines.accountId, revenueAcc.id)
          )
        );
        
      totalRevenue = revenueLines.reduce((acc, row) => {
        return acc + (Number(row.journal_entry_lines.credit) - Number(row.journal_entry_lines.debit));
      }, 0);
    }

    if (cashAcc || bankAcc) {
      const accIds = [cashAcc?.id, bankAcc?.id].filter(Boolean) as string[];
      if (accIds.length > 0) {
        // We can just query them separately or together
        const cashLines = await db.select().from(journalEntryLines)
          .leftJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
          .where(
            and(
              eq(journalEntries.tenantId, session.tenantId as string),
              eq(journalEntries.status, 'POSTED')
            )
          );
          
        totalCashOnHand = cashLines.filter(row => accIds.includes(row.journal_entry_lines.accountId)).reduce((acc, row) => {
          return acc + (Number(row.journal_entry_lines.debit) - Number(row.journal_entry_lines.credit));
        }, 0);
      }
    }

    const recentActivity = tenantInvoices.slice(0, 5).map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      buyerName: inv.buyerName || 'Unknown Client',
      totalAmount: Number(inv.totalAmount),
      totalVatAmount: parseFloat(inv.totalVatAmount as string),
      zatcaStatus: inv.zatcaStatus,
      issueDatetime: inv.issueDatetime.toISOString(),
      zatcaQrBase64: inv.qrCodeBase64
    }));

    return NextResponse.json({
      totalRevenue,
      invoicesCleared,
      overdueAmount,
      totalCashOnHand,
      isZatcaHealthy: true,
      recentActivity
    });

  } catch (error: any) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204 });
}
