import { db } from "@/lib/db";
import { invoices, invoiceLineItems, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import InvoiceView from "./InvoiceView";

export default async function InvoicePage({ params }: { params: { id: string } }) {
  const session = await verifySession();
  if (!session) {
    redirect("/login");
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId as string)).limit(1);
  
  if (!user || !user.tenantId) {
    redirect("/api/auth/logout");
  }

  const invoiceRecords = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, params.id))
    .limit(1);

  const invoice = invoiceRecords[0];

  if (!invoice || invoice.tenantId !== user.tenantId) {
    notFound();
  }

  const lineItems = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, invoice.id));

  return (
    <div className="max-w-4xl mx-auto py-6">
      <InvoiceView invoice={invoice} lineItems={lineItems} />
    </div>
  );
}
