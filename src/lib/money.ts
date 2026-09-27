/** Parses statement amounts such as "-$1,234.56", "(12.50)", "12.50 CR" or 17.58 into cents. */
export function parseAmountCents(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.round(value * 100) : null;
  }
  if (typeof value !== 'string') return null;
  let text = value.trim();
  if (!text) return null;

  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (/\bDR$/i.test(text)) {
    negative = true;
    text = text.replace(/\bDR$/i, '');
  }
  text = text.replace(/\bCR$/i, '');
  if (text.includes('-')) negative = true;

  const digits = text.replace(/[^0-9.]/g, '');
  if (!/^\d+(\.\d+)?$/.test(digits)) return null;
  const cents = Math.round(parseFloat(digits) * 100);
  return negative ? -cents : cents;
}

export function formatCents(cents: number, currency = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(cents / 100);
}
