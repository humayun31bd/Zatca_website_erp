export interface RealizedForexResult {
  foreignAmount: number;
  originalRate: number;
  settlementRate: number;
  originalBaseAmount: number;
  settlementBaseAmount: number;
  gainLossAmount: number;
  isGain: boolean;
}

export interface UnrealizedForexResult {
  foreignBalance: number;
  currentBookBaseValue: number;
  closingRate: number;
  newRevaluedBaseValue: number;
  unrealizedGainLoss: number;
  isGain: boolean;
}

export function calculateRealizedForexGainLoss(
  foreignAmount: number,
  originalRate: number,
  settlementRate: number
): RealizedForexResult {
  if (foreignAmount <= 0) {
    throw new Error('Foreign currency amount must be greater than zero');
  }
  if (originalRate <= 0 || settlementRate <= 0) {
    throw new Error('Exchange rates must be greater than zero');
  }

  const originalBaseAmount = Math.round(foreignAmount * originalRate * 100) / 100;
  const settlementBaseAmount = Math.round(foreignAmount * settlementRate * 100) / 100;
  const gainLossAmount = Math.round((settlementBaseAmount - originalBaseAmount) * 100) / 100;

  return {
    foreignAmount,
    originalRate,
    settlementRate,
    originalBaseAmount,
    settlementBaseAmount,
    gainLossAmount,
    isGain: gainLossAmount >= 0,
  };
}

export function calculateUnrealizedRevaluation(
  foreignBalance: number,
  currentBookBaseValue: number,
  closingRate: number
): UnrealizedForexResult {
  if (closingRate <= 0) {
    throw new Error('Closing exchange rate must be greater than zero');
  }

  const newRevaluedBaseValue = Math.round(foreignBalance * closingRate * 100) / 100;
  const unrealizedGainLoss = Math.round((newRevaluedBaseValue - currentBookBaseValue) * 100) / 100;

  return {
    foreignBalance,
    currentBookBaseValue,
    closingRate,
    newRevaluedBaseValue,
    unrealizedGainLoss,
    isGain: unrealizedGainLoss >= 0,
  };
}
