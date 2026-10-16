import { db } from "../src/lib/db/index";
import { tenants, suppliers } from "../src/lib/db/schema";
import { eq, desc, like, or } from "drizzle-orm";

async function testSuppliersDirectory() {
  console.log("=================================================");
  console.log("   SUPPLIER DIRECTORY & BULK CSV IMPORT TEST     ");
  console.log("=================================================\n");

  try {
    const tenantList = await db.select().from(tenants).limit(1);
    if (tenantList.length === 0) {
      console.log("⚠️ No active tenant found.");
      return;
    }
    const tenantId = tenantList[0].id;
    console.log(`[+] Target Tenant ID: ${tenantId}`);

    // 1. Bulk Insert test records (simulating CSV import)
    const csvRecords = [
      {
        name: "Al-Marai Foods Industry Co.",
        vatNumber: "310123456700003",
        crNumber: "1010123456",
        phoneNumber: "+966112345678",
        email: "info@almarai.com",
        address: "Riyadh Industrial City Phase 2",
        bankDetails: "NCB SA8810000012345",
      },
      {
        name: "P&G Consumer Products Trading",
        vatNumber: "310987654300003",
        crNumber: "1010987654",
        phoneNumber: "+966126543210",
        email: "sales@pgsaudi.com",
        address: "Jeddah Islamic Port Area",
        bankDetails: "Al-Rajhi SA4420000099887",
      },
      {
        name: "Nadec Dairy & Agricultural Co.",
        vatNumber: "310445566700003",
        crNumber: "1010445566",
        phoneNumber: "+966114455667",
        email: "orders@nadec.com",
        address: "Haradh Highway, Eastern Province",
        bankDetails: "Riyad Bank SA1234567890",
      },
    ];

    console.log(`[+] Importing ${csvRecords.length} records from CSV payload...`);
    const inserted = [];
    for (const item of csvRecords) {
      const [newSup] = await db.insert(suppliers).values({
        tenantId,
        ...item,
      }).returning();
      inserted.push(newSup);
      console.log(`  [x] Imported Supplier: ${newSup.name} (VAT: ${newSup.vatNumber})`);
    }

    // 2. Query & Search filter test
    const searchPattern = "%Al-Marai%";
    const searchResults = await db
      .select()
      .from(suppliers)
      .where(
        or(
          like(suppliers.name, searchPattern),
          like(suppliers.vatNumber, searchPattern)
        )
      );

    console.log(`\n[+] Instant Search Filter Test for 'Al-Marai': Found ${searchResults.length} match(es).`);

    // Clean up test records
    for (const s of inserted) {
      await db.delete(suppliers).where(eq(suppliers.id, s.id));
    }
    console.log("[+] Test CSV records cleaned up.");

    console.log("\n🎉 SUPPLIER DIRECTORY & BULK CSV IMPORT TEST PASSED!");
  } catch (err) {
    console.error("❌ Supplier Directory Test Failed:", err);
    process.exit(1);
  }
}

testSuppliersDirectory().then(() => process.exit(0));
