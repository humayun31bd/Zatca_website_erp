import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vouchers, voucherLines, accounts } from "@/lib/db/accounting_schema";
import { formatCurrency } from "@/lib/accounting/formatters";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const tenantId = searchParams.get("tenantId") || "default-tenant";
    const lang = (searchParams.get("lang") === "bn" ? "bn" : "en") as "en" | "bn";

    // Fetch Level 5 Posting Accounts
    const allAccounts = db
      .select()
      .from(accounts)
      .where(eq(accounts.tenantId, tenantId))
      .all();

    // Fetch approved/posted voucher lines
    const approvedVouchers = db
      .select()
      .from(vouchers)
      .where(eq(vouchers.tenantId, tenantId))
      .all()
      .filter((v) => v.status === "APPROVED" || v.status === "POSTED");

    const accountTotals: Record<string, { code: string; name: string; debit: number; credit: number }> = {};

    // Initialize map
    for (const acc of allAccounts) {
      accountTotals[acc.id] = {
        code: acc.code,
        name: acc.name,
        debit: 0,
        credit: 0,
      };
    }

    let overallDebit = 0;
    let overallCredit = 0;

    for (const v of approvedVouchers) {
      const lines = db
        .select()
        .from(voucherLines)
        .where(eq(voucherLines.voucherId, v.id))
        .all();

      for (const line of lines) {
        if (!accountTotals[line.accountId]) {
          accountTotals[line.accountId] = {
            code: "UNKNOWN",
            name: "Posting Account",
            debit: 0,
            credit: 0,
          };
        }

        accountTotals[line.accountId].debit += line.debit;
        accountTotals[line.accountId].credit += line.credit;
        overallDebit += line.debit;
        overallCredit += line.credit;
      }
    }

    const roundedTotalDebit = Math.round(overallDebit * 100) / 100;
    const roundedTotalCredit = Math.round(overallCredit * 100) / 100;
    const isBalanced = Math.abs(roundedTotalDebit - roundedTotalCredit) < 0.01;

    const reportRows = Object.values(accountTotals)
      .filter((acc) => acc.debit > 0 || acc.credit > 0)
      .map((acc) => ({
        accountCode: acc.code,
        accountName: acc.name,
        debit: acc.debit,
        credit: acc.credit,
        formattedDebit: formatCurrency(acc.debit, lang),
        formattedCredit: formatCurrency(acc.credit, lang),
      }));

    return NextResponse.json({
      success: true,
      reportName: "Trial Balance",
      currency: "BDT",
      language: lang,
      isBalanced,
      totals: {
        totalDebit: roundedTotalDebit,
        totalCredit: roundedTotalCredit,
        difference: Math.abs(roundedTotalDebit - roundedTotalCredit),
        formattedTotalDebit: formatCurrency(roundedTotalDebit, lang),
        formattedTotalCredit: formatCurrency(roundedTotalCredit, lang),
      },
      accounts: reportRows,
    });
  } catch (error: any) {
    console.error("GET Trial Balance Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
