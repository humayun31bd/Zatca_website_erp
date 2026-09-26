import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId as string;

    // Group invoices by buyerName/buyerVat and calculate total outstanding
    const customerBalances = await db
      .select({
        customerName: invoices.buyerName,
        customerVat: invoices.buyerVat,
        totalInvoiced: sql<number>`SUM(CAST(${invoices.totalAmount} AS NUMERIC))`,
        totalUnpaid: sql<number>`SUM(CASE WHEN ${invoices.paymentStatus} = 'UNPAID' THEN CAST(${invoices.totalAmount} AS NUMERIC) ELSE 0 END)`,
      })
      .from(invoices)
      .where(eq(invoices.tenantId, tenantId))
      .groupBy(invoices.buyerName, invoices.buyerVat)
      .orderBy(sql`SUM(CASE WHEN ${invoices.paymentStatus} = 'UNPAID' THEN CAST(${invoices.totalAmount} AS NUMERIC) ELSE 0 END) DESC`);

    return NextResponse.json({
      success: true,
      data: customerBalances.filter(b => b.customerName) // Filter out B2C cash sales without names
    });

  } catch (error: any) {
    console.error('Customer balances error:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}
