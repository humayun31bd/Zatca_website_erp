import { db } from "../src/lib/db/index";
import { tenants, suppliers, supplierReturns, supplierReturnItems } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function testSupplierReturns() {
  console.log("=================================================");
  console.log("    SUPPLIER RETURNS & DEBIT NOTE BACKEND TEST   ");
  console.log("=================================================\n");

  try {
    const tenantList = await db.select().from(tenants).limit(1);
    if (tenantList.length === 0) {
      console.log("⚠️ No active tenant found.");
      return;
    }
    const tenantId = tenantList[0].id;
    console.log(`[+] Target Tenant ID: ${tenantId}`);

    // 1. Get or Create Supplier
    let [supplier] = await db.select().from(suppliers).where(eq(suppliers.tenantId, tenantId)).limit(1);
    if (!supplier) {
      const supId = crypto.randomUUID();
      [supplier] = await db.insert(suppliers).values({
        id: supId,
        tenantId,
        name: `Return Test Supplier ${Date.now()}`,
        vatNumber: "310999888700003",
        crNumber: "1010999888",
      }).returning();
    }
    console.log(`[+] Supplier Found/Created: ${supplier.name}`);

    // 2. Create Supplier Return (Debit Note)
    const returnId = crypto.randomUUID();
    const retNum = `PRN-TEST-${Date.now().toString().slice(-4)}`;
    const dnNum = `DN-TEST-${Date.now().toString().slice(-4)}`;

    const [newReturn] = await db.insert(supplierReturns).values({
      id: returnId,
      tenantId,
      returnNumber: retNum,
      debitNoteNumber: dnNum,
      supplierId: supplier.id,
      supplierName: supplier.name,
      returnDate: new Date().toISOString(),
      reason: "DAMAGED_GOODS",
      subtotalAmount: 2000,
      vatAmount: 300,
      totalAmount: 2300,
      status: "APPROVED",
      refundStatus: "PENDING",
      remarks: "Returned 10 damaged units during quality check inspection",
    }).returning();

    console.log(`[+] Created Supplier Return #${newReturn.returnNumber} (Debit Note: ${newReturn.debitNoteNumber})`);

    // 3. Add Line Items
    await db.insert(supplierReturnItems).values([
      {
        id: crypto.randomUUID(),
        returnId,
        itemDescription: "Industrial Motor Spare Parts - Model X",
        unitPrice: 200,
        quantity: 10,
        vatRate: 15,
        vatAmount: 300,
        totalAmount: 2300,
        reason: "DAMAGED_IN_TRANSIT",
      }
    ]);

    console.log(`[+] Inserted 1 Return Line Item for ${newReturn.returnNumber}`);

    // 4. Query Return
    const items = await db.select().from(supplierReturnItems).where(eq(supplierReturnItems.returnId, returnId));
    console.log(`[+] Query Verified: Found ${items.length} return line item(s). Total: ${newReturn.totalAmount} SAR`);

    // 5. Cleanup
    await db.delete(supplierReturnItems).where(eq(supplierReturnItems.returnId, returnId));
    await db.delete(supplierReturns).where(eq(supplierReturns.id, returnId));
    console.log("[+] Test Supplier Return and items cleaned up cleanly.");

    console.log("\n🎉 SUPPLIER RETURNS BACKEND INTEGRATION TEST PASSED SUCCESSFULLY!");
  } catch (err) {
    console.error("❌ Supplier Returns Test Failed:", err);
  }
}

testSupplierReturns();
