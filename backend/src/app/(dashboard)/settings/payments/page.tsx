import { verifySession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { CreditCard, Save } from "lucide-react";
import { revalidatePath } from "next/cache";

export default async function PaymentSettingsPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, session.tenantId))
    .limit(1);

  async function updateSettings(formData: FormData) {
    "use server";
    const session = await verifySession();
    if (!session) return;

    const gateway = formData.get("gateway") as string;
    const stripeKey = formData.get("stripeKey") as string;
    const tapKey = formData.get("tapKey") as string;

    await db
      .update(tenants)
      .set({
        paymentGateway: gateway,
        stripeSecretKey: stripeKey || null,
        tapSecretKey: tapKey || null,
      })
      .where(eq(tenants.id, session.tenantId));

    revalidatePath("/settings/payments");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2 border-b dark:border-gray-700 pb-4">
        <CreditCard className="w-6 h-6 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Gateway Settings</h1>
          <p className="text-sm text-gray-500">Configure how you receive payments from your invoices.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm p-6">
        <form action={updateSettings} className="space-y-6">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Active Gateway</label>
            <div className="grid grid-cols-2 gap-4">
              <label className="border dark:border-gray-600 rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-3">
                <input 
                  type="radio" 
                  name="gateway" 
                  value="TAP" 
                  defaultChecked={tenant.paymentGateway === "TAP"}
                  className="w-4 h-4 text-primary-600"
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Tap Payments</p>
                  <p className="text-xs text-gray-500">Mada, Apple Pay, K-Net</p>
                </div>
              </label>

              <label className="border dark:border-gray-600 rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-3">
                <input 
                  type="radio" 
                  name="gateway" 
                  value="STRIPE" 
                  defaultChecked={tenant.paymentGateway === "STRIPE"}
                  className="w-4 h-4 text-primary-600"
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Stripe</p>
                  <p className="text-xs text-gray-500">Visa, Mastercard (Global)</p>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tap Payments Secret Key
              </label>
              <input 
                type="text" 
                name="tapKey"
                defaultValue={tenant.tapSecretKey || ""}
                placeholder="sk_test_..."
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stripe Secret Key
              </label>
              <input 
                type="text" 
                name="stripeKey"
                defaultValue={tenant.stripeSecretKey || ""}
                placeholder="sk_test_..."
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit"
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
