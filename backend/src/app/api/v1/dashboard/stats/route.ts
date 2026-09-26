import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
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
      totalRevenue += parseFloat(inv.totalAmount as string);
      
      if (inv.zatcaStatus === 'CLEARED') {
        invoicesCleared++;
      }

      if (inv.paymentStatus === 'UNPAID' && inv.issueDatetime < thirtyDaysAgo) {
        overdueAmount += parseFloat(inv.totalAmount as string);
      }
    }

    const recentActivity = tenantInvoices.slice(0, 5).map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      buyerName: inv.buyerName || 'Unknown Client',
      totalAmount: parseFloat(inv.totalAmount as string),
      totalVatAmount: parseFloat(inv.totalVatAmount as string),
      zatcaStatus: inv.zatcaStatus,
      issueDatetime: inv.issueDatetime.toISOString(),
      zatcaQrBase64: inv.qrCodeBase64
    }));

    return NextResponse.json({
      totalRevenue,
      invoicesCleared,
      overdueAmount,
      isZatcaHealthy: true,
      recentActivity
    });

  } catch (error: any) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
