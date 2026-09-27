import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';

import { parseStatement, toExpense, type SheetGrid } from '../statement';
import { readWorkbook } from '../statement-file';

// Made-up transactions laid out the way a PDF statement converted to Excel comes out: each page
// is a sheet, columns shift between pages, values drift a column or two from their heading and
// blank rows sit between transactions.
function row(width: number, cells: Record<number, string>): string[] {
  return Array.from({ length: width }, (_, i) => cells[i] ?? '');
}

const page1: SheetGrid = [
  row(32, { 1: 'Date', 5: 'Transaction details', 24: 'Amount', 31: 'Balance' }),
  row(32, {}),
  row(32, { 1: '01 Sep 2026', 5: 'Debit Excess Interest', 26: '-$0.03', 30: '$1,000.00' }),
  row(32, {}),
  row(32, { 1: '01 Sep 2026', 5: 'SQ *CORNER BUTCHER Parramatta NS AUS\nCard xx0000\nValue Date: 30/08/2026', 25: '-$42.38', 30: '$957.62' }),
  row(32, {}),
  row(32, { 1: '02 Sep 2026', 5: 'EXAMPLE CAFE SYDNEY AU AUS\nCard xx0000\nValue Date: 31/08/2026', 26: '-$6.00', 30: '$951.62' }),
  row(32, { 1: '02 Sep 2026', 5: 'ONLINE TOOL LTD LONDON GB GBR\nCard xx0000 GBP 1.25\nValue Date: 31/08/2026', 26: '-$2.45', 30: '$949.17' }),
  row(32, { 1: '02 Sep 2026', 5: 'StepPay Repayment', 25: '-$97.26', 30: '$851.91' }),
];

const page2: SheetGrid = [
  row(16, { 7: 'Page', 12: '2 of 2' }),
  row(16, { 0: 'Date', 3: 'Transaction details', 9: 'Amount', 15: 'Balance' }),
  row(16, {}),
  row(16, { 0: '03 Sep 2026', 3: 'Salary ACME PTY LTD', 10: '$2,500.00', 15: '$3,351.91' }),
  row(16, { 0: '03 Sep 2026', 3: 'StepPay Repayment', 10: '-$26.54', 15: '$3,325.37' }),
];

describe('parseStatement', () => {
  const transactions = parseStatement([page1, page2]);

  it('reads every transaction across pages with shifting columns', () => {
    expect(transactions.map((t) => [t.date, t.amountCents])).toEqual([
      ['2026-09-01', 3],
      ['2026-09-01', 4238],
      ['2026-09-02', 600],
      ['2026-09-02', 245],
      ['2026-09-02', 9726],
      ['2026-09-03', -250000],
      ['2026-09-03', 2654],
    ]);
  });

  it('keeps the balance separate from the amount', () => {
    expect(transactions.map((t) => t.balanceCents)).toEqual([100000, 95762, 95162, 94917, 85191, 335191, 332537]);
  });

  it('splits the details into merchant, card, value date and foreign amount', () => {
    expect(transactions[1]).toMatchObject({
      merchant: 'CORNER BUTCHER Parramatta',
      card: 'xx0000',
      valueDate: '2026-08-30',
      foreignAmount: null,
    });
    expect(transactions[2].merchant).toBe('EXAMPLE CAFE SYDNEY');
    expect(transactions[3]).toMatchObject({ merchant: 'ONLINE TOOL LTD LONDON', foreignAmount: 'GBP 1.25' });
  });

  it('gives every row a stable, unique import key', () => {
    const keys = transactions.map((t) => t.importKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(parseStatement([page1, page2]).map((t) => t.importKey)).toEqual(keys);
  });

  it('keeps identical rows distinct when there is no balance', () => {
    const noBalance: SheetGrid = [
      ['Date', 'Description', 'Debit', 'Credit'],
      ['05/09/2026', 'COFFEE SHOP', '4.50', ''],
      ['05/09/2026', 'COFFEE SHOP', '4.50', ''],
      ['06/09/2026', 'REFUND', '', '10.00'],
    ];
    const result = parseStatement([noBalance]);
    expect(result.map((t) => t.amountCents)).toEqual([450, 450, -1000]);
    expect(result[0].importKey).not.toBe(result[1].importKey);
  });

  it('categorises repayments, fees and income so they stay out of spending', () => {
    const categories = transactions.map((t) => toExpense(t).category);
    expect(categories).toEqual([
      'Fees & interest',
      'Groceries',
      'Dining & cafes',
      'Other',
      'Buy Now Pay Later',
      'Income & refunds',
      'Buy Now Pay Later',
    ]);
  });
});

describe('readWorkbook', () => {
  it('reads a legacy .xls file sheet by sheet', () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(page1), 'Page 1');
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(page2), 'Page 2');
    const bytes: Uint8Array = XLSX.write(book, { bookType: 'biff8', type: 'array' });

    const sheets = readWorkbook(bytes);
    expect(sheets).toHaveLength(2);
    expect(parseStatement(sheets)).toHaveLength(7);
  });
});
