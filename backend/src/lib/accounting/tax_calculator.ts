export interface TaxDeductionResult {
  grossBillAmount: number;
  tdsPercentage: number;
  vdsPercentage: number;
  tdsAmount: number;
  vdsAmount: number;
  netVendorPayable: number;
}

export function calculateTdsVdsDeductions(
  grossBillAmount: number,
  tdsPercentage: number,
  vdsPercentage: number
): TaxDeductionResult {
  if (grossBillAmount <= 0) {
    throw new Error('Gross bill amount must be greater than zero');
  }
  if (tdsPercentage < 0 || vdsPercentage < 0) {
    throw new Error('Tax percentages cannot be negative');
  }

  const tdsAmount = Math.round(grossBillAmount * (tdsPercentage / 100) * 100) / 100;
  const vdsAmount = Math.round(grossBillAmount * (vdsPercentage / 100) * 100) / 100;
  
  // Ensure strict arithmetic balance: netPayable + tds + vds = grossBillAmount
  const netVendorPayable = Math.round((grossBillAmount - tdsAmount - vdsAmount) * 100) / 100;

  return {
    grossBillAmount,
    tdsPercentage,
    vdsPercentage,
    tdsAmount,
    vdsAmount,
    netVendorPayable,
  };
}
