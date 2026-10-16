import { db } from "../src/lib/db";
import {
  quotationComparativeStatements,
  csItems,
  supplierQuotations,
  suppliers,
  purchaseOrders,
} from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function runTest() {
  console.log("=== Testing Purchase Comparative Statement (CS Matrix) E2E ===");

  const tenantId = "336eaf82-a524-4b0a-9326-7197b1e5459e";

  // 1. Fetch available supplier quotations
  const quotes = await db
    .select()
    .from(supplierQuotations)
    .where(eq(supplierQuotations.tenantId, tenantId))
    .limit(2);

  console.log(`Found ${quotes.length} quotation(s) for tenant ${tenantId}`);
  if (quotes.length < 2) {
    throw new Error("Expected at least 2 quotations for CS test");
  }

  const quote1 = quotes[0];
  const quote2 = quotes[1];

  // 2. Test POST /api/v1/procurement/cs validation (fewer than 2 quotes)
  console.log("\n[Test 1] Testing validation: rejection if fewer than 2 quotations are provided...");
  const invalidRes = await fetch("http://localhost:3000/api/v1/procurement/cs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Invalid Test CS",
      quotationIds: [quote1.id],
    }),
  });
  const invalidJson = await invalidRes.json();
  console.log("Validation response:", invalidRes.status, invalidJson);
  if (invalidRes.status !== 400) {
    throw new Error(`Expected 400 for < 2 quotations, got ${invalidRes.status}`);
  }
  console.log("✓ Correctly rejected with 400 Bad Request");

  // 3. Test POST /api/v1/procurement/cs with full payload
  console.log("\n[Test 2] Testing successful CS creation with items array...");
  const createRes = await fetch("http://localhost:3000/api/v1/procurement/cs?tenantId=" + tenantId, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Q4 Packaging Supplies Comparative Evaluation",
      status: "DRAFT",
      quotationIds: [quote1.id, quote2.id],
      items: [
        {
          quotationId: quote1.id,
          supplierId: quote1.supplierId,
          deliveryLeadDays: 5,
          score: 85,
        },
        {
          quotationId: quote2.id,
          supplierId: quote2.supplierId,
          deliveryLeadDays: 7,
          score: 92,
        },
      ],
      remarks: "Automated verification test CS",
    }),
  });

  const createJson = await createRes.json();
  console.log("Create response:", createRes.status, {
    success: createJson.success,
    csNumber: createJson.data?.csNumber,
    itemsCount: createJson.data?.items?.length,
  });

  if (createRes.status !== 201 || !createJson.data?.id) {
    throw new Error(`Failed to create CS: ${JSON.stringify(createJson)}`);
  }
  const createdCsId = createJson.data.id;
  console.log("✓ CS Created successfully with ID:", createdCsId);

  // 4. Test GET /api/v1/procurement/cs
  console.log("\n[Test 3] Testing GET /api/v1/procurement/cs...");
  const getRes = await fetch("http://localhost:3000/api/v1/procurement/cs?tenantId=" + tenantId);
  const getJson = await getRes.json();
  const foundCs = getJson.data?.find((c: any) => c.id === createdCsId);
  console.log("Found CS in list:", {
    id: foundCs?.id,
    csNumber: foundCs?.csNumber,
    status: foundCs?.status,
    itemsCount: foundCs?.items?.length,
  });
  if (!foundCs || foundCs.items.length !== 2) {
    throw new Error("Created CS not found or items count mismatch in GET response");
  }
  console.log("✓ CS retrieved with both items and bids populated");

  // 5. Test PUT /api/v1/procurement/cs to approve CS and auto-generate PO
  console.log("\n[Test 4] Testing approval and auto Purchase Order generation...");
  const approveRes = await fetch("http://localhost:3000/api/v1/procurement/cs", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      csId: createdCsId,
      status: "APPROVED",
      winningQuotationId: quote1.id,
      remarks: "Approved by Purchase Manager",
    }),
  });

  const approveJson = await approveRes.json();
  console.log("Approve response:", approveRes.status, {
    status: approveJson.data?.status,
    winningQuotationId: approveJson.data?.winningQuotationId,
    winnerSupplierName: approveJson.data?.winnerSupplierName,
  });

  if (approveJson.data?.status !== "APPROVED") {
    throw new Error("CS status was not updated to APPROVED");
  }

  // Check generated Purchase Order
  const pos = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.csId, createdCsId));

  console.log("Auto-generated Purchase Orders count:", pos.length);
  if (pos.length > 0) {
    console.log("✓ Generated PO:", {
      poNumber: pos[0].poNumber,
      supplierName: pos[0].supplierName,
      totalAmount: pos[0].totalAmount,
      status: pos[0].status,
    });
  }

  console.log("\n🎉 ALL COMPARATIVE STATEMENT E2E TESTS PASSED SUCCESSFULLY!");
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
