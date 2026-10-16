import { db } from "../src/lib/db/index";
import { tenants, cashBookEntries } from "../src/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";

async function testCashBook() {
  console.log("=================================================");
  console.log("   CASH BOOK & BANK REGISTER ERROR CHECK        ");
  console.log("=================================================\n");

  try {
    // 1. Fetch tenant
    const tenantList = await db.select().from(tenants).limit(1);
    if (tenantList.length === 0) {
      console.log("⚠️ No active tenant found.");
      return;
    }
    const tenantId = tenantList[0].id;
    console.log(`[+] Target Tenant ID: ${tenantId}`);

    // 2. Query Cash Book Entries
    const entries = await db
      .select()
      .from(cashBookEntries)
      .where(eq(cashBookEntries.tenantId, tenantId))
      .orderBy(desc(cashBookEntries.entryDate));

    console.log(`[+] Found ${entries.length} cash book entries in database.`);
    if (entries.length > 0) {
      console.log("  Sample Entry:", entries[0]);
      console.log(`  typeof entry.amount: ${typeof entries[0].amount} (Value: ${entries[0].amount})`);
    }

    // 3. Test insert with number amount and non-UUID reference
    const testEntryId = crypto.randomUUID();
    const inserted = await db.insert(cashBookEntries).values({
      id: testEntryId,
      tenantId: tenantId,
      type: "IN",
      amount: 250.75,
      category: "Sales",
      description: "Counter Daily Sales Cash In",
      referenceId: "REF-MANUAL-001",
      entryDate: new Date(),
    }).returning();

    console.log("\n[+] Inserted test cash book entry successfully:");
    console.log(inserted[0]);

    // 4. Test Cash Summary aggregation
    const summary = await db
      .select({
        type: cashBookEntries.type,
        total: sql<number>`sum(${cashBookEntries.amount})`,
      })
      .from(cashBookEntries)
      .where(eq(cashBookEntries.tenantId, tenantId))
      .groupBy(cashBookEntries.type);

    let totalIn = 0;
    let totalOut = 0;
    summary.forEach((s) => {
      if (s.type === 'IN') totalIn = Number(s.total || 0);
      if (s.type === 'OUT') totalOut = Number(s.total || 0);
    });
    const closingBalance = totalIn - totalOut;

    console.log("\n--- Cash Book Summary ---");
    console.log(`  Total In:        ${totalIn.toFixed(2)} SAR`);
    console.log(`  Total Out:       ${totalOut.toFixed(2)} SAR`);
    console.log(`  Closing Balance: ${closingBalance.toFixed(2)} SAR`);

    // Clean up test entry
    await db.delete(cashBookEntries).where(eq(cashBookEntries.id, testEntryId));
    console.log("\n✅ Test entry cleaned up.");

    console.log("\n🎉 CASH BOOK & BANK REGISTER ERROR CHECK COMPLETED!");
  } catch (err) {
    console.error("❌ Cash Book Error Check Failed:", err);
    process.exit(1);
  }
}

testCashBook().then(() => process.exit(0));
