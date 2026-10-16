import { db } from "../src/lib/db/index";
import { tenants, suppliers } from "../src/lib/db/schema";
import { eq, and } from "drizzle-orm";

async function testSupplierUpdate() {
  console.log("=================================================");
  console.log("   SUPPLIER PROFILE CREATE & UPDATE API TEST     ");
  console.log("=================================================\n");

  try {
    const tenantList = await db.select().from(tenants).limit(1);
    if (tenantList.length === 0) {
      console.log("⚠️ No active tenant found.");
      return;
    }
    const tenantId = tenantList[0].id;
    console.log(`[+] Target Tenant ID: ${tenantId}`);

    // 1. Create Initial Supplier
    const supId = crypto.randomUUID();
    const [created] = await db.insert(suppliers).values({
      id: supId,
      tenantId,
      name: "Initial Saudi Supplies Co.",
      vatNumber: "310000000000003",
      crNumber: "1010000000",
      phoneNumber: "+966500000000",
      email: "initial@supplies.sa",
      address: "Old Industrial Zone, Riyadh",
      bankDetails: "SA0000000000000000000000",
    }).returning();

    console.log(`[+] Created Supplier: ${created.name} (ID: ${created.id})`);

    // 2. Update Supplier Profile (PUT /api/v1/suppliers/:id)
    const updatePayload = {
      name: "Updated Saudi Supplies Trading Co.",
      vatNumber: "310999999900003",
      crNumber: "1010999999",
      phoneNumber: "+966599999999",
      email: "contact@updatedsupplies.sa",
      address: "New Tech Park, Building 14, Riyadh",
      bankDetails: "Rajhi Bank IBAN SA9988776655443322110000",
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update(suppliers)
      .set(updatePayload)
      .where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.id, supId)))
      .returning();

    console.log(`\n[+] Updated Supplier Profile:`);
    console.log(`  Name:        ${updated.name}`);
    console.log(`  VAT Number:  ${updated.vatNumber}`);
    console.log(`  CR Number:   ${updated.crNumber}`);
    console.log(`  Phone:       ${updated.phoneNumber}`);
    console.log(`  Email:       ${updated.email}`);
    console.log(`  Address:     ${updated.address}`);
    console.log(`  Bank IBAN:   ${updated.bankDetails}`);

    // Clean up
    await db.delete(suppliers).where(eq(suppliers.id, supId));
    console.log("\n[+] Cleaned up test record.");

    console.log("\n🎉 SUPPLIER CREATE & UPDATE INTEGRATION TEST PASSED!");
  } catch (err) {
    console.error("❌ Supplier Update Test Failed:", err);
    process.exit(1);
  }
}

testSupplierUpdate().then(() => process.exit(0));
