import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await db.query.branches.findMany({
      where: eq(branches.tenantId, session.tenantId as string),
      orderBy: [desc(branches.createdAt)],
    });

    return NextResponse.json({ success: true, branches: data });
  } catch (error: any) {
    console.error("GET Branches Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    
    const [newBranch] = await db.insert(branches).values({
      ...body,
      tenantId: session.tenantId as string,
    }).returning();

    return NextResponse.json({ success: true, branch: newBranch });
  } catch (error: any) {
    console.error("POST Branch Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
