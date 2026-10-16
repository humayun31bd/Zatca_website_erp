import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { z } from "zod";
import bcrypt from "bcrypt";

const TenantPayloadSchema = z.object({
  name: z.string().min(1),
  vatNumber: z.string().min(15).max(15),
  email: z.string().email(),
  subdomain: z.string().optional(),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
});

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const agencyTenants = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        vatNumber: tenants.vatNumber,
        email: tenants.email,
        subdomain: tenants.subdomain,
        status: tenants.status,
        createdAt: tenants.createdAt,
      })
      .from(tenants)
      .where(eq(tenants.parentTenantId, session.tenantId as string))
      .orderBy(desc(tenants.createdAt));

    // Mock appending branches and marketing plans since they are not in the core tenants table yet
    const enrichedTenants = agencyTenants.map((t, index) => {
      let branches = ['Main Branch'];
      let plan = 'Starter';
      
      if (index % 3 === 0) {
        branches = ['Main Branch', 'North Branch', 'East Branch'];
        plan = 'Pro';
      } else if (index % 2 === 0) {
        branches = ['Main Branch', 'South Branch'];
        plan = 'Standard';
      }

      return {
        ...t,
        branches,
        marketingPlan: plan,
      };
    });

    return NextResponse.json(enrichedTenants);
  } catch (error: any) {
    console.error("GET Agency Tenants error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    // In a real app, verify the user has permission to create tenants (e.g. role === 'SUPERADMIN' or agency subscription)
    
    const body = await req.json();
    const parseResult = TenantPayloadSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid payload", details: parseResult.error.format() }, { status: 400 });
    }

    const { name, vatNumber, email, subdomain, adminEmail, adminPassword } = parseResult.data;

    const result = await db.transaction(async (tx) => {
      // 1. Create the tenant
      const [newTenant] = await tx.insert(tenants).values({
        parentTenantId: session.tenantId as string,
        name,
        vatNumber,
        email,
        subdomain: subdomain || null,
        status: 'ACTIVE',
      }).returning();

      // 2. Hash the password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(adminPassword, salt);

      // 3. Create the tenant admin user
      await tx.insert(users).values({
        tenantId: newTenant.id,
        email: adminEmail,
        passwordHash,
        role: 'TENANT_ADMIN',
      });

      return newTenant;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("POST Agency Tenant error:", error);
    if (error.code === '23505') { 
      return NextResponse.json({ error: "Tenant or User with this email/subdomain already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
