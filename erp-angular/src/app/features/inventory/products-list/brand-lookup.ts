export interface BrandLookupItem {
  id: string;
  name: string;
}

export const BRAND_LETTERS = [
  'ALL', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#'
];

export function filterBrands(
  brands: BrandLookupItem[],
  query: string,
  letter: string
): BrandLookupItem[] {
  const q = (query || '').trim().toLowerCase();
  const letterKey = (letter || 'ALL').toUpperCase();

  return brands
    .filter(brand => {
      const name = (brand.name || '').trim();
      if (!name) return false;
      if (q && !name.toLowerCase().includes(q)) return false;
      if (letterKey === 'ALL') return true;
      if (letterKey === '#') return !/^[A-Za-z]/.test(name);
      return name.toUpperCase().startsWith(letterKey);
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function collectBrandCatalog(
  stored: BrandLookupItem[],
  productBrandValues: Array<string | null | undefined>
): BrandLookupItem[] {
  const byName = new Map<string, BrandLookupItem>();

  stored.forEach(brand => {
    const name = (brand.name || '').trim();
    if (!name) return;
    byName.set(name.toLowerCase(), { id: brand.id, name });
  });

  productBrandValues.forEach(value => {
    const name = (value || '').trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (!byName.has(key)) {
      byName.set(key, { id: name, name });
    }
  });

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}
