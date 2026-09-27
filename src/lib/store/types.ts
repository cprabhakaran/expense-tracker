import type { Expense, NewExpense } from '../types';

export interface ExpenseStore {
  list(): Promise<Expense[]>;
  add(expenses: NewExpense[]): Promise<Expense[]>;
  update(id: string, changes: Partial<NewExpense>): Promise<void>;
  remove(id: string): Promise<void>;
}
