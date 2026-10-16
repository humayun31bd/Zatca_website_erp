import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chequeLeaves } from "@/lib/db/accounting_schema";
import { verifySession } from "@/lib/auth/session";
import { eq, and, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.nextUrl.searchParams.get("tenantId") || "tenant-grocery-01";
    const bankAccountId = req.nextUrl.searchParams.get("bankAccountId");

    if (!bankAccountId) {
      return NextResponse.json({ error: "Missing required query parameter: bankAccountId" }, { status: 400 });
    }

    const availableLeaves = await db
      .select()
      .from(chequeLeaves)
      .where(and(
        eq(chequeLeaves.tenantId, tenantId),
        eq(chequeLeaves.bankAccountId, bankAccountId),
        eq(chequeLeaves.status, "AVAILABLE")
      ))
      .orderBy(asc(chequeLeaves.leafNumber));

    const nextLeaf = availableLeaves.length > 0 ? availableLeaves[0] : null;

    return NextResponse.json({
      success: true,
      availableLeaf: nextLeaf,
    });
  } catch (error: any) {
    console.error("GET Available Cheque Leaf Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
