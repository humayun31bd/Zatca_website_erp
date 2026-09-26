import { verifySession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import CreateInvoiceForm from "./CreateInvoiceForm";

export default async function NewInvoicePage() {
  const session = await verifySession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Invoice</h1>
      </div>

      <CreateInvoiceForm />
    </div>
  );
}
