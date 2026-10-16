import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { suppliers, purchaseInvoices, supplierBills } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supplierId = params.id;
    const tenantId = session.tenantId as string;

    // 1. Fetch Supplier Profile
    const [supplier] = await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.id, supplierId)))
      .limit(1);

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    // 2. Fetch Supplier Bills / Purchase Invoices
    const bills = await db
      .select()
      .from(supplierBills)
      .where(and(eq(supplierBills.tenantId, tenantId), eq(supplierBills.supplierId, supplierId)))
      .orderBy(desc(supplierBills.issueDate));

    // Fallback: also check purchaseInvoices if supplierBills is empty
    let allInvoices = bills.map(b => ({
      id: b.id,
      billNumber: b.billNumber,
      issueDate: b.issueDate,
      dueDate: b.dueDate || b.issueDate,
      totalAmount: b.totalAmount,
      paidAmount: b.paidAmount || 0,
      balanceAmount: b.totalAmount - (b.paidAmount || 0),
      status: b.paymentStatus,
    }));

    if (allInvoices.length === 0) {
      const pinvoices = await db
        .select()
        .from(purchaseInvoices)
        .where(and(eq(purchaseInvoices.tenantId, tenantId), eq(purchaseInvoices.supplierId, supplierId)))
        .orderBy(desc(purchaseInvoices.issueDate));

      allInvoices = pinvoices.map(p => ({
        id: p.id,
        billNumber: p.invoiceNumber,
        issueDate: p.issueDate instanceof Date ? p.issueDate.toISOString() : String(p.issueDate),
        dueDate: p.dueDate ? (p.dueDate instanceof Date ? p.dueDate.toISOString() : String(p.dueDate)) : (p.issueDate instanceof Date ? p.issueDate.toISOString() : String(p.issueDate)),
        totalAmount: p.totalAmount,
        paidAmount: (p as any).paidAmount || 0,
        balanceAmount: p.totalAmount - ((p as any).paidAmount || 0),
        status: p.paymentStatus || 'UNPAID',
      }));
    }

    // 3. Compute Aging Buckets (Current 0-30, 31-60, 61-90, 90+)
    const now = new Date();
    let totalPayable = 0;
    let current0to30 = 0;
    let days31to60 = 0;
    let days61to90 = 0;
    let days90Plus = 0;

    const processedBills = allInvoices.map(bill => {
      const dueDate = new Date(bill.dueDate);
      const diffTime = Math.max(0, now.getTime() - dueDate.getTime());
      const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const balance = Math.max(0, bill.balanceAmount);

      totalPayable += balance;

      if (overdueDays <= 30) {
        current0to30 += balance;
      } else if (overdueDays <= 60) {
        days31to60 += balance;
      } else if (overdueDays <= 90) {
        days61to90 += balance;
      } else {
        days90Plus += balance;
      }

      return {
        ...bill,
        overdueDays,
      };
    });

    return NextResponse.json({
      success: true,
      supplier,
      agingSummary: {
        totalPayable,
        current0to30,
        days31to60,
        days61to90,
        days90Plus,
        totalBillsCount: processedBills.length,
      },
      bills: processedBills,
    });
  } catch (error: any) {
    console.error("GET Supplier Aging error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
