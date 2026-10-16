import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import bcrypt from "bcrypt";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tenantIdParam = searchParams.get("tenantId");

    let whereCondition;
    if (session.role === "SUPERADMIN") {
      if (tenantIdParam) {
        whereCondition = eq(users.tenantId, tenantIdParam);
      }
    } else if (session.tenantId) {
      whereCondition = eq(users.tenantId, session.tenantId as string);
    }

    const data = await db.query.users.findMany({
      where: whereCondition,
      orderBy: [desc(users.createdAt)],
    });

    return NextResponse.json({ success: true, users: data });
  } catch (error) {
    console.error("GET Users Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { email, password, role, tenantId } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, message: "Email and password are required" }, { status: 400 });
    }

    const targetTenantId = (session.role === "SUPERADMIN" && tenantId) 
      ? tenantId 
      : (session.tenantId || "tenant-grocery-01");
      
    const passwordHash = await bcrypt.hash(password, 10);

    const [newUser] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        email,
        passwordHash,
        role: role || "TENANT_USER",
        tenantId: targetTenantId,
      })
      .returning();

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error("POST User Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to create user" },
      { status: 500 }
    );
  }
}

