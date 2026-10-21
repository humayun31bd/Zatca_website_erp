import { resolveStockStatus, stockStatusLabel } from './stock-status';

describe('resolveStockStatus', () => {
  it('marks quantity 0 as out of stock', () => {
    expect(resolveStockStatus(0, 5)).toBe('out');
  });

  it('marks negative quantity as out of stock', () => {
    expect(resolveStockStatus(-2, 5)).toBe('out');
  });

  it('marks quantity at min level as low stock', () => {
    expect(resolveStockStatus(5, 5)).toBe('low');
  });

  it('marks quantity below min level as low stock', () => {
    expect(resolveStockStatus(2, 5)).toBe('low');
  });

  it('marks quantity above min level as in stock', () => {
    expect(resolveStockStatus(12, 5)).toBe('ok');
  });

  it('treats min 0 as always in stock when quantity is positive', () => {
    expect(resolveStockStatus(1, 0)).toBe('ok');
  });
});

describe('stockStatusLabel', () => {
  it('returns human labels for each status', () => {
    expect(stockStatusLabel('out')).toBe('Out of Stock');
    expect(stockStatusLabel('low')).toBe('Low Stock');
    expect(stockStatusLabel('ok')).toBe('In Stock');
  });
});
