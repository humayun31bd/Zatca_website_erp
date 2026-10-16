export interface AssetDepreciationInput {
  purchaseCost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  depreciationMethod: 'STRAIGHT_LINE' | 'REDUCING_BALANCE';
  depreciationRate?: number; // annual percentage e.g. 20 for 20%
  accumulatedDepreciation: number;
  bookValue: number;
}

export interface DepreciationCalculationResult {
  monthlyDepreciation: number;
  newAccumulatedDepreciation: number;
  newBookValue: number;
  isFullyDepreciated: boolean;
}

export function calculateMonthlyDepreciation(input: AssetDepreciationInput): DepreciationCalculationResult {
  const {
    purchaseCost,
    salvageValue,
    usefulLifeMonths,
    depreciationMethod,
    depreciationRate = 0,
    accumulatedDepreciation,
    bookValue,
  } = input;

  const maxDepreciableAmount = Math.max(0, bookValue - salvageValue);

  if (maxDepreciableAmount <= 0) {
    return {
      monthlyDepreciation: 0,
      newAccumulatedDepreciation: accumulatedDepreciation,
      newBookValue: bookValue,
      isFullyDepreciated: true,
    };
  }

  let rawMonthly = 0;

  if (depreciationMethod === 'STRAIGHT_LINE') {
    const depreciableBase = purchaseCost - salvageValue;
    rawMonthly = usefulLifeMonths > 0 ? depreciableBase / usefulLifeMonths : 0;
  } else if (depreciationMethod === 'REDUCING_BALANCE') {
    const annualRateFraction = depreciationRate / 100;
    const monthlyRateFraction = annualRateFraction / 12;
    rawMonthly = bookValue * monthlyRateFraction;
  }

  const monthlyDepreciation = Math.round(Math.min(rawMonthly, maxDepreciableAmount) * 100) / 100;
  const newAccumulatedDepreciation = Math.round((accumulatedDepreciation + monthlyDepreciation) * 100) / 100;
  const newBookValue = Math.round((purchaseCost - newAccumulatedDepreciation) * 100) / 100;
  const isFullyDepreciated = newBookValue <= salvageValue;

  return {
    monthlyDepreciation,
    newAccumulatedDepreciation,
    newBookValue,
    isFullyDepreciated,
  };
}
