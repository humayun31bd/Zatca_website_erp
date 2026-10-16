import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accountMappings, accounts } from "@/lib/db/accounting_schema";
import { eq, and } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

// Predefined catalog of configurable Debited Expense Accounts matching source entities
const STANDARD_EXPENSE_MAPPINGS = [
  // 1. Cars & Fleet Operations
  {
    moduleKey: "EXPENSE_FLEET",
    mappingKey: "VEHICLE_FUEL",
    label: "Vehicle Fuel & Petrol",
    description: "Debited when fleet vehicles, vans, and company cars purchase fuel.",
    defaultAccountCode: "5.20.03.001.001",
    sourceEntity: "Cars / Fleet",
  },
  {
    moduleKey: "EXPENSE_FLEET",
    mappingKey: "VEHICLE_MAINTENANCE",
    label: "Vehicle Repairs & Maintenance",
    description: "Debited for oil changes, tire replacement, and mechanical servicing.",
    defaultAccountCode: "5.20.03.001.002",
    sourceEntity: "Cars / Fleet",
  },
  {
    moduleKey: "EXPENSE_FLEET",
    mappingKey: "VEHICLE_INSURANCE",
    label: "Fleet Insurance & Registration",
    description: "Debited for periodic vehicle insurance and traffic registration fees.",
    defaultAccountCode: "5.20.03.001.003",
    sourceEntity: "Cars / Fleet",
  },

  // 2. Branches & Real Estate Facilities
  {
    moduleKey: "EXPENSE_FACILITY",
    mappingKey: "BRANCH_RENT",
    label: "Branch & Outlet Rent",
    description: "Debited for monthly or quarterly lease payments for retail outlets and warehouses.",
    defaultAccountCode: "5.20.01.001.001",
    sourceEntity: "Branches",
  },
  {
    moduleKey: "EXPENSE_FACILITY",
    mappingKey: "BRANCH_UTILITIES",
    label: "Electricity & Water Utilities",
    description: "Debited for store electricity, municipal water, and commercial utility bills.",
    defaultAccountCode: "5.20.01.002.001",
    sourceEntity: "Branches",
  },
  {
    moduleKey: "EXPENSE_FACILITY",
    mappingKey: "BRANCH_MAINTENANCE",
    label: "Branch Facility Repairs & Cleaning",
    description: "Debited for air conditioning, store fixtures, and retail maintenance.",
    defaultAccountCode: "5.20.01.003.001",
    sourceEntity: "Branches",
  },

  // 3. Employees & Workforce
  {
    moduleKey: "EXPENSE_HR",
    mappingKey: "STAFF_SALARIES",
    label: "Staff Basic Salaries",
    description: "Debited for monthly payroll wages and basic employee compensation.",
    defaultAccountCode: "5.20.02.001.001",
    sourceEntity: "Employees",
  },
  {
    moduleKey: "EXPENSE_HR",
    mappingKey: "STAFF_TRAVEL",
    label: "Travel, Hotel & Per-Diem",
    description: "Debited for employee business trips, flight tickets, and daily allowances.",
    defaultAccountCode: "5.20.04.001.001",
    sourceEntity: "Employees",
  },
  {
    moduleKey: "EXPENSE_HR",
    mappingKey: "STAFF_TRAINING",
    label: "Staff Training & Certifications",
    description: "Debited for professional training courses and staff upskilling.",
    defaultAccountCode: "5.20.04.002.001",
    sourceEntity: "Employees",
  },

  // 4. Suppliers & Procurement
  {
    moduleKey: "EXPENSE_PURCHASE",
    mappingKey: "PURCHASE_FREIGHT",
    label: "Inbound Freight & Shipping",
    description: "Debited for vendor shipping, container transport, and delivery to warehouse.",
    defaultAccountCode: "5.10.02.001.001",
    sourceEntity: "Suppliers",
  },
  {
    moduleKey: "EXPENSE_PURCHASE",
    mappingKey: "CUSTOMS_DUTIES",
    label: "Customs & Port Clearance Fees",
    description: "Debited for import clearance, port handling, and border inspection charges.",
    defaultAccountCode: "5.10.02.002.001",
    sourceEntity: "Suppliers",
  },

  // 5. Dealers & Distribution Channels
  {
    moduleKey: "EXPENSE_DISTRIBUTION",
    mappingKey: "DEALER_COMMISSIONS",
    label: "Dealer Commissions & Agency Fees",
    description: "Debited for dealer sales commissions, brokerage, and franchise distribution fees.",
    defaultAccountCode: "5.20.06.001.001",
    sourceEntity: "Dealers",
  },
  {
    moduleKey: "EXPENSE_DISTRIBUTION",
    mappingKey: "DEALER_MARKETING",
    label: "Co-Op Dealer Marketing & Promotions",
    description: "Debited for shared dealer promotional spend and showroom displays.",
    defaultAccountCode: "5.20.06.002.001",
    sourceEntity: "Dealers",
  },

  // 6. Customers & Client Operations
  {
    moduleKey: "EXPENSE_SALES",
    mappingKey: "CUSTOMER_REBATES",
    label: "Customer Promotional Rebates",
    description: "Debited for contractual customer volume rebates and promotional allowances.",
    defaultAccountCode: "5.20.05.001.001",
    sourceEntity: "Customers",
  },
  {
    moduleKey: "EXPENSE_SALES",
    mappingKey: "OUTBOUND_DELIVERY",
    label: "Outbound Customer Delivery & Courier",
    description: "Debited for third-party courier dispatch fees to deliver orders to customers.",
    defaultAccountCode: "5.20.05.002.001",
    sourceEntity: "Customers",
  },
];

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId as string;
    const searchParams = req.nextUrl.searchParams;
    const moduleFilter = searchParams.get("moduleKey");

    // 1. Fetch Tenant's Existing Custom Mappings
    const savedMappings = await db.query.accountMappings.findMany({
      where: eq(accountMappings.tenantId, tenantId),
      with: {
        account: true,
      },
    });

    const mappingMap = new Map(
      savedMappings.map((m) => [`${m.moduleKey}:${m.mappingKey}`, m])
    );

    // 2. Fetch all Candidate Level 5 Transaction Accounts (for dropdown selections)
    const candidateAccounts = await db
      .select({
        id: accounts.id,
        code: accounts.code,
        name: accounts.name,
        type: accounts.type,
        accountSubtype: accounts.accountSubtype,
        level: accounts.level,
      })
      .from(accounts)
      .where(
        and(
          eq(accounts.tenantId, tenantId),
          eq(accounts.isTransaction, true),
          eq(accounts.isActive, true)
        )
      )
      .orderBy(accounts.code);

    // 3. Assemble Configurable Definitions with Current Mapped Accounts
    const relevantDefinitions = moduleFilter
      ? STANDARD_EXPENSE_MAPPINGS.filter((d) => d.moduleKey === moduleFilter)
      : STANDARD_EXPENSE_MAPPINGS;

    const mappedCatalog = relevantDefinitions.map((def) => {
      const saved = mappingMap.get(`${def.moduleKey}:${def.mappingKey}`);

      // Fallback account from COA if not customized
      const fallbackAccount = candidateAccounts.find(
        (a) => a.code === def.defaultAccountCode
      );

      const activeAccount = saved?.account || fallbackAccount || null;

      return {
        moduleKey: def.moduleKey,
        mappingKey: def.mappingKey,
        label: def.label,
        description: def.description,
        sourceEntity: def.sourceEntity,
        defaultAccountCode: def.defaultAccountCode,
        isCustomized: Boolean(saved),
        activeAccount: activeAccount
          ? {
              id: activeAccount.id,
              code: activeAccount.code,
              name: activeAccount.name,
              type: activeAccount.type,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      definitions: mappedCatalog,
      customMappings: savedMappings,
      candidateAccounts,
    });
  } catch (error: any) {
    console.error("GET Account Mappings Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId as string;
    const body = await req.json();

    const items: Array<{ moduleKey: string; mappingKey: string; accountId: string }> =
      body.mappings || [];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Payload must include a non-empty 'mappings' array." },
        { status: 400 }
      );
    }

    let updatedCount = 0;

    for (const item of items) {
      if (!item.moduleKey || !item.mappingKey || !item.accountId) continue;

      // Verify that the target account belongs to this tenant and is active
      const [targetAccount] = await db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.id, item.accountId),
            eq(accounts.tenantId, tenantId),
            eq(accounts.isActive, true)
          )
        )
        .limit(1);

      if (!targetAccount) {
        throw new Error(`Target account ${item.accountId} does not exist or is inactive.`);
      }

      const existing = await db
        .select()
        .from(accountMappings)
        .where(
          and(
            eq(accountMappings.tenantId, tenantId),
            eq(accountMappings.moduleKey, item.moduleKey),
            eq(accountMappings.mappingKey, item.mappingKey)
          )
        )
        .get();

      if (existing) {
        await db
          .update(accountMappings)
          .set({ accountId: item.accountId, updatedAt: new Date() })
          .where(eq(accountMappings.id, existing.id));
      } else {
        await db.insert(accountMappings).values({
          tenantId,
          moduleKey: item.moduleKey,
          mappingKey: item.mappingKey,
          accountId: item.accountId,
        });
      }

      updatedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updatedCount} Debited Expense Account mapping(s).`,
      updatedCount,
    });
  } catch (error: any) {
    console.error("POST Account Mappings Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
