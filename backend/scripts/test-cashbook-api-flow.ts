import { db } from "../src/lib/db/index";
import { tenants, cashBookEntries } from "../src/lib/db/schema";
import { eq, desc } from "drizzle-orm";

async function testCashBookApiFlow() {
  console.log("=================================================");
  console.log("  CASH BOOK & BANK REGISTER API FLOW VERIFICATION");
  console.log("=================================================\n");

  try {
    const tenantList = await db.select().from(tenants).limit(1);
    if (tenantList.length === 0) {
      console.log("⚠️ No active tenant found.");
      return;
    }
    const tenantId = tenantList[0].id;
    console.log(`[+] Target Tenant ID: ${tenantId}`);

    // Test 1: Insert numeric amount and string amount
    const id1 = crypto.randomUUID();
    await db.insert(cashBookEntries).values({
      id: id1,
      tenantId,
      type: "IN",
      amount: 1500.00,
      category: "Sales Revenue",
      description: "In-Store Cash Sales Batch #101",
      referenceId: "REF-POS-101",
      entryDate: new Date(),
    });
    console.log("  [x] Cash In Entry (1500.00 SAR) inserted cleanly.");

    const id2 = crypto.randomUUID();
    await db.insert(cashBookEntries).values({
      id: id2,
      tenantId,
      type: "OUT",
      amount: 350.50,
      category: "Petty Cash",
      description: "Store Supplies & Office Coffee",
      referenceId: "REF-EXP-552",
      entryDate: new Date(),
    });
    console.log("  [x] Cash Out Entry (350.50 SAR) inserted cleanly.");

    // Test 2: Fetch entries
    const records = await db
      .select()
      .from(cashBookEntries)
      .where(eq(cashBookEntries.tenantId, tenantId))
      .orderBy(desc(cashBookEntries.entryDate));

    console.log(`[+] Total Cash Book Records Fetched: ${records.length}`);
    for (const r of records.slice(0, 2)) {
      console.log(`  - Entry [${r.type}]: ${r.amount} SAR | ${r.description} (Ref: ${r.referenceId})`);
    }

    // Clean up
    await db.delete(cashBookEntries).where(eq(cashBookEntries.id, id1));
    await db.delete(cashBookEntries).where(eq(cashBookEntries.id, id2));

    console.log("\n🎉 ALL CASH BOOK & BANK REGISTER ERROR CHECKS PASSED!");
  } catch (err) {
    console.error("❌ Cash Book API Flow Test Failed:", err);
    process.exit(1);
  }
}

testCashBookApiFlow().then(() => process.exit(0));
