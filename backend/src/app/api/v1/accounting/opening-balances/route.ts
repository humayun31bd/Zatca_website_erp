import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import {
  setFiscalYearOpeningBalances,
  getFiscalYearOpeningBalances,
} from "@/lib/accounting/opening_balance_service";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const financialYearId = searchParams.get("financialYearId");

    if (!financialYearId) {
      return NextResponse.json({ error: "financialYearId query parameter is required" }, { status: 400 });
    }

    const data = await getFiscalYearOpeningBalances(session.tenantId as string, financialYearId);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET Opening Balances Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { financialYearId, lines, entryDate, isGenesis } = body;

    if (!financialYearId || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: "financialYearId and a non-empty lines array are required" },
        { status: 400 }
      );
    }

    const result = await setFiscalYearOpeningBalances({
      tenantId: session.tenantId as string,
      financialYearId,
      lines,
      entryDate: entryDate ? new Date(entryDate) : new Date(),
      isGenesis: Boolean(isGenesis),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("POST Opening Balances Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
