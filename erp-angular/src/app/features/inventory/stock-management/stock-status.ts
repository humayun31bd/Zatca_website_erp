export type StockStatus = 'out' | 'low' | 'ok';

export function resolveStockStatus(quantity: number, minStockLevel: number): StockStatus {
  const qty = Number(quantity) || 0;
  const min = Number(minStockLevel) || 0;
  if (qty <= 0) return 'out';
  if (min > 0 && qty <= min) return 'low';
  return 'ok';
}

export function stockStatusLabel(status: StockStatus): string {
  if (status === 'out') return 'Out of Stock';
  if (status === 'low') return 'Low Stock';
  return 'In Stock';
}
