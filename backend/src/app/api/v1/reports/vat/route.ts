import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");

    let conditions = [eq(invoices.tenantId, session.tenantId)];

    if (startDateParam) {
      conditions.push(gte(invoices.issueDatetime, new Date(startDateParam)));
    }
    if (endDateParam) {
      conditions.push(lte(invoices.issueDatetime, new Date(endDateParam)));
    }

    const allInvoices = await db.query.invoices.findMany({
      where: and(...conditions)
    });

    let totalSales = 0;
    let totalVat = 0;
    let netRevenue = 0;

    const invoiceList = allInvoices.map((inv) => {
      const amount = parseFloat(inv.totalAmount as string);
      const vat = parseFloat(inv.totalVatAmount as string);
      const subtotal = parseFloat(inv.subtotalAmount as string);

      totalSales += amount;
      totalVat += vat;
      netRevenue += subtotal;

      return {
        invoiceNumber: inv.invoiceNumber,
        date: inv.issueDatetime,
        buyerName: inv.buyerName || 'N/A',
        buyerVat: inv.buyerVat || 'N/A',
        subtotal: subtotal,
        vatAmount: vat,
        totalAmount: amount,
        status: inv.zatcaStatus
      };
    });

    return NextResponse.json({
      summary: {
        totalSales,
        totalVat,
        netRevenue
      },
      invoices: invoiceList
    });

  } catch (error: any) {
    console.error('VAT report error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
