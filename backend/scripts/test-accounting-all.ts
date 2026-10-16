import { execSync } from "child_process";
import path from "path";

const scripts = [
  "test-pos-gl-integration.ts",
  "test-voucher-workflow.ts",
  "test-tds-vds-engine.ts",
  "test-asset-depreciation.ts",
  "test-forex-engine.ts",
  "test-recurring-vouchers.ts",
  "test-year-end-closing.ts",
  "test-cheque-management.ts",
  "test-cheque-voucher-integration.ts",
  "test-bank-reconciliation.ts",
  "test-auditor-portal.ts",
  "test-financial-reports.ts",
];

async function runAllAccountingTests() {
  console.log("=================================================");
  console.log("  ACCOUNTS & GENERAL LEDGER MASTER TEST SUITE   ");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  for (const script of scripts) {
    const scriptPath = path.join(__dirname, script);
    console.log(`▶ Running: ${script}...`);
    try {
      const output = execSync(`npx tsx "${scriptPath}"`, {
        cwd: path.join(__dirname, ".."),
        encoding: "utf-8",
      });
      console.log(`  ✅ PASSED: ${script}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAILED: ${script}`);
      console.error(err.stdout || err.message);
      failed++;
    }
    console.log("-------------------------------------------------");
  }

  console.log("\n=================================================");
  console.log(`  TEST RESULTS SUMMARY:`);
  console.log(`  Total Scripts: ${scripts.length}`);
  console.log(`  Passed:        ${passed}`);
  console.log(`  Failed:        ${failed}`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAllAccountingTests();
