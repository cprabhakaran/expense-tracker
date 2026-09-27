import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { StatementTransaction } from './statement';
import { toExpense } from './statement';
import { localStore } from './store/local';
import { supabaseStore } from './store/supabase';
import type { ExpenseStore } from './store/types';
import { supabase } from './supabase';
import type { Expense, NewExpense } from './types';

type ImportResult = { added: number; skipped: number };

type ExpensesValue = {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  /** True when expenses are kept on this device because no Supabase project is configured. */
  isLocalOnly: boolean;
  refresh: () => Promise<void>;
  add: (expense: NewExpense) => Promise<void>;
  update: (id: string, changes: Partial<NewExpense>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  importStatement: (transactions: StatementTransaction[]) => Promise<ImportResult>;
};

const ExpensesContext = createContext<ExpensesValue | null>(null);

export function ExpensesProvider({ children }: { children: ReactNode }) {
  const store: ExpenseStore = useMemo(() => (supabase ? supabaseStore(supabase) : localStore), []);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    () =>
      store
        .list()
        .then((all) => {
          all.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
          setExpenses(all);
          setError(null);
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load expenses.'))
        .finally(() => setLoading(false)),
    [store],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<ExpensesValue>(
    () => ({
      expenses,
      loading,
      error,
      isLocalOnly: supabase === null,
      refresh,
      async add(expense) {
        await store.add([expense]);
        await refresh();
      },
      async update(id, changes) {
        await store.update(id, changes);
        await refresh();
      },
      async remove(id) {
        await store.remove(id);
        await refresh();
      },
      async importStatement(transactions) {
        const known = new Set(expenses.map((e) => e.importKey).filter(Boolean));
        const fresh = transactions.filter((t) => !known.has(t.importKey)).map((t) => toExpense(t));
        const added = await store.add(fresh);
        await refresh();
        return { added: added.length, skipped: transactions.length - added.length };
      },
    }),
    [expenses, loading, error, refresh, store],
  );

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
}

export function useExpenses(): ExpensesValue {
  const value = useContext(ExpensesContext);
  if (!value) throw new Error('useExpenses must be used inside ExpensesProvider');
  return value;
}
