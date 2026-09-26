import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { counterSessions } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

// GET current session for a given counter
export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const counterId = searchParams.get('counterId');

    if (!counterId) {
      return NextResponse.json({ error: "counterId is required" }, { status: 400 });
    }

    const [activeSession] = await db
      .select()
      .from(counterSessions)
      .where(
        and(
          eq(counterSessions.tenantId, session.tenantId as string),
          eq(counterSessions.counterId, counterId),
          eq(counterSessions.status, 'OPEN')
        )
      )
      .limit(1);

    return NextResponse.json({ success: true, session: activeSession || null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Open a new session
export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { counterId, openingBalance } = body;

    if (!counterId) {
      return NextResponse.json({ error: "counterId is required" }, { status: 400 });
    }

    // Check if there is already an open session for this counter
    const [existingSession] = await db
      .select()
      .from(counterSessions)
      .where(
        and(
          eq(counterSessions.tenantId, session.tenantId as string),
          eq(counterSessions.counterId, counterId),
          eq(counterSessions.status, 'OPEN')
        )
      )
      .limit(1);

    if (existingSession) {
      return NextResponse.json({ error: "Counter already has an active session" }, { status: 400 });
    }

    const [newSession] = await db.insert(counterSessions).values({
      tenantId: session.tenantId as string,
      counterId,
      userId: session.userId as string,
      openingBalance: openingBalance ? String(openingBalance) : '0.00',
      status: 'OPEN',
    }).returning();

    return NextResponse.json({ success: true, session: newSession });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Close a session
export async function PATCH(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { sessionId, transferAmount, cashSales } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const [existingSession] = await db
      .select()
      .from(counterSessions)
      .where(
        and(
          eq(counterSessions.id, sessionId),
          eq(counterSessions.tenantId, session.tenantId as string),
          eq(counterSessions.status, 'OPEN')
        )
      )
      .limit(1);

    if (!existingSession) {
      return NextResponse.json({ error: "Session not found or already closed" }, { status: 404 });
    }

    const opening = parseFloat(existingSession.openingBalance as string);
    const transfer = parseFloat(transferAmount) || 0.00;
    const sales = parseFloat(cashSales) || 0.00;
    const closing = opening - transfer + sales;

    const [updatedSession] = await db.update(counterSessions).set({
      status: 'CLOSED',
      closedAt: new Date(),
      transferAmount: String(transfer),
      cashSales: String(sales),
      closingBalance: String(closing),
      updatedAt: new Date(),
    })
    .where(eq(counterSessions.id, sessionId))
    .returning();

    return NextResponse.json({ success: true, session: updatedSession });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
