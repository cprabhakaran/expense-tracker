import { countsAsSpending } from './categories';
import { monthKey, shiftMonth } from './dates';
import type { Expense } from './types';

export type Slice = { label: string; cents: number };

export type MonthSummary = {
  month: string;
  spentCents: number;
  previousSpentCents: number;
  cashCents: number;
  transferCents: number;
  /** Buy Now Pay Later repayments, shown separately from spending. */
  bnplCents: number;
  incomeCents: number;
  byCategory: Slice[];
  topMerchants: Slice[];
  /** Spending for the six months ending with this one, oldest first. */
  trend: Slice[];
  count: number;
};

function sumSpending(expenses: Expense[]): number {
  return expenses.filter((e) => countsAsSpending(e.category)).reduce((total, e) => total + e.amountCents, 0);
}

function groupTotals(expenses: Expense[], keyOf: (e: Expense) => string, limit?: number): Slice[] {
  const totals = new Map<string, number>();
  for (const e of expenses) totals.set(keyOf(e), (totals.get(keyOf(e)) ?? 0) + e.amountCents);
  const slices = [...totals].map(([label, cents]) => ({ label, cents })).filter((s) => s.cents > 0);
  slices.sort((a, b) => b.cents - a.cents);
  return limit ? slices.slice(0, limit) : slices;
}

export function summarizeMonth(expenses: Expense[], month: string): MonthSummary {
  const byMonth = new Map<string, Expense[]>();
  for (const e of expenses) {
    const key = monthKey(e.date);
    byMonth.set(key, [...(byMonth.get(key) ?? []), e]);
  }
  const inMonth = byMonth.get(month) ?? [];
  const spending = inMonth.filter((e) => countsAsSpending(e.category));

  return {
    month,
    spentCents: sumSpending(inMonth),
    previousSpentCents: sumSpending(byMonth.get(shiftMonth(month, -1)) ?? []),
    cashCents: sumSpending(inMonth.filter((e) => e.source === 'cash')),
    transferCents: sumSpending(inMonth.filter((e) => e.source === 'transfer')),
    bnplCents: inMonth.filter((e) => e.category === 'Buy Now Pay Later').reduce((t, e) => t + e.amountCents, 0),
    incomeCents: -inMonth.filter((e) => e.category === 'Income & refunds').reduce((t, e) => t + e.amountCents, 0),
    byCategory: groupTotals(spending, (e) => e.category),
    topMerchants: groupTotals(spending, (e) => e.merchant, 5),
    trend: [-5, -4, -3, -2, -1, 0].map((delta) => {
      const key = shiftMonth(month, delta);
      return { label: key, cents: sumSpending(byMonth.get(key) ?? []) };
    }),
    count: inMonth.length,
  };
}

/** The month of the newest expense, so the dashboard opens on data rather than an empty month. */
export function latestMonth(expenses: Expense[], fallback: string): string {
  return expenses.reduce((latest, e) => (monthKey(e.date) > latest ? monthKey(e.date) : latest), '') || fallback;
}
