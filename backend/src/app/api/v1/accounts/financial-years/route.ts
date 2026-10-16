import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { financialYears, financialPeriods } from "@/lib/db/accounting_schema";
import { verifySession } from "@/lib/auth/session";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.nextUrl.searchParams.get("tenantId") || "tenant-grocery-01";

    const years = await db
      .select()
      .from(financialYears)
      .where(eq(financialYears.tenantId, tenantId))
      .orderBy(desc(financialYears.fromDate));

    const result = [];
    for (const y of years) {
      const periods = await db
        .select()
        .from(financialPeriods)
        .where(eq(financialPeriods.financialYearId, y.id))
        .orderBy(financialPeriods.periodNumber);

      result.push({
        ...y,
        yearName: y.name,
        startDate: y.fromDate ? new Date(y.fromDate).toISOString() : "",
        endDate: y.toDate ? new Date(y.toDate).toISOString() : "",
        periods: periods.map((p) => ({
          ...p,
          startDate: p.fromDate ? new Date(p.fromDate).toISOString() : "",
          endDate: p.toDate ? new Date(p.toDate).toISOString() : "",
        })),
      });
    }

    return NextResponse.json({
      success: true,
      financialYears: result,
    });
  } catch (error: any) {
    console.error("Get Financial Years Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.headers.get("x-tenant-id") || "tenant-grocery-01";

    const body = await req.json();
    const { name, fromDate, toDate, isActive = true } = body;

    if (!name || !fromDate || !toDate) {
      return NextResponse.json({ error: "name, fromDate, and toDate are required" }, { status: 400 });
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);

    const [createdYear] = await db
      .insert(financialYears)
      .values({
        tenantId,
        name,
        fromDate: start,
        toDate: end,
        isActive: Boolean(isActive),
        isClosed: false,
      })
      .returning();

    // Auto-generate 12 Monthly Financial Periods
    const generatedPeriods = [];
    const current = new Date(start);

    for (let i = 1; i <= 12; i++) {
      const pFrom = new Date(current.getFullYear(), current.getMonth() + (i - 1), 1);
      const pTo = new Date(current.getFullYear(), current.getMonth() + i, 0, 23, 59, 59);
      const monthName = pFrom.toLocaleString("default", { month: "short", year: "numeric" });

      const [p] = await db
        .insert(financialPeriods)
        .values({
          tenantId,
          financialYearId: createdYear.id,
          periodNumber: i,
          periodName: `Period ${i} (${monthName})`,
          fromDate: pFrom,
          toDate: pTo,
          isLocked: false,
        })
        .returning();

      generatedPeriods.push(p);
    }

    return NextResponse.json({
      success: true,
      message: `Financial Year '${createdYear.name}' created with 12 monthly periods.`,
      financialYear: createdYear,
      periods: generatedPeriods,
    });
  } catch (error: any) {
    console.error("Create Financial Year Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
