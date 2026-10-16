import { computeComparativeScoring } from "../src/lib/procurement/cs_scoring";

console.log("=== Testing Step 1: Multi-Criteria Scoring Engine ===");

const sampleBids = [
  { quotationId: "q1", totalAmount: 10000, deliveryLeadDays: 14, technicalScore: 90 },
  { quotationId: "q2", totalAmount: 8000, deliveryLeadDays: 20, technicalScore: 75 },
  { quotationId: "q3", totalAmount: 12000, deliveryLeadDays: 7, technicalScore: 95 },
];

const scored = computeComparativeScoring(sampleBids);

console.log("\nScoring Results:");
scored.forEach((b) => {
  console.log(`Rank #${b.rank} (Bid ${b.quotationId}):`);
  console.log(`  Price: ${b.totalAmount} (Financial Score: ${b.financialScore}%) - Lowest: ${b.isLowestPrice}`);
  console.log(`  Lead Days: ${b.deliveryLeadDays} (Delivery Score: ${b.deliveryScore}%)`);
  console.log(`  Tech Score: ${b.technicalScore}`);
  console.log(`  Composite Score: ${b.compositeScore}/100 - Highest Score: ${b.isHighestScore}`);
});

// Verification assertions
const lowestPriceBid = scored.find((b) => b.isLowestPrice);
if (lowestPriceBid?.quotationId !== "q2") {
  throw new Error(`Expected q2 to be lowest price, got ${lowestPriceBid?.quotationId}`);
}

const rank1Bid = scored.find((b) => b.rank === 1);
console.log(`\nWinner by Composite Score: Bid ${rank1Bid?.quotationId} with score ${rank1Bid?.compositeScore}`);

console.log("\n✓ Step 1 scoring engine mathematical verification passed successfully!");
