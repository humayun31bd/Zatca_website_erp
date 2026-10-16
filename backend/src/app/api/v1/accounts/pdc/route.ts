import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chequeLeaves, chequeBooks, accounts } from "@/lib/db/accounting_schema";
import { logChequeAudit } from "@/lib/accounting/cheque_audit_helper";
import { verifySession } from "@/lib/auth/session";
import { eq, and, desc, or, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.nextUrl.searchParams.get("tenantId") || "tenant-grocery-01";
    const bankAccountId = req.nextUrl.searchParams.get("bankAccountId");
    const pdcType = req.nextUrl.searchParams.get("type"); // RECEIVED, ISSUED, ALL
    const status = req.nextUrl.searchParams.get("status");
    const maturityFilter = req.nextUrl.searchParams.get("maturity"); // DUE_TODAY, DUE_THIS_WEEK, OVERDUE, ALL

    let whereConditions: any[] = [eq(chequeLeaves.tenantId, tenantId)];

    if (bankAccountId) {
      whereConditions.push(eq(chequeLeaves.bankAccountId, bankAccountId));
    }

    if (pdcType === "RECEIVED") {
      whereConditions.push(inArray(chequeLeaves.status, ["RECEIVED", "PRESENTED"]));
    } else if (pdcType === "ISSUED") {
      whereConditions.push(inArray(chequeLeaves.status, ["ISSUED", "CLEARED", "BOUNCED"]));
    } else if (status && status !== "ALL") {
      whereConditions.push(eq(chequeLeaves.status, status));
    } else {
      // Default: Return active/held PDCs and leaves with details
      whereConditions.push(or(
        eq(chequeLeaves.status, "RECEIVED"),
        eq(chequeLeaves.status, "ISSUED"),
        eq(chequeLeaves.status, "PRESENTED"),
        eq(chequeLeaves.status, "CLEARED"),
        eq(chequeLeaves.status, "BOUNCED")
      ));
    }

    const rawLeaves = await db
      .select({
        id: chequeLeaves.id,
        tenantId: chequeLeaves.tenantId,
        chequeBookId: chequeLeaves.chequeBookId,
        bankAccountId: chequeLeaves.bankAccountId,
        leafNumber: chequeLeaves.leafNumber,
        status: chequeLeaves.status,
        voucherId: chequeLeaves.voucherId,
        payeeName: chequeLeaves.payeeName,
        amount: chequeLeaves.amount,
        issuedDate: chequeLeaves.issuedDate,
        clearedDate: chequeLeaves.clearedDate,
        bouncedDate: chequeLeaves.bouncedDate,
        remarks: chequeLeaves.remarks,
        createdAt: chequeLeaves.createdAt,
        bankAccountName: accounts.name,
        chequeBookNumber: chequeBooks.chequeBookNumber,
      })
      .from(chequeLeaves)
      .leftJoin(accounts, eq(chequeLeaves.bankAccountId, accounts.id))
      .leftJoin(chequeBooks, eq(chequeLeaves.chequeBookId, chequeBooks.id))
      .where(and(...whereConditions))
      .orderBy(desc(chequeLeaves.createdAt));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const pdcs = rawLeaves.map((leaf) => {
      const issuedDateObj = leaf.issuedDate
        ? (leaf.issuedDate instanceof Date ? leaf.issuedDate : new Date(Number(leaf.issuedDate) * 1000))
        : null;

      let maturityAlert = "FUTURE";
      if (issuedDateObj) {
        const itemDate = new Date(issuedDateObj);
        itemDate.setHours(0, 0, 0, 0);
        if (itemDate < today && leaf.status !== "CLEARED") {
          maturityAlert = "OVERDUE";
        } else if (itemDate.getTime() === today.getTime()) {
          maturityAlert = "DUE_TODAY";
        } else if (itemDate <= sevenDaysFromNow) {
          maturityAlert = "DUE_THIS_WEEK";
        }
      }

      const isReceived = leaf.status === "RECEIVED" || leaf.status === "PRESENTED";

      return {
        ...leaf,
        pdcCategory: isReceived ? "RECEIVED_PDC" : "ISSUED_PDC",
        bankAccountName: leaf.bankAccountName || "Bank Account",
        chequeBookNumber: leaf.chequeBookNumber || "N/A",
        issuedDate: issuedDateObj ? issuedDateObj.toISOString() : null,
        clearedDate: leaf.clearedDate ? (leaf.clearedDate instanceof Date ? leaf.clearedDate.toISOString() : new Date(Number(leaf.clearedDate) * 1000).toISOString()) : null,
        bouncedDate: leaf.bouncedDate ? (leaf.bouncedDate instanceof Date ? leaf.bouncedDate.toISOString() : new Date(Number(leaf.bouncedDate) * 1000).toISOString()) : null,
        createdAt: leaf.createdAt instanceof Date ? leaf.createdAt.toISOString() : new Date(Number(leaf.createdAt) * 1000).toISOString(),
        maturityAlert,
      };
    });

    let filtered = pdcs;
    if (maturityFilter && maturityFilter !== "ALL") {
      filtered = pdcs.filter((p) => p.maturityAlert === maturityFilter);
    }

    return NextResponse.json({
      success: true,
      count: filtered.length,
      pdcs: filtered,
      summary: {
        totalReceivedCount: pdcs.filter((p) => p.pdcCategory === "RECEIVED_PDC").length,
        totalIssuedCount: pdcs.filter((p) => p.pdcCategory === "ISSUED_PDC").length,
        overdueCount: pdcs.filter((p) => p.maturityAlert === "OVERDUE").length,
        dueTodayCount: pdcs.filter((p) => p.maturityAlert === "DUE_TODAY").length,
        dueThisWeekCount: pdcs.filter((p) => p.maturityAlert === "DUE_THIS_WEEK").length,
      },
    });
  } catch (error: any) {
    console.error("GET PDC Register Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || "tenant-grocery-01";
    const userName = session?.userName || "Financial Controller / Maker";

    const body = await req.json();
    const {
      bankAccountId,
      chequeNumber,
      drawerName, // Payee/Customer Name
      amount,
      issueDate,
      maturityDate,
      remarks,
    } = body;

    if (!bankAccountId || !chequeNumber || !drawerName || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: bankAccountId, chequeNumber, drawerName, amount." },
        { status: 400 }
      );
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount value." }, { status: 400 });
    }

    const issuedDateObj = maturityDate ? new Date(maturityDate) : (issueDate ? new Date(issueDate) : new Date());

    const result = await db.transaction(async (tx) => {
      const [newLeaf] = await tx
        .insert(chequeLeaves)
        .values({
          tenantId,
          bankAccountId,
          leafNumber: String(chequeNumber).trim(),
          status: "RECEIVED",
          payeeName: drawerName.trim(),
          amount: numericAmount,
          issuedDate: issuedDateObj,
          remarks: remarks || `Received PDC from ${drawerName}`,
        })
        .returning();

      await logChequeAudit({
        tenantId,
        chequeLeafId: newLeaf.id,
        actionType: "PDC_RECEIVED",
        previousStatus: null,
        newStatus: "RECEIVED",
        performedBy: userName,
        remarks: `Received Customer PDC from ${drawerName} for SAR ${numericAmount}`,
        tx,
      });

      return newLeaf;
    });

    return NextResponse.json({
      success: true,
      message: `Received Customer PDC #${result.leafNumber} recorded successfully.`,
      pdc: result,
    });
  } catch (error: any) {
    console.error("POST Record Received PDC Error:", error);
    return NextResponse.json({ error: error.message || "Failed to record PDC" }, { status: 500 });
  }
}
