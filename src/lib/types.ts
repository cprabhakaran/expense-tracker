export type ExpenseSource = 'cash' | 'transfer';

export type Expense = {
  id: string;
  /** Transaction date as YYYY-MM-DD. */
  date: string;
  merchant: string;
  /** The raw text from the receipt or statement, kept for reference. */
  description: string;
  /** Money spent in cents. Refunds and incoming money are negative. */
  amountCents: number;
  currency: string;
  category: string;
  source: ExpenseSource;
  /** Identifies a statement row so re-importing the same file adds nothing. */
  importKey?: string | null;
  /** Storage path of the receipt photo, when there is one. */
  receiptPath?: string | null;
  notes?: string | null;
  createdAt: string;
};

export type NewExpense = Omit<Expense, 'id' | 'createdAt'>;
