import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { z } from "zod";

const ClientUpdateSchema = z.object({
  name: z.string().min(1).optional(),
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
  permitCredit: z.boolean().optional(),
  creditLimit: z.number().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parseResult = ClientUpdateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid payload", details: parseResult.error.format() }, { status: 400 });
    }

    const updatedClient = await db.update(clients)
      .set({ ...parseResult.data, updatedAt: new Date() })
      .where(and(eq(clients.id, params.id), eq(clients.tenantId, session.tenantId as string)))
      .returning();

    if (updatedClient.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(updatedClient[0]);

  } catch (error: any) {
    console.error("PUT Client error:", error);
    if (error.code === '23505') { // Unique constraint violation
      return NextResponse.json({ error: "Client with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const deletedClient = await db.delete(clients)
      .where(and(eq(clients.id, params.id), eq(clients.tenantId, session.tenantId as string)))
      .returning();

    if (deletedClient.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Client deleted successfully" });

  } catch (error: any) {
    console.error("DELETE Client error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
