// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/hr_schema";
import { eq } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { employeeId, endDate, reason } = body; // reason: "RESIGNATION" or "TERMINATION"

    const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId));
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    if (!employee.joiningDate) {
      return NextResponse.json({ error: "Employee joining date not set" }, { status: 400 });
    }

    const start = new Date(employee.joiningDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const years = diffTime / (1000 * 60 * 60 * 24 * 365.25);

    const basicSalary = parseFloat(employee.basicSalary || "0");
    if (basicSalary === 0) {
      return NextResponse.json({ error: "Basic salary not set" }, { status: 400 });
    }

    let fullAward = 0;
    if (years <= 5) {
      fullAward = years * (basicSalary / 2);
    } else {
      fullAward = (5 * (basicSalary / 2)) + ((years - 5) * basicSalary);
    }

    let payableAward = fullAward;
    if (reason === "RESIGNATION") {
      if (years < 2) {
        payableAward = 0;
      } else if (years >= 2 && years < 5) {
        payableAward = fullAward / 3;
      } else if (years >= 5 && years < 10) {
        payableAward = (fullAward * 2) / 3;
      } else {
        payableAward = fullAward;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        employeeId: employee.id,
        yearsOfService: Number(Number(yearsOfService).toFixed(2)),
        basicSalary,
        fullAward: Number(fullAward.toFixed(2)),
        payableAward: Number(payableAward.toFixed(2)),
        reason
      }
    });

  } catch (error: any) {
    console.error("POST EOSB Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
