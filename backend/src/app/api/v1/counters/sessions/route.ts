// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { counterSessions, counters, users } from "@/lib/db/schema";
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

    const whereConditions = [
      eq(counterSessions.counterId, counterId),
      eq(counterSessions.status, 'OPEN')
    ];
    if (session.tenantId) {
      whereConditions.push(eq(counterSessions.tenantId, session.tenantId as string));
    }

    const [activeSession] = await db
      .select()
      .from(counterSessions)
      .where(and(...whereConditions))
      .limit(1);

    return NextResponse.json({ success: true, session: activeSession || null });
  } catch (error: any) {
    console.error("GET /counters/sessions error:", error);
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

    // Verify counter exists
    const [counter] = await db
      .select()
      .from(counters)
      .where(eq(counters.id, counterId))
      .limit(1);

    if (!counter) {
      return NextResponse.json({ error: "Counter not found" }, { status: 404 });
    }

    const tenantId = (session.tenantId as string) || counter.tenantId;

    // Check if there is already an open session for this counter
    const [existingSession] = await db
      .select()
      .from(counterSessions)
      .where(
        and(
          eq(counterSessions.counterId, counterId),
          eq(counterSessions.status, 'OPEN')
        )
      )
      .limit(1);

    if (existingSession) {
      return NextResponse.json({ error: "Counter already has an active session" }, { status: 400 });
    }

    // Validate or resolve user foreign key
    let validUserId = session.userId as string;
    const [existingUser] = validUserId
      ? await db.select({ id: users.id }).from(users).where(eq(users.id, validUserId)).limit(1)
      : [null];

    if (!existingUser) {
      // Fallback by email or tenant
      const [userByEmail] = session.email
        ? await db.select({ id: users.id }).from(users).where(eq(users.email, session.email as string)).limit(1)
        : [null];

      if (userByEmail) {
        validUserId = userByEmail.id;
      } else {
        const [tenantUser] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.tenantId, tenantId))
          .limit(1);

        if (tenantUser) {
          validUserId = tenantUser.id;
        } else {
          const [anyUser] = await db.select({ id: users.id }).from(users).limit(1);
          validUserId = anyUser ? anyUser.id : validUserId;
        }
      }
    }

    const now = new Date();
    const balanceNum = typeof openingBalance === 'number' ? openingBalance : parseFloat(openingBalance) || 0;

    const [newSession] = await db.insert(counterSessions).values({
      tenantId,
      counterId,
      userId: validUserId,
      openingBalance: balanceNum,
      status: 'OPEN',
      openedAt: now,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return NextResponse.json({ success: true, session: newSession });
  } catch (error: any) {
    console.error("POST /counters/sessions error:", error);
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

    const whereConditions = [
      eq(counterSessions.id, sessionId),
      eq(counterSessions.status, 'OPEN')
    ];
    if (session.tenantId) {
      whereConditions.push(eq(counterSessions.tenantId, session.tenantId as string));
    }

    const [existingSession] = await db
      .select()
      .from(counterSessions)
      .where(and(...whereConditions))
      .limit(1);

    if (!existingSession) {
      return NextResponse.json({ error: "Session not found or already closed" }, { status: 404 });
    }

    const opening = typeof existingSession.openingBalance === 'number'
      ? existingSession.openingBalance
      : parseFloat(existingSession.openingBalance as any) || 0;
    const transfer = typeof transferAmount === 'number' ? transferAmount : parseFloat(transferAmount) || 0;
    const sales = typeof cashSales === 'number' ? cashSales : parseFloat(cashSales) || 0;
    const closing = opening - transfer + sales;

    const now = new Date();
    const [updatedSession] = await db.update(counterSessions).set({
      status: 'CLOSED',
      closedAt: now,
      transferAmount: transfer,
      cashSales: sales,
      closingBalance: closing,
      updatedAt: now,
    })
    .where(eq(counterSessions.id, sessionId))
    .returning();

    return NextResponse.json({ success: true, session: updatedSession });
  } catch (error: any) {
    console.error("PATCH /counters/sessions error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
