import { collectBrandCatalog, filterBrands, BrandLookupItem } from './brand-lookup';

const brands: BrandLookupItem[] = [
  { id: '1', name: 'Almarai' },
  { id: '2', name: 'Apple' },
  { id: '3', name: 'Samsung' },
  { id: '4', name: 'Nike' },
  { id: '5', name: 'Nestle' }
];

describe('filterBrands', () => {
  it('returns all brands when query and letter are empty', () => {
    expect(filterBrands(brands, '', 'ALL').map(b => b.name)).toEqual([
      'Almarai', 'Apple', 'Nestle', 'Nike', 'Samsung'
    ]);
  });

  it('filters by case-insensitive search query', () => {
    expect(filterBrands(brands, 'sam', 'ALL').map(b => b.name)).toEqual(['Samsung']);
  });

  it('filters by starting letter', () => {
    expect(filterBrands(brands, '', 'A').map(b => b.name)).toEqual(['Almarai', 'Apple']);
  });

  it('applies search and letter together', () => {
    expect(filterBrands(brands, 'al', 'A').map(b => b.name)).toEqual(['Almarai']);
  });

  it('returns empty list when nothing matches', () => {
    expect(filterBrands(brands, 'xyz', 'ALL')).toEqual([]);
  });
});

describe('collectBrandCatalog', () => {
  it('merges stored brands with product brand names without duplicates', () => {
    const catalog = collectBrandCatalog(
      [{ id: '1', name: 'Apple' }],
      ['Apple', 'Nike', '  ', null]
    );
    expect(catalog.map(b => b.name)).toEqual(['Apple', 'Nike']);
  });
});
