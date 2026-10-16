/**
 * Formats monetary amounts with thousand separators and optional Bangla numerals.
 * 
 * Example:
 * formatCurrency(250000.50, 'en') => "250,000.50"
 * formatCurrency(250000.50, 'bn') => "২৫০,০০০.৫০"
 */
export function formatCurrency(amount: number, lang: 'en' | 'bn' = 'en'): string {
  const num = Math.round((amount || 0) * 100) / 100;
  const formattedEn = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (lang === 'bn') {
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return formattedEn.replace(/[0-9]/g, (digit) => banglaDigits[parseInt(digit, 10)]);
  }

  return formattedEn;
}
