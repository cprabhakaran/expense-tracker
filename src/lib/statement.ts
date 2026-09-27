import { categorize } from './categories';
import { parseStatementDate } from './dates';
import { parseAmountCents } from './money';
import type { NewExpense } from './types';

/** One sheet of a workbook as a grid of raw cell values. */
export type SheetGrid = unknown[][];

export type StatementTransaction = {
  date: string;
  /** The first line of the details, cleaned up, e.g. "CORNER BUTCHER Parramatta". */
  merchant: string;
  /** The full details text as it appears on the statement. */
  details: string;
  /** Positive for money spent, negative for money received. */
  amountCents: number;
  balanceCents: number | null;
  card: string | null;
  valueDate: string | null;
  foreignAmount: string | null;
  importKey: string;
};

type Field = 'date' | 'details' | 'amount' | 'debit' | 'credit' | 'balance';

const HEADER_PATTERNS: [Field, RegExp][] = [
  ['date', /^(transaction )?date$/i],
  ['details', /^(transaction details|details|description|narrative|particulars|transaction)$/i],
  ['amount', /^amount( \(\w+\))?$/i],
  ['debit', /^(debit|debits|withdrawals?|money out)$/i],
  ['credit', /^(credit|credits|deposits?|money in)$/i],
  ['balance', /^balance$/i],
];

type Column = { field: Field; col: number };

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function readHeader(row: unknown[]): Column[] | null {
  const found: Column[] = [];
  row.forEach((cell, col) => {
    const text = cellText(cell);
    const match = HEADER_PATTERNS.find(([, pattern]) => pattern.test(text));
    if (match && !found.some((f) => f.field === match[0])) found.push({ field: match[0], col });
  });
  const fields = new Set(found.map((f) => f.field));
  const hasMoney = fields.has('amount') || fields.has('debit') || fields.has('credit');
  if (!fields.has('date') || !fields.has('details') || !hasMoney) return null;
  return found;
}

/**
 * PDF-to-Excel conversions scatter each value a few columns either side of its heading, so every
 * filled cell is given to the heading nearest to it.
 */
function readRow(row: unknown[], columns: Column[]): Partial<Record<Field, unknown>> {
  const values: Partial<Record<Field, unknown>> = {};
  row.forEach((cell, col) => {
    if (cellText(cell) === '') return;
    let nearest = columns[0];
    for (const column of columns) {
      if (Math.abs(column.col - col) < Math.abs(nearest.col - col)) nearest = column;
    }
    if (!(nearest.field in values)) values[nearest.field] = cell;
  });
  return values;
}

export function cleanMerchant(firstLine: string): string {
  return firstLine
    .replace(/^(SQ|LS|SP|ZLR|PAYPAL|PP)\s*\*\s*/i, '')
    .replace(/^LS\s+/, '')
    .replace(/(\s+(AU|NS|NSW|VI|VIC|QL|QLD|WA|SA|TA|TAS|ACT|NT))?\s+AUS$/i, '')
    .replace(/\s+[A-Z]{2}\s+[A-Z]{3}$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function parseDetails(details: string) {
  const lines = details.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let card: string | null = null;
  let valueDate: string | null = null;
  let foreignAmount: string | null = null;
  for (const line of lines.slice(1)) {
    const cardMatch = line.match(/^Card\s+(\S+)(?:\s+([A-Z]{3}\s+[\d,.]+))?/i);
    if (cardMatch) {
      card = cardMatch[1];
      foreignAmount = cardMatch[2] ?? null;
    }
    const valueMatch = line.match(/Value Date:\s*(\S+)/i);
    if (valueMatch) valueDate = parseStatementDate(valueMatch[1]);
  }
  return { merchant: cleanMerchant(lines[0] ?? ''), card, valueDate, foreignAmount };
}

/**
 * Reads bank statement transactions from the sheets of an Excel export. Header rows are found on
 * every sheet (each PDF page becomes its own sheet with its own layout), blank spacer rows are
 * skipped, and debits come back as positive spending.
 */
export function parseStatement(sheets: SheetGrid[]): StatementTransaction[] {
  const transactions: StatementTransaction[] = [];
  const seen = new Map<string, number>();

  for (const rows of sheets) {
    let columns: Column[] | null = null;
    for (const row of rows) {
      if (!Array.isArray(row)) continue;
      const header = readHeader(row);
      if (header) {
        columns = header;
        continue;
      }
      if (!columns) continue;

      const values = readRow(row, columns);
      const date = parseStatementDate(values.date);
      const details = cellText(values.details);
      if (!date || !details) continue;

      let signed = parseAmountCents(values.amount);
      if (signed === null) {
        const debit = parseAmountCents(values.debit);
        const credit = parseAmountCents(values.credit);
        if (debit !== null) signed = -Math.abs(debit);
        else if (credit !== null) signed = Math.abs(credit);
      }
      if (signed === null || signed === 0) continue;

      const balanceCents = parseAmountCents(values.balance);
      const parsed = parseDetails(details);
      const amountCents = -signed;

      // Identical rows without a balance (e.g. two coffees the same day) stay distinct.
      const baseKey = [date, amountCents, balanceCents ?? '', details.replace(/\s+/g, ' ').toUpperCase()].join('|');
      const occurrence = (seen.get(baseKey) ?? 0) + 1;
      seen.set(baseKey, occurrence);

      transactions.push({
        date,
        details,
        amountCents,
        balanceCents,
        ...parsed,
        merchant: parsed.merchant || details,
        importKey: occurrence === 1 ? baseKey : `${baseKey}#${occurrence}`,
      });
    }
  }
  return transactions;
}

export function toExpense(t: StatementTransaction, currency = 'AUD'): NewExpense {
  return {
    date: t.date,
    merchant: t.merchant,
    description: t.details,
    amountCents: t.amountCents,
    currency,
    category: categorize(t.details, t.amountCents),
    source: 'transfer',
    importKey: t.importKey,
  };
}
