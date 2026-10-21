import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taxCategories } from "@/lib/db/product_schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId as string;
    let data = await db.query.taxCategories.findMany({
      where: eq(taxCategories.tenantId, tenantId),
    });

    if (!data.length) {
      const defaults = [
        { categoryName: 'Standard Rate', taxRate: 15 },
        { categoryName: 'Zero Rate', taxRate: 0 },
        { categoryName: 'Exempt', taxRate: 0 },
      ];
      for (const row of defaults) {
        try {
          await db.insert(taxCategories).values({ tenantId, ...row });
        } catch {
          continue;
        }
      }
      data = await db.query.taxCategories.findMany({
        where: eq(taxCategories.tenantId, tenantId),
      });
    }

    return NextResponse.json({ success: true, taxes: data });
  } catch (error: any) {
    console.error("GET Taxes Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    
    const [newTax] = await db.insert(taxCategories).values({
      ...body,
      tenantId: session.tenantId as string,
    }).returning();

    return NextResponse.json({ success: true, tax: newTax });
  } catch (error: any) {
    console.error("POST Tax Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
