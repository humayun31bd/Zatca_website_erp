import Sidebar from "@/components/layout/Sidebar";
import { verifySession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { subscriptions, packages, tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  
  if (!session) {
    redirect("/login");
  }

  // Find the tenant and their package type to determine if they are an agency
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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar isAgency={isAgency} />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
