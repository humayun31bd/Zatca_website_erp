import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { financialYears, financialPeriods } from "@/lib/db/accounting_schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.nextUrl.searchParams.get("tenantId") || "tenant-grocery-01";

    let data = await db
      .select()
      .from(financialYears)
      .where(eq(financialYears.tenantId, tenantId))
      .orderBy(desc(financialYears.fromDate));

    // Fallback: If no financial year exists for this tenant, auto-seed FY 2026-2027
    if (data.length === 0) {
      const fyFromDate = new Date("2026-07-01T00:00:00.000Z");
      const fyToDate = new Date("2027-06-30T23:59:59.000Z");

      const [seededFy] = await db
        .insert(financialYears)
        .values({
          tenantId,
          name: "FY 2026-2027",
          fromDate: fyFromDate,
          toDate: fyToDate,
          isActive: true,
          isClosed: false,
        })
        .returning();

      // Seed 12 Monthly Financial Periods
      for (let i = 1; i <= 12; i++) {
        const pFrom = new Date(2026, 5 + i, 1);
        const pTo = new Date(2026, 6 + i, 0, 23, 59, 59);
        const monthName = pFrom.toLocaleString("default", { month: "short", year: "numeric" });
        await db.insert(financialPeriods).values({
          tenantId,
          financialYearId: seededFy.id,
          periodNumber: i,
          periodName: `Period ${i} (${monthName})`,
          fromDate: pFrom,
          toDate: pTo,
          isLocked: false,
        });
      }

      data = [seededFy];
    }

    const formatted = [];
    for (const y of data) {
      const periods = await db
        .select()
        .from(financialPeriods)
        .where(eq(financialPeriods.financialYearId, y.id))
        .orderBy(financialPeriods.periodNumber);
      formatted.push({
        ...y,
        yearName: y.name,
        startDate: y.fromDate ? new Date(y.fromDate).toISOString().split("T")[0] : "2026-07-01",
        endDate: y.toDate ? new Date(y.toDate).toISOString().split("T")[0] : "2027-06-30",
        periods: periods.map((p) => ({
          ...p,
          startDate: p.fromDate ? new Date(p.fromDate).toISOString().split("T")[0] : "",
          endDate: p.toDate ? new Date(p.toDate).toISOString().split("T")[0] : "",
        })),
      });
    }

    return NextResponse.json({ success: true, financialYears: formatted });
  } catch (error: any) {
    console.error("GET Financial Years Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId = session?.tenantId || req.headers.get("x-tenant-id") || "tenant-grocery-01";

    const body = await req.json();
    const { name, fromDate, toDate, isActive } = body;

    const start = fromDate ? new Date(fromDate) : new Date("2026-07-01");
    const end = toDate ? new Date(toDate) : new Date("2027-06-30");

    const [newFY] = await db
      .insert(financialYears)
      .values({
        tenantId,
        name: name || "FY 2026-2027",
        fromDate: start,
        toDate: end,
        isActive: isActive ?? true,
        isClosed: false,
      })
      .returning();

    // Auto-generate 12 Monthly Financial Periods
    for (let i = 1; i <= 12; i++) {
      const pFrom = new Date(start.getFullYear(), start.getMonth() + (i - 1), 1);
      const pTo = new Date(start.getFullYear(), start.getMonth() + i, 0, 23, 59, 59);
      const monthName = pFrom.toLocaleString("default", { month: "short", year: "numeric" });
      await db.insert(financialPeriods).values({
        tenantId,
        financialYearId: newFY.id,
        periodNumber: i,
        periodName: `Period ${i} (${monthName})`,
        fromDate: pFrom,
        toDate: pTo,
        isLocked: false,
      });
    }

    const formatted = {
      ...newFY,
      yearName: newFY.name,
      startDate: newFY.fromDate.toISOString().split("T")[0],
      endDate: newFY.toDate.toISOString().split("T")[0],
    };

    return NextResponse.json({ success: true, financialYear: formatted });
  } catch (error: any) {
    console.error("POST Financial Year Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
