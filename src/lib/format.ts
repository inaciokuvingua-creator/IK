export { useCurrency } from '../context/CurrencyContext';

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function parseProductImages(field: string | null | undefined): string[] {
  if (!field) return [];
  // If already JSON array
  try {
    if (field.trim().startsWith('[')) {
      const parsed = JSON.parse(field);
      if (Array.isArray(parsed)) return parsed.map(String);
    }
  } catch {}
  // If contains a separator used historically
  if (field.includes('|')) return field.split('|').map(s => s.trim()).filter(Boolean);
  // Single URL
  return [field];
}

export function firstProductImage(field: string | null | undefined): string | null {
  const imgs = parseProductImages(field);
  return imgs.length ? imgs[0] : null;
}
