import { db } from "@/lib/db";
import { invoices, users } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import InvoicesTable from "./InvoicesTable";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await verifySession();
  
  if (!session) {
    redirect("/login");
  }

  const userRecords = await db.select().from(users).where(eq(users.id, session.userId as string)).limit(1);
  const user = userRecords[0];

  if (!user || !user.tenantId) {
    redirect("/api/auth/logout");
  }

  const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) : 1;
  const limit = 10; // Standard limit for invoices per page
  const offset = (page - 1) * limit;

  // Sorting descending by createdAt is explicitly applied here
  const dbInvoices = await db
    .select()
    .from(invoices)
    .where(eq(invoices.tenantId, user.tenantId))
    .orderBy(desc(invoices.createdAt))
    .limit(limit)
    .offset(offset);

  const totalCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(invoices)
    .where(eq(invoices.tenantId, user.tenantId));
  
  const totalInvoices = Number(totalCountResult[0].count);
  const totalPages = Math.ceil(totalInvoices / limit);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
        <Link href="/invoices/new" className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 transition-colors">
          Create Invoice
        </Link>
      </div>

      <InvoicesTable 
        initialInvoices={dbInvoices} 
        currentPage={page} 
        totalPages={totalPages} 
      />
    </div>
  );
}
