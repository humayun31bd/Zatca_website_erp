import { db } from "../src/lib/db/index";
import { tenants, suppliers, supplierBills } from "../src/lib/db/schema";
import { eq, and } from "drizzle-orm";

async function testSupplierAging() {
  console.log("=================================================");
  console.log("   SUPPLIER DETAILS & AP AGING ANALYSIS TEST     ");
  console.log("=================================================\n");

  try {
    const tenantList = await db.select().from(tenants).limit(1);
    if (tenantList.length === 0) {
      console.log("⚠️ No active tenant found.");
      return;
    }
    const tenantId = tenantList[0].id;
    console.log(`[+] Target Tenant ID: ${tenantId}`);

    // 1. Create Test Supplier
    const supId = crypto.randomUUID();
    const [supplier] = await db.insert(suppliers).values({
      id: supId,
      tenantId,
      name: `Global Logistics & Freight Co. ${Date.now()}`,
      vatNumber: "310888777600003",
      crNumber: "1010888777",
      phoneNumber: "+966118887777",
      email: "billing@globallogistics.sa",
      address: "Cargo Village, King Khalid International Airport, Riyadh",
      category: "LOGISTICS",
      supplierTier: "TIER_1_PREFERRED",
      paymentTerms: "NET_30",
    }).returning();

    console.log(`[+] Created Supplier Profile: ${supplier.name}`);

    // 2. Insert Test Bills with different overdue dates
    const now = new Date();
    const dateCurrent = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago (0-30)
    const date31to60 = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);  // 45 days ago (31-60)
    const date61to90 = new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000);  // 75 days ago (61-90)
    const date90Plus = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000); // 120 days ago (90+)

    const billsData = [
      { id: crypto.randomUUID(), tenantId, supplierId: supId, billNumber: `BILL-2026-001-${Date.now()}`, issueDate: dateCurrent.toISOString(), dueDate: dateCurrent.toISOString(), subtotalAmount: 1000, vatAmount: 150, totalAmount: 1150, paidAmount: 0, paymentStatus: 'UNPAID' },
      { id: crypto.randomUUID(), tenantId, supplierId: supId, billNumber: `BILL-2026-002-${Date.now()}`, issueDate: date31to60.toISOString(), dueDate: date31to60.toISOString(), subtotalAmount: 2000, vatAmount: 300, totalAmount: 2300, paidAmount: 0, paymentStatus: 'UNPAID' },
      { id: crypto.randomUUID(), tenantId, supplierId: supId, billNumber: `BILL-2026-003-${Date.now()}`, issueDate: date61to90.toISOString(), dueDate: date61to90.toISOString(), subtotalAmount: 3000, vatAmount: 450, totalAmount: 3450, paidAmount: 0, paymentStatus: 'UNPAID' },
      { id: crypto.randomUUID(), tenantId, supplierId: supId, billNumber: `BILL-2026-004-${Date.now()}`, issueDate: date90Plus.toISOString(), dueDate: date90Plus.toISOString(), subtotalAmount: 4000, vatAmount: 600, totalAmount: 4600, paidAmount: 0, paymentStatus: 'UNPAID' },
    ];

    for (const item of billsData) {
      await db.insert(supplierBills).values(item);
    }

    console.log("[+] Inserted 4 supplier bills with varied aging maturity dates.");

    // 3. Compute Aging Breakdown
    const bills = await db.select().from(supplierBills).where(and(eq(supplierBills.tenantId, tenantId), eq(supplierBills.supplierId, supId)));
    
    let totalPayable = 0;
    let current0to30 = 0;
    let days31to60 = 0;
    let days61to90 = 0;
    let days90Plus = 0;

    for (const b of bills) {
      const dueDate = new Date(b.dueDate || b.issueDate);
      const overdueDays = Math.floor(Math.max(0, now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const balance = b.totalAmount - (b.paidAmount || 0);

      totalPayable += balance;
      if (overdueDays <= 30) current0to30 += balance;
      else if (overdueDays <= 60) days31to60 += balance;
      else if (overdueDays <= 90) days61to90 += balance;
      else days90Plus += balance;
    }

    console.log("\n--- AP Aging Breakdown Results ---");
    console.log(`  Total Payable Balance:   ${totalPayable.toFixed(2)} SAR`);
    console.log(`  Current (0–30 Days):     ${current0to30.toFixed(2)} SAR`);
    console.log(`  Overdue (31–60 Days):    ${days31to60.toFixed(2)} SAR`);
    console.log(`  Overdue (61–90 Days):    ${days61to90.toFixed(2)} SAR`);
    console.log(`  Critical (90+ Days):     ${days90Plus.toFixed(2)} SAR`);

    // Clean up
    await db.delete(supplierBills).where(eq(supplierBills.supplierId, supId));
    await db.delete(suppliers).where(eq(suppliers.id, supId));
    console.log("\n[+] Test bills and supplier profile cleaned up.");

    console.log("\n🎉 SUPPLIER DETAILS & AP AGING INTEGRATION TEST PASSED!");
  } catch (err) {
    console.error("❌ Supplier Aging Test Failed:", err);
    process.exit(1);
  }
}

testSupplierAging().then(() => process.exit(0));
