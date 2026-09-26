import { db } from "@/lib/db";
import { tenants, packages, subscriptions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import ClientsTable from "./ClientsTable";
import ClientsHeader from "./ClientsHeader";
export default async function ClientsPage() {
  const session = await verifySession();
  
  if (!session) {
    redirect("/login");
  }

  // Fetch current tenant to verify they are an agency
  const tenantRecords = await db
    .select({
      id: tenants.id,
      packageType: packages.type,
    })
    .from(tenants)
    .leftJoin(subscriptions, eq(tenants.id, subscriptions.tenantId))
    .leftJoin(packages, eq(subscriptions.packageId, packages.id))
    .where(eq(tenants.id, session.tenantId as string))
    .limit(1);

  const isAgency = tenantRecords.length > 0 && tenantRecords[0].packageType === 'AGENCY';

  if (!isAgency) {
    redirect("/"); // Not authorized to view clients
  }

  // Fetch sub-tenants
  const subTenants = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      vatNumber: tenants.vatNumber,
      email: tenants.email,
      status: tenants.status,
      createdAt: tenants.createdAt,
    })
    .from(tenants)
    .where(eq(tenants.parentTenantId, session.tenantId as string))
    .orderBy(desc(tenants.createdAt));

  // Fetch available END_USER packages for the Add Client modal
  const availablePackages = await db
    .select()
    .from(packages)
    .where(eq(packages.type, 'END_USER'));

  return (
    <div className="space-y-6">
      <ClientsHeader availablePackages={availablePackages} />
      <ClientsTable clients={subTenants} />
    </div>
  );
}
