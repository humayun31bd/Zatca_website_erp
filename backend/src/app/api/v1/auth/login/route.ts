import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, loginAttempts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { createSession } from '@/lib/auth/session';
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = LoginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parseResult.error.format() }, { status: 400 });
    }

    const { email, password } = parseResult.data;

    // Check brute-force attempts
    const attemptRecord = await db.select().from(loginAttempts).where(eq(loginAttempts.email, email)).limit(1);

    if (attemptRecord.length > 0) {
      const record = attemptRecord[0];
      if (record.attempts >= 3 && record.lockedUntil && new Date() < record.lockedUntil) {
        return NextResponse.json({ error: 'Account locked due to too many failed attempts. Try again in 15 minutes.' }, { status: 429 });
      }
    }

    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (result.length === 0) {
      await recordFailedAttempt(email, attemptRecord[0]);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = result[0];
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      await recordFailedAttempt(email, attemptRecord[0]);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Success - reset attempts
    if (attemptRecord.length > 0) {
      await db.delete(loginAttempts).where(eq(loginAttempts.email, email));
    }

    // Create JWT Session
    const session = await createSession(user.id, user.role, user.email, user.tenantId ?? undefined);

    return NextResponse.json({ success: true, redirect: '/', accessToken: session });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function recordFailedAttempt(email: string, existingRecord: any) {
  if (existingRecord) {
    const newAttempts = existingRecord.attempts + 1;
    const lockedUntil = newAttempts >= 3 ? new Date(Date.now() + 60 * 60 * 1000) : null;
    await db.update(loginAttempts).set({ attempts: newAttempts, lockedUntil, updatedAt: new Date() }).where(eq(loginAttempts.email, email));
  } else {
    await db.insert(loginAttempts).values({ email, attempts: 1 });
  }
}

