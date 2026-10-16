import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chequeBooks, chequeLeaves, accounts } from "@/lib/db/accounting_schema";
import { verifySession } from "@/lib/auth/session";
import { eq, and, desc, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.nextUrl.searchParams.get("tenantId") || "tenant-grocery-01";
    const bankAccountId = req.nextUrl.searchParams.get("bankAccountId");

    let whereClause = eq(chequeBooks.tenantId, tenantId);
    if (bankAccountId) {
      whereClause = and(eq(chequeBooks.tenantId, tenantId), eq(chequeBooks.bankAccountId, bankAccountId)) as any;
    }

    const booksWithBank = await db
      .select({
        id: chequeBooks.id,
        tenantId: chequeBooks.tenantId,
        bankAccountId: chequeBooks.bankAccountId,
        chequeBookNumber: chequeBooks.chequeBookNumber,
        startLeafNumber: chequeBooks.startLeafNumber,
        endLeafNumber: chequeBooks.endLeafNumber,
        totalLeaves: chequeBooks.totalLeaves,
        status: chequeBooks.status,
        createdAt: chequeBooks.createdAt,
        bankAccountName: accounts.name,
        bankAccountCode: accounts.code,
      })
      .from(chequeBooks)
      .leftJoin(accounts, eq(chequeBooks.bankAccountId, accounts.id))
      .where(whereClause)
      .orderBy(desc(chequeBooks.createdAt));

    if (booksWithBank.length === 0) {
      return NextResponse.json({ success: true, chequeBooks: [] });
    }

    const bookIds = booksWithBank.map(b => b.id);
    const leaves = await db
      .select()
      .from(chequeLeaves)
      .where(inArray(chequeLeaves.chequeBookId, bookIds));

    // Aggregate stats per cheque book
    const leavesMap: Record<string, { available: number; issued: number; cleared: number; bounced: number; total: number }> = {};
    for (const leaf of leaves) {
      const bookId = leaf.chequeBookId;
      if (!bookId) continue;
      if (!leavesMap[bookId]) {
        leavesMap[bookId] = { available: 0, issued: 0, cleared: 0, bounced: 0, total: 0 };
      }
      leavesMap[bookId].total++;
      if (leaf.status === 'AVAILABLE') leavesMap[bookId].available++;
      else if (leaf.status === 'ISSUED' || leaf.status === 'PRESENTED') leavesMap[bookId].issued++;
      else if (leaf.status === 'CLEARED') leavesMap[bookId].cleared++;
      else if (leaf.status === 'BOUNCED') leavesMap[bookId].bounced++;
    }

    const result = booksWithBank.map(b => {
      const stats = leavesMap[b.id] || { available: b.totalLeaves, issued: 0, cleared: 0, bounced: 0, total: b.totalLeaves };
      return {
        ...b,
        bankAccountName: b.bankAccountName || 'Bank Account',
        availableLeavesCount: stats.available,
        issuedLeavesCount: stats.issued,
        clearedLeavesCount: stats.cleared,
        bouncedLeavesCount: stats.bounced,
        usedLeavesCount: stats.total - stats.available,
        createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : new Date(b.createdAt * 1000).toISOString(),
      };
    });

    return NextResponse.json({ success: true, chequeBooks: result });
  } catch (error: any) {
    console.error("GET Cheque Books Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || "tenant-grocery-01";

    const body = await req.json();
    const { bankAccountId, chequeBookNumber, startLeafNumber, totalLeaves } = body;

    if (!bankAccountId || !chequeBookNumber || !startLeafNumber || !totalLeaves) {
      return NextResponse.json(
        { error: "Missing required fields: bankAccountId, chequeBookNumber, startLeafNumber, totalLeaves." },
        { status: 400 }
      );
    }

    const startNum = parseInt(startLeafNumber, 10);
    const count = parseInt(totalLeaves, 10);
    if (isNaN(startNum) || isNaN(count) || count <= 0) {
      return NextResponse.json({ error: "Invalid startLeafNumber or totalLeaves" }, { status: 400 });
    }
    const endNum = startNum + count - 1;

    // Transactionally create Cheque Book & batch insert Cheque Leaves
    const result = db.transaction((tx) => {
      const [book] = tx
        .insert(chequeBooks)
        .values({
          tenantId,
          bankAccountId,
          chequeBookNumber: String(chequeBookNumber).trim(),
          startLeafNumber: startNum,
          endLeafNumber: endNum,
          totalLeaves: count,
          status: "ACTIVE",
        })
        .returning()
        .all();

      const leavesToInsert = [];
      for (let i = 0; i < count; i++) {
        const leafNo = (startNum + i).toString().padStart(6, "0");
        leavesToInsert.push({
          tenantId,
          chequeBookId: book.id,
          bankAccountId,
          leafNumber: leafNo,
          status: "AVAILABLE",
        });
      }

      tx.insert(chequeLeaves).values(leavesToInsert);

      return { book, generatedLeavesCount: leavesToInsert.length };
    });

    return NextResponse.json({ success: true, message: "Cheque Book registered successfully!", data: result });
  } catch (error: any) {
    console.error("POST Cheque Book Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
