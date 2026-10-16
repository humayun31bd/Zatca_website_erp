import { validateVoucherInvariants, VoucherLineInput } from './validator';

function runTests() {
  console.log("=== Running Double-Entry Voucher Invariant Tests ===");
  let passed = 0;
  let failed = 0;

  function assertEqual(actual: boolean, expected: boolean, testName: string) {
    if (actual === expected) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - Expected ${expected}, got ${actual}`);
      failed++;
    }
  }

  // Test 1: Valid 2-line balanced voucher
  const validTwoLines: VoucherLineInput[] = [
    { accountId: 'acc-1', debit: 5000, credit: 0 },
    { accountId: 'acc-2', debit: 0, credit: 5000 },
  ];
  const res1 = validateVoucherInvariants(validTwoLines);
  assertEqual(res1.isValid, true, "Valid 2-line balanced voucher");

  // Test 2: Valid 3-line balanced split voucher
  const validSplitLines: VoucherLineInput[] = [
    { accountId: 'acc-1', debit: 10000, credit: 0 },
    { accountId: 'acc-2', debit: 0, credit: 7000 },
    { accountId: 'acc-3', debit: 0, credit: 3000 },
  ];
  const res2 = validateVoucherInvariants(validSplitLines);
  assertEqual(res2.isValid, true, "Valid multi-line split balanced voucher");

  // Test 3: Reject single line item
  const singleLine: VoucherLineInput[] = [
    { accountId: 'acc-1', debit: 1000, credit: 0 },
  ];
  const res3 = validateVoucherInvariants(singleLine);
  assertEqual(res3.isValid, false, "Reject voucher with fewer than 2 lines");

  // Test 4: Reject negative debit/credit
  const negativeLine: VoucherLineInput[] = [
    { accountId: 'acc-1', debit: -500, credit: 0 },
    { accountId: 'acc-2', debit: 0, credit: -500 },
  ];
  const res4 = validateVoucherInvariants(negativeLine);
  assertEqual(res4.isValid, false, "Reject negative line amounts");

  // Test 5: Reject zero-value line
  const zeroLine: VoucherLineInput[] = [
    { accountId: 'acc-1', debit: 1000, credit: 0 },
    { accountId: 'acc-2', debit: 0, credit: 0 },
    { accountId: 'acc-3', debit: 0, credit: 1000 },
  ];
  const res5 = validateVoucherInvariants(zeroLine);
  assertEqual(res5.isValid, false, "Reject zero-value transaction lines");

  // Test 6: Reject line with both Debit and Credit
  const dualLine: VoucherLineInput[] = [
    { accountId: 'acc-1', debit: 1000, credit: 500 },
    { accountId: 'acc-2', debit: 0, credit: 500 },
  ];
  const res6 = validateVoucherInvariants(dualLine);
  assertEqual(res6.isValid, false, "Reject line item with both Debit and Credit");

  // Test 7: Reject imbalanced voucher
  const imbalancedLines: VoucherLineInput[] = [
    { accountId: 'acc-1', debit: 5000, credit: 0 },
    { accountId: 'acc-2', debit: 0, credit: 4990 },
  ];
  const res7 = validateVoucherInvariants(imbalancedLines);
  assertEqual(res7.isValid, false, "Reject imbalanced voucher (Debit != Credit)");

  console.log(`\nTest Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
