import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const data = await db.query.invoices.findMany({
      orderBy: [desc(invoices.issueDatetime)],
      with: {
        payments: true,
      },
      limit: 1,
    });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Test DB Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
