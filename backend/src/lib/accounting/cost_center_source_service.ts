import { db } from "@/lib/db";
import { costCenters, journalEntryLines, journalEntries, accounts } from "@/lib/db/accounting_schema";
import { branches, suppliers, clients } from "@/lib/db/schema";
import { employees } from "@/lib/db/hr_schema";
import { deliveryDrivers } from "@/lib/db/delivery_orders_schema";
import { eq, and, sql } from "drizzle-orm";

export type CostCenterSourceType =
  | 'BRANCH'
  | 'EMPLOYEE'
  | 'SUPPLIER'
  | 'CUSTOMER'
  | 'DEALER'
  | 'CAR_VEHICLE'
  | 'GENERAL';

export interface EnsureCostCenterParams {
  tenantId: string;
  sourceType: CostCenterSourceType;
  sourceId: string;
  name: string;
  codePrefix?: string;
  category?: string;
  monthlyBudget?: number;
}

/**
 * Ensures a specific operational entity has a matching Cost Center in the Chart of Accounts.
 */
export async function getOrCreateCostCenterForSource({
  tenantId,
  sourceType,
  sourceId,
  name,
  codePrefix,
  category,
  monthlyBudget = 0,
}: EnsureCostCenterParams) {
  // 1. Check if matching Cost Center already exists
  const [existing] = await db
    .select()
    .from(costCenters)
    .where(
      and(
        eq(costCenters.tenantId, tenantId),
        eq(costCenters.sourceType, sourceType),
        eq(costCenters.sourceId, sourceId)
      )
    )
    .limit(1);

  if (existing) {
    if (existing.name !== name) {
      await db
        .update(costCenters)
        .set({ name, updatedAt: new Date() })
        .where(eq(costCenters.id, existing.id));
    }
    return existing;
  }

  // 2. Auto-generate systematic code prefix
  let defaultPrefix = "CC-GEN";
  switch (sourceType) {
    case "BRANCH":
      defaultPrefix = "CC-BR";
      break;
    case "EMPLOYEE":
      defaultPrefix = "CC-EMP";
      break;
    case "CAR_VEHICLE":
      defaultPrefix = "CC-VEH";
      break;
    case "SUPPLIER":
      defaultPrefix = "CC-SUP";
      break;
    case "CUSTOMER":
      defaultPrefix = "CC-CUST";
      break;
    case "DEALER":
      defaultPrefix = "CC-DLR";
      break;
  }

  const prefix = codePrefix || defaultPrefix;

  const countRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(costCenters)
    .where(and(eq(costCenters.tenantId, tenantId), eq(costCenters.sourceType, sourceType)));

  const count = Number(countRes[0]?.count || 0);
  const code = `${prefix}-${String(count + 1).padStart(3, "0")}`;

  // 3. Create the linked Cost Center
  const [created] = await db
    .insert(costCenters)
    .values({
      tenantId,
      code,
      name,
      sourceType,
      sourceId,
      category: category || sourceType,
      monthlyBudget,
      isActive: true,
    })
    .returning();

  return created;
}

/**
 * Bulk-synchronizes all operational source tables into Cost Centers for a tenant:
 * 1. Branches -> 'BRANCH'
 * 2. Employees -> 'EMPLOYEE'
 * 3. Delivery Drivers / Vehicles -> 'CAR_VEHICLE'
 * 4. Suppliers -> 'SUPPLIER'
 * 5. Clients / Customers -> 'CUSTOMER'
 */
export async function syncAllSourceEntitiesToCostCenters(tenantId: string) {
  const syncResults = {
    branchesSynced: 0,
    employeesSynced: 0,
    vehiclesSynced: 0,
    suppliersSynced: 0,
    customersSynced: 0,
    totalCreatedOrUpdated: 0,
  };

  // 1. Sync Branches
  const allBranches = await db.select().from(branches).where(eq(branches.tenantId, tenantId));
  for (const b of allBranches) {
    await getOrCreateCostCenterForSource({
      tenantId,
      sourceType: "BRANCH",
      sourceId: b.id,
      name: `Branch: ${b.name}`,
      category: "RETAIL_OUTLET",
    });
    syncResults.branchesSynced++;
  }

  // 2. Sync Employees
  const allEmployees = await db.select().from(employees).where(eq(employees.tenantId, tenantId));
  for (const emp of allEmployees) {
    const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Employee";
    await getOrCreateCostCenterForSource({
      tenantId,
      sourceType: "EMPLOYEE",
      sourceId: emp.id,
      name: `Employee: ${fullName}`,
      category: emp.departmentName || "STAFF",
    });
    syncResults.employeesSynced++;
  }

  // 3. Sync Delivery Drivers / Cars / Vehicles
  const allDrivers = await db.select().from(deliveryDrivers).where(eq(deliveryDrivers.tenantId, tenantId));
  for (const d of allDrivers) {
    const plate = d.vehiclePlate ? ` [${d.vehiclePlate}]` : "";
    const vehicleLabel = d.vehicleType ? d.vehicleType.toUpperCase() : "VEHICLE";
    await getOrCreateCostCenterForSource({
      tenantId,
      sourceType: "CAR_VEHICLE",
      sourceId: d.id,
      name: `Vehicle: ${vehicleLabel} (${d.name})${plate}`,
      category: "FLEET_LOGISTICS",
    });
    syncResults.vehiclesSynced++;
  }

  // 4. Sync Suppliers
  const allSuppliers = await db.select().from(suppliers).where(eq(suppliers.tenantId, tenantId));
  for (const sup of allSuppliers) {
    await getOrCreateCostCenterForSource({
      tenantId,
      sourceType: "SUPPLIER",
      sourceId: sup.id,
      name: `Supplier: ${sup.name}`,
      category: "PROCUREMENT",
    });
    syncResults.suppliersSynced++;
  }

  // 5. Sync Customers / Clients
  const allClients = await db.select().from(clients).where(eq(clients.tenantId, tenantId));
  for (const cl of allClients) {
    await getOrCreateCostCenterForSource({
      tenantId,
      sourceType: "CUSTOMER",
      sourceId: cl.id,
      name: `Customer: ${cl.name}`,
      category: "SALES_CLIENT",
    });
    syncResults.customersSynced++;
  }

  syncResults.totalCreatedOrUpdated =
    syncResults.branchesSynced +
    syncResults.employeesSynced +
    syncResults.vehiclesSynced +
    syncResults.suppliersSynced +
    syncResults.customersSynced;

  return syncResults;
}

/**
 * Generates an analytical Cost Center Profitability & Expense Statement.
 */
export async function getCostCenterPerformanceReport({
  tenantId,
  sourceType,
  startDate,
  endDate,
}: {
  tenantId: string;
  sourceType?: CostCenterSourceType;
  startDate?: Date;
  endDate?: Date;
}) {
  const round = (num: number) => Math.round(num * 100) / 100;
  const conditions = [eq(costCenters.tenantId, tenantId)];
  if (sourceType && sourceType !== 'GENERAL') {
    conditions.push(eq(costCenters.sourceType, sourceType));
  }

  const centers = await db.select().from(costCenters).where(and(...conditions)).orderBy(costCenters.code);

  const results = [];

  for (const cc of centers) {
    const queryConditions: any[] = [
      eq(journalEntryLines.costCenterId, cc.id),
      eq(journalEntries.status, "POSTED"),
    ];

    if (startDate) {
      queryConditions.push(sql`${journalEntries.entryDate} >= ${startDate}`);
    }
    if (endDate) {
      queryConditions.push(sql`${journalEntries.entryDate} <= ${endDate}`);
    }

    const movements = await db
      .select({
        accountType: accounts.type,
        debit: sql<number>`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
        credit: sql<number>`COALESCE(SUM(${journalEntryLines.credit}), 0)`,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .innerJoin(accounts, eq(journalEntryLines.accountId, accounts.id))
      .where(and(...queryConditions))
      .groupBy(accounts.type);

    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const m of movements) {
      if (m.accountType === "REVENUE") {
        totalRevenue += (m.credit - m.debit);
      } else if (m.accountType === "EXPENSE") {
        totalExpenses += (m.debit - m.credit);
      }
    }

    totalRevenue = round(totalRevenue);
    totalExpenses = round(totalExpenses);
    const netContribution = round(totalRevenue - totalExpenses);
    const budgetVariance = cc.monthlyBudget > 0 ? round(cc.monthlyBudget - totalExpenses) : null;

    results.push({
      costCenterId: cc.id,
      code: cc.code,
      name: cc.name,
      sourceType: cc.sourceType,
      sourceId: cc.sourceId,
      category: cc.category,
      totalRevenue,
      totalExpenses,
      netContribution,
      monthlyBudget: cc.monthlyBudget,
      budgetVariance,
    });
  }

  return results;
}
