import type { SupabaseClient } from '@supabase/supabase-js';

import type { Expense, NewExpense } from '../types';
import type { ExpenseStore } from './types';

type Row = {
  id: string;
  date: string;
  merchant: string;
  description: string;
  amount_cents: number;
  currency: string;
  category: string;
  source: Expense['source'];
  import_key: string | null;
  receipt_path: string | null;
  notes: string | null;
  created_at: string;
};

function fromRow(row: Row): Expense {
  return {
    id: row.id,
    date: row.date,
    merchant: row.merchant,
    description: row.description,
    amountCents: row.amount_cents,
    currency: row.currency,
    category: row.category,
    source: row.source,
    importKey: row.import_key,
    receiptPath: row.receipt_path,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function toRow(e: Partial<NewExpense>): Partial<Row> {
  const row: Partial<Row> = {};
  if (e.date !== undefined) row.date = e.date;
  if (e.merchant !== undefined) row.merchant = e.merchant;
  if (e.description !== undefined) row.description = e.description;
  if (e.amountCents !== undefined) row.amount_cents = e.amountCents;
  if (e.currency !== undefined) row.currency = e.currency;
  if (e.category !== undefined) row.category = e.category;
  if (e.source !== undefined) row.source = e.source;
  if (e.importKey !== undefined) row.import_key = e.importKey;
  if (e.receiptPath !== undefined) row.receipt_path = e.receiptPath;
  if (e.notes !== undefined) row.notes = e.notes;
  return row;
}

/** Stores expenses in the signed-in user's rows of the `expenses` table. */
export function supabaseStore(client: SupabaseClient): ExpenseStore {
  return {
    async list() {
      const { data, error } = await client.from('expenses').select('*').order('date', { ascending: false });
      if (error) throw error;
      return (data as Row[]).map(fromRow);
    },
    async add(items) {
      if (items.length === 0) return [];
      // Rows already imported are skipped by the unique (user_id, import_key) index.
      const { data, error } = await client
        .from('expenses')
        .upsert(items.map(toRow), { onConflict: 'user_id,import_key', ignoreDuplicates: true })
        .select('*');
      if (error) throw error;
      return (data as Row[]).map(fromRow);
    },
    async update(id, changes) {
      const { error } = await client.from('expenses').update(toRow(changes)).eq('id', id);
      if (error) throw error;
    },
    async remove(id) {
      const { error } = await client.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
  };
}
