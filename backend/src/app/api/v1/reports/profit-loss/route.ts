import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, cashBookEntries, tenants } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId as string;
    
    // Parse date range if provided
    const searchParams = req.nextUrl.searchParams;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    
    let dateFilterInvoices = [eq(invoices.tenantId, tenantId)];
    let dateFilterCash = [eq(cashBookEntries.tenantId, tenantId)];

    if (startDateStr) {
      dateFilterInvoices.push(gte(invoices.issueDatetime, new Date(startDateStr)));
      dateFilterCash.push(gte(cashBookEntries.entryDate, new Date(startDateStr)));
    }
    
    if (endDateStr) {
      dateFilterInvoices.push(lte(invoices.issueDatetime, new Date(endDateStr)));
      dateFilterCash.push(lte(cashBookEntries.entryDate, new Date(endDateStr)));
    }

    // Calculate Sales (from Invoices - standard only for now, ideally minus credit notes)
    const salesInvoices = await db.select().from(invoices).where(and(...dateFilterInvoices, eq(invoices.invoiceTypeCode, '388')));
    const creditNotes = await db.select().from(invoices).where(and(...dateFilterInvoices, eq(invoices.invoiceTypeCode, '381')));
    
    let totalSales = 0;
    salesInvoices.forEach(inv => totalSales += parseFloat(inv.subtotalAmount));
    
    let totalReturns = 0;
    creditNotes.forEach(inv => totalReturns += parseFloat(inv.subtotalAmount));

    const netSales = totalSales - totalReturns;

    // Calculate Expenses (from Cash Book OUT entries)
    const cashEntries = await db.select().from(cashBookEntries).where(and(...dateFilterCash, eq(cashBookEntries.type, 'OUT')));
    let totalExpenses = 0;
    cashEntries.forEach(entry => totalExpenses += parseFloat(entry.amount));

    // P&L calculation
    const grossProfit = netSales; // Assuming COGS isn't strictly defined yet, or we'd subtract Purchases
    const netProfit = grossProfit - totalExpenses;

    return NextResponse.json({
      success: true,
      data: {
        totalSales,
        totalReturns,
        netSales,
        totalExpenses,
        grossProfit,
        netProfit,
        currency: 'SAR',
      }
    });

  } catch (error: any) {
    console.error('Profit and Loss error:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}
