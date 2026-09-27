import { describe, expect, it } from 'vitest';

import { latestMonth, summarizeMonth } from '../summary';
import type { Expense } from '../types';

let n = 0;
function expense(date: string, amountCents: number, category: string, source: Expense['source'] = 'transfer', merchant = 'Shop'): Expense {
  return { id: String(++n), date, merchant, description: merchant, amountCents, currency: 'AUD', category, source, createdAt: '' };
}

const expenses = [
  expense('2026-08-15', 5000, 'Groceries'),
  expense('2026-09-01', 4238, 'Groceries', 'transfer', 'Butcher'),
  expense('2026-09-02', 1200, 'Dining & cafes', 'cash', 'Cafe'),
  expense('2026-09-02', 9726, 'Buy Now Pay Later', 'transfer', 'StepPay Repayment'),
  expense('2026-09-03', -250000, 'Income & refunds'),
];

describe('summarizeMonth', () => {
  const s = summarizeMonth(expenses, '2026-09');

  it('leaves repayments and income out of spending', () => {
    expect(s.spentCents).toBe(5438);
    expect(s.bnplCents).toBe(9726);
    expect(s.incomeCents).toBe(250000);
  });

  it('splits spending by cash and transfer', () => {
    expect([s.cashCents, s.transferCents]).toEqual([1200, 4238]);
  });

  it('compares with the previous month and builds a six-month trend', () => {
    expect(s.previousSpentCents).toBe(5000);
    expect(s.trend.map((t) => t.label)).toEqual(['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']);
    expect(s.trend.at(-1)!.cents).toBe(5438);
  });

  it('ranks categories and merchants by spending only', () => {
    expect(s.byCategory).toEqual([
      { label: 'Groceries', cents: 4238 },
      { label: 'Dining & cafes', cents: 1200 },
    ]);
    expect(s.topMerchants.map((m) => m.label)).toEqual(['Butcher', 'Cafe']);
  });
});

it('opens on the newest month with data', () => {
  expect(latestMonth(expenses, '2026-01')).toBe('2026-09');
  expect(latestMonth([], '2026-01')).toBe('2026-01');
});
