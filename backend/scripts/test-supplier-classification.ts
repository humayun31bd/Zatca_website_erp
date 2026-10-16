import { db } from "../src/lib/db/index";
import { tenants, suppliers } from "../src/lib/db/schema";
import { eq, and } from "drizzle-orm";

async function testSupplierClassification() {
  console.log("=================================================");
  console.log("   SUPPLIER CLASSIFICATION & TIERING TEST        ");
  console.log("=================================================\n");

  try {
    const tenantList = await db.select().from(tenants).limit(1);
    if (tenantList.length === 0) {
      console.log("⚠️ No active tenant found.");
      return;
    }
    const tenantId = tenantList[0].id;
    console.log(`[+] Target Tenant ID: ${tenantId}`);

    // 1. Create Supplier with Classification Matrix
    const supId = crypto.randomUUID();
    const [created] = await db.insert(suppliers).values({
      id: supId,
      tenantId,
      name: "Sabic Industrial Petrochemicals",
      vatNumber: "310555444300003",
      crNumber: "1010555444",
      phoneNumber: "+966115554444",
      email: "b2b@sabic.com",
      address: "Sabic HQ, Jubail Industrial City",
      bankDetails: "SABB SA118888000012345",
      category: "RAW_MATERIAL",
      supplierTier: "TIER_1_PREFERRED",
      paymentTerms: "NET_60",
    }).returning();

    console.log(`[+] Classified Supplier Created:`);
    console.log(`  Name:           ${created.name}`);
    console.log(`  Category:       ${created.category} (Raw Materials & Mfg)`);
    console.log(`  Vendor Tier:    ${created.supplierTier} (Tier 1 Strategic ⭐)`);
    console.log(`  Payment Terms:  ${created.paymentTerms} (Net 60 Days Credit)`);

    // 2. Update Classification to Services & Net 30
    const [updated] = await db
      .update(suppliers)
      .set({
        category: "LOGISTICS",
        supplierTier: "TIER_2_STANDARD",
        paymentTerms: "NET_30",
        updatedAt: new Date(),
      })
      .where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.id, supId)))
      .returning();

    console.log(`\n[+] Classification Profile Updated:`);
    console.log(`  New Category:     ${updated.category}`);
    console.log(`  New Vendor Tier:  ${updated.supplierTier}`);
    console.log(`  New Credit Terms: ${updated.paymentTerms}`);

    // Clean up
    await db.delete(suppliers).where(eq(suppliers.id, supId));
    console.log("\n[+] Test record cleaned up.");

    console.log("\n🎉 SUPPLIER CLASSIFICATION INTEGRATION TEST PASSED!");
  } catch (err) {
    console.error("❌ Supplier Classification Test Failed:", err);
    process.exit(1);
  }
}

testSupplierClassification().then(() => process.exit(0));
