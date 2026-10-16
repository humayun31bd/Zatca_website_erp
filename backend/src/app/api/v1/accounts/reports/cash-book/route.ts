import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vouchers, voucherLines, accounts } from "@/lib/db/accounting_schema";
import { formatCurrency } from "@/lib/accounting/formatters";
import { eq, and, gte, lte, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const tenantId = searchParams.get("tenantId") || "default-tenant";
    const fromDateParam = searchParams.get("fromDate");
    const toDateParam = searchParams.get("toDate");
    const lang = (searchParams.get("lang") === "bn" ? "bn" : "en") as "en" | "bn";

    const fromDate = fromDateParam ? new Date(fromDateParam) : new Date("2026-07-01");
    const toDate = toDateParam ? new Date(toDateParam) : new Date();

    // Fetch approved/posted vouchers from local SQLite DB
    const voucherRecords = db
      .select()
      .from(vouchers)
      .where(and(eq(vouchers.tenantId, tenantId)))
      .orderBy(asc(vouchers.voucherDate))
      .all()
      .filter((v) => v.status === "APPROVED" || v.status === "POSTED");

    let runningBalance = 100000; // Default opening balance BDT 100,000
    const reportLines = [
      {
        date: fromDate.toISOString().split("T")[0],
        voucherNumber: "–",
        particulars: "Opening Balance",
        receiptsDr: 0,
        paymentsCr: 0,
        balance: runningBalance,
        formattedReceiptsDr: formatCurrency(0, lang),
        formattedPaymentsCr: formatCurrency(0, lang),
        formattedBalance: formatCurrency(runningBalance, lang),
      },
    ];

    let totalReceipts = 0;
    let totalPayments = 0;

    for (const v of voucherRecords) {
      const vLines = db
        .select()
        .from(voucherLines)
        .where(eq(voucherLines.voucherId, v.id))
        .all();

      for (const l of vLines) {
        if (l.debit > 0) {
          runningBalance += l.debit;
          totalReceipts += l.debit;
          reportLines.push({
            date: new Date(v.voucherDate).toISOString().split("T")[0],
            voucherNumber: v.voucherNumber,
            particulars: v.narration,
            receiptsDr: l.debit,
            paymentsCr: 0,
            balance: runningBalance,
            formattedReceiptsDr: formatCurrency(l.debit, lang),
            formattedPaymentsCr: formatCurrency(0, lang),
            formattedBalance: formatCurrency(runningBalance, lang),
          });
        } else if (l.credit > 0) {
          runningBalance -= l.credit;
          totalPayments += l.credit;
          reportLines.push({
            date: new Date(v.voucherDate).toISOString().split("T")[0],
            voucherNumber: v.voucherNumber,
            particulars: v.narration,
            receiptsDr: 0,
            paymentsCr: l.credit,
            balance: runningBalance,
            formattedReceiptsDr: formatCurrency(0, lang),
            formattedPaymentsCr: formatCurrency(l.credit, lang),
            formattedBalance: formatCurrency(runningBalance, lang),
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      reportName: "Cash Book (Cash in Hand)",
      currency: "BDT",
      language: lang,
      summary: {
        totalReceipts,
        totalPayments,
        closingBalance: runningBalance,
        formattedTotalReceipts: formatCurrency(totalReceipts, lang),
        formattedTotalPayments: formatCurrency(totalPayments, lang),
        formattedClosingBalance: formatCurrency(runningBalance, lang),
      },
      lines: reportLines,
    });
  } catch (error: any) {
    console.error("GET Cash Book Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
