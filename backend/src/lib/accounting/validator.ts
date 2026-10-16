export interface VoucherLineInput {
  accountId: string;
  costCenterId?: string;
  debit: number;
  credit: number;
  narration?: string;
}

export interface ValidationResult {
  isValid: boolean;
  totalDebit: number;
  totalCredit: number;
  error?: string;
}

/**
 * Validates double-entry accounting invariants for voucher lines.
 * 
 * Invariant Rules:
 * 1. Must contain at least 2 line items.
 * 2. No negative debit or credit values.
 * 3. No zero-value lines (must have debit > 0 OR credit > 0).
 * 4. Mutually exclusive debit and credit per line item (cannot contain both).
 * 5. Total Debit MUST equal Total Credit exactly (rounded to 2 decimal places).
 */
export function validateVoucherInvariants(lines: VoucherLineInput[]): ValidationResult {
  if (!lines || lines.length < 2) {
    return {
      isValid: false,
      totalDebit: 0,
      totalCredit: 0,
      error: "Voucher invariant violation: At least 2 line items are required.",
    };
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const debit = Number(line.debit) || 0;
    const credit = Number(line.credit) || 0;

    // Rule 2: No negative numbers
    if (debit < 0 || credit < 0) {
      return {
        isValid: false,
        totalDebit: 0,
        totalCredit: 0,
        error: `Voucher invariant violation line ${i + 1}: Negative debit or credit values are strictly forbidden.`,
      };
    }

    // Rule 3: No zero-value lines
    if (debit === 0 && credit === 0) {
      return {
        isValid: false,
        totalDebit: 0,
        totalCredit: 0,
        error: `Voucher invariant violation line ${i + 1}: Line item cannot have zero debit and zero credit.`,
      };
    }

    // Rule 4: Mutually exclusive debit and credit per line
    if (debit > 0 && credit > 0) {
      return {
        isValid: false,
        totalDebit: 0,
        totalCredit: 0,
        error: `Voucher invariant violation line ${i + 1}: A line item cannot contain both Debit and Credit amounts.`,
      };
    }

    totalDebit += debit;
    totalCredit += credit;
  }

  // Round to 2 decimal places for financial accuracy (BDT)
  const roundedDebit = Math.round(totalDebit * 100) / 100;
  const roundedCredit = Math.round(totalCredit * 100) / 100;

  // Rule 5: Total Debit == Total Credit
  if (roundedDebit !== roundedCredit) {
    const delta = Math.abs(roundedDebit - roundedCredit);
    return {
      isValid: false,
      totalDebit: roundedDebit,
      totalCredit: roundedCredit,
      error: `Voucher invariant violation: Total Debit (${roundedDebit} BDT) does not balance with Total Credit (${roundedCredit} BDT). Difference: ${delta.toFixed(2)} BDT.`,
    };
  }

  return {
    isValid: true,
    totalDebit: roundedDebit,
    totalCredit: roundedCredit,
  };
}
