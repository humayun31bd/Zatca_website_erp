import { generatePosInvoiceGlVoucher } from "../src/lib/accounting/pos_integration";
import { db } from "../src/lib/db";
import { vouchers, voucherLines, syncQueue, accounts } from "../src/lib/db/accounting_schema";
import { eq, like } from "drizzle-orm";

async function runPosGlIntegrationTest() {
  console.log("=== Running POS Invoice GL Voucher Integration Test ===");

  const tenantId = "demo-tenant-grocery-001";
  const invoiceNumber = `POS-TEST-${Date.now()}`;
  
  const subtotalAmount = 1000.00;
  const vatAmount = 150.00;
  const totalAmount = 1150.00;
  const cogsAmount = 700.00;

  console.log(`Creating test POS GL Voucher for Invoice: ${invoiceNumber}...`);

  const createdVoucher = await generatePosInvoiceGlVoucher({
    tenantId,
    invoiceId: `inv-${Date.now()}`,
    invoiceNumber,
    issueDate: new Date(),
    paymentMethod: 'CASH',
    subtotalAmount,
    vatAmount,
    totalAmount,
    cogsAmount,
    makerId: 'test-pos-user',
  });

  console.log(`✔ Voucher Created Successfully! ID: ${createdVoucher.id}, Number: ${createdVoucher.voucherNumber}`);

  // 1. Fetch Voucher Lines
  const lines = await db
    .select()
    .from(voucherLines)
    .where(eq(voucherLines.voucherId, createdVoucher.id));

  console.log(`✔ Retrieved ${lines.length} Voucher Lines:`);
  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    totalDebit += line.debit;
    totalCredit += line.credit;
    console.log(`  - [Account ID: ${line.accountId}] Debit: BDT ${line.debit}, Credit: BDT ${line.credit} | Narration: "${line.narration}"`);
  }

  console.log(`✔ Balance Check: Total Debit = BDT ${totalDebit}, Total Credit = BDT ${totalCredit}`);

  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new Error(`Double-Entry Invariant Violation! Debit (${totalDebit}) != Credit (${totalCredit})`);
  }

  // 2. Fetch Sync Queue Entry
  const syncItems = await db
    .select()
    .from(syncQueue)
    .where(eq(syncQueue.entityId, createdVoucher.id));

  if (syncItems.length === 0) {
    throw new Error("Sync Queue Outbox entry was not created!");
  }

  console.log(`✔ Transactional Outbox Sync Entry Found! Queue ID: ${syncItems[0].id}, Entity Type: ${syncItems[0].entityType}`);

  console.log("\n✅ ALL POS INVOICE GL VOUCHER INTEGRATION TESTS PASSED CLEANLY!");
  process.exit(0);
}

runPosGlIntegrationTest().catch((err) => {
  console.error("❌ POS GL Integration Test Failed:", err);
  process.exit(1);
});
