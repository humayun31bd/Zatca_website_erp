import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { z } from "zod";

const ClientSchema = z.object({
  name: z.string().min(1),
  vatNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  customerType: z.string().optional().nullable(),
  funds: z.number().optional().nullable(),
  dues: z.number().optional().nullable(),
  permitCredit: z.boolean().optional().default(false),
  creditLimit: z.number().optional().default(0),
});

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantClients = await db
      .select()
      .from(clients)
      .where(eq(clients.tenantId, session.tenantId as string))
      .orderBy(desc(clients.createdAt));

    return NextResponse.json(tenantClients);

  } catch (error: any) {
    console.error("GET Clients error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parseResult = ClientSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid payload", details: parseResult.error.format() }, { status: 400 });
    }

    const newClient = await db.insert(clients).values({
      tenantId: session.tenantId as string,
      ...parseResult.data,
    }).returning();

    return NextResponse.json(newClient[0], { status: 201 });

  } catch (error: any) {
    console.error("POST Client error:", error);
    if (error.code === '23505') { // Unique constraint violation
      return NextResponse.json({ error: "Client with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
