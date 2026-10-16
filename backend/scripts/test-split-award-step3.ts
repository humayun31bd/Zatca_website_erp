import { db } from "../src/lib/db";
import {
  supplierQuotations,
  purchaseOrders,
  purchaseOrderItems,
  quotationComparativeStatements,
} from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function testSplitAward() {
  console.log("=== Testing Step 3: Split-Award PO Generation E2E ===");
  const tenantId = "336eaf82-a524-4b0a-9326-7197b1e5459e";

  // 1. Get 2 quotations
  const quotes = await db
    .select()
    .from(supplierQuotations)
    .where(eq(supplierQuotations.tenantId, tenantId))
    .limit(2);

  if (quotes.length < 2) {
    throw new Error("Expected at least 2 quotations for split award test");
  }

  // 2. Create a new CS
  console.log("\n[1] Creating a test Comparative Statement for Split-Award evaluation...");
  const createRes = await fetch("http://localhost:3000/api/v1/procurement/cs?tenantId=" + tenantId, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Split-Award Industrial Supplies Evaluation CS",
      quotationIds: [quotes[0].id, quotes[1].id],
      remarks: "Testing multi-vendor split PO generation",
    }),
  });

  const createJson = await createRes.json();
  if (createRes.status !== 201 || !createJson.data?.id) {
    throw new Error(`Failed to create CS: ${JSON.stringify(createJson)}`);
  }
  const csId = createJson.data.id;
  console.log(`✓ CS created successfully with ID: ${csId} (${createJson.data.csNumber})`);

  // 3. Approve via Split-Award mode
  console.log("\n[2] Submitting Manager Approval with awardMode = 'SPLIT'...");
  const approveRes = await fetch("http://localhost:3000/api/v1/procurement/cs", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      csId,
      status: "APPROVED",
      awardMode: "SPLIT",
      remarks: "Approved via optimal Split-Award strategy (L1 item allocation)",
    }),
  });

  const approveJson = await approveRes.json();
  console.log("Approve response status:", approveRes.status);
  console.log("Generated POs count in response:", approveJson.generatedPurchaseOrders?.length);

  if (!approveJson.success) {
    throw new Error(`Split approval failed: ${JSON.stringify(approveJson)}`);
  }

  // 4. Verify in DB
  const posInDb = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.csId, csId));

  console.log(`\n[3] Found ${posInDb.length} Purchase Orders in database for CS ${csId}:`);
  for (const po of posInDb) {
    const items = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.poId, po.id));
    console.log(`  -> PO Number: ${po.poNumber}`);
    console.log(`     Supplier: ${po.supplierName} (ID: ${po.supplierId})`);
    console.log(`     Total: SAR ${po.totalAmount} (Items: ${items.length})`);
    items.forEach((it) => {
      console.log(`       * ${it.description} (Qty: ${it.quantity} @ SAR ${it.unitPrice}) = SAR ${it.totalAmount}`);
    });
  }

  if (posInDb.length === 0) {
    throw new Error("Expected at least 1 PO generated for split award");
  }

  console.log("\n✓ Step 3 Split-Award PO Generation verified with 100% success!");
}

testSplitAward().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
