import { buildLineItemMatrix } from "../src/lib/procurement/cs_scoring";

console.log("=== Testing Step 2: Line-Item Comparison Matrix Breakdown ===");

const participatingBids = [
  {
    quotationId: "q1",
    supplierId: "s1",
    supplierName: "Apex Supplies Co.",
    quotationNumber: "QT-2026-001",
  },
  {
    quotationId: "q2",
    supplierId: "s2",
    supplierName: "Beacon Logistics & Trade",
    quotationNumber: "QT-2026-002",
  },
];

const rawItems = [
  // Product 1: Packaging Cartons 50x50
  {
    quotationId: "q1",
    productId: "p1",
    productName: "Packaging Cartons 50x50",
    description: "Packaging Cartons 50x50 Heavy Duty",
    quantity: 100,
    unitPrice: 15.0,
    totalAmount: 1500.0,
  },
  {
    quotationId: "q2",
    productId: "p1",
    productName: "Packaging Cartons 50x50",
    description: "Packaging Cartons 50x50 Standard",
    quantity: 100,
    unitPrice: 12.0,
    totalAmount: 1200.0,
  },
  // Product 2: Industrial Stretch Film 200m
  {
    quotationId: "q1",
    productId: "p2",
    productName: "Industrial Stretch Film 200m",
    description: "Industrial Stretch Film 200m Clear",
    quantity: 50,
    unitPrice: 20.0,
    totalAmount: 1000.0,
  },
  {
    quotationId: "q2",
    productId: "p2",
    productName: "Industrial Stretch Film 200m",
    description: "Industrial Stretch Film 200m Clear",
    quantity: 50,
    unitPrice: 26.0,
    totalAmount: 1300.0,
  },
];

const matrix = buildLineItemMatrix(participatingBids, rawItems);

console.log(`\nItems compared: ${matrix.rows.length}`);
matrix.rows.forEach((row, i) => {
  console.log(`\n[Line Item #${i + 1}] ${row.productName} (Qty: ${row.quantity})`);
  console.log(`  Lowest Unit Price: SAR ${row.lowestUnitPrice} (${row.lowestSupplierName})`);
  console.log(`  Highest Unit Price: SAR ${row.highestUnitPrice}`);
  console.log(`  Price Spread: ${row.variancePercent}% | Potential Savings: SAR ${row.potentialSavings}`);

  participatingBids.forEach((bid) => {
    const b = row.supplierBids[bid.quotationId];
    console.log(
      `    -> ${bid.supplierName}: SAR ${b?.unitPrice}/unit | Total: SAR ${b?.totalAmount} | Lowest: ${b?.isLowestPrice}`
    );
  });
});

console.log("\n--- Executive Optimization Summary ---");
console.log(`Total Distinct Products: ${matrix.summary.totalItems}`);
console.log(`Cherry-Pick Lowest Rate Total: SAR ${matrix.summary.cherryPickTotal}`);
console.log(`Supplier 1 Total: SAR ${matrix.summary.singleSupplierTotals["q1"]?.total}`);
console.log(`Supplier 2 Total: SAR ${matrix.summary.singleSupplierTotals["q2"]?.total}`);
console.log(`Potential Savings vs Highest: SAR ${matrix.summary.potentialSavingsVsHighest} (${matrix.summary.potentialSavingsPercent}%)`);

// Assertions
if (matrix.rows.length !== 2) throw new Error("Expected 2 rows in line-item matrix");
const item1 = matrix.rows.find((r) => r.productId === "p1");
if (item1?.lowestQuotationId !== "q2") throw new Error("Expected q2 to be lowest for p1");
const item2 = matrix.rows.find((r) => r.productId === "p2");
if (item2?.lowestQuotationId !== "q1") throw new Error("Expected q1 to be lowest for p2");

// Cherry pick total should be (12 * 100) + (20 * 50) = 1200 + 1000 = 2200
if (matrix.summary.cherryPickTotal !== 2200) {
  throw new Error(`Expected cherryPickTotal to be 2200, got ${matrix.summary.cherryPickTotal}`);
}

console.log("\n✓ Step 2 Line-Item Matrix tests passed with 100% mathematical accuracy!");
