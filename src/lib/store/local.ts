import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Expense } from '../types';
import type { ExpenseStore } from './types';

const KEY = 'expenses:v1';

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readAll(): Promise<Expense[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Expense[]) : [];
}

async function writeAll(expenses: Expense[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(expenses));
}

/** Keeps expenses on this device only. Used when no Supabase project is configured. */
export const localStore: ExpenseStore = {
  list: readAll,
  async add(items) {
    const now = new Date().toISOString();
    const created = items.map((item) => ({ ...item, id: newId(), createdAt: now }));
    await writeAll([...(await readAll()), ...created]);
    return created;
  },
  async update(id, changes) {
    await writeAll((await readAll()).map((e) => (e.id === id ? { ...e, ...changes } : e)));
  },
  async remove(id) {
    await writeAll((await readAll()).filter((e) => e.id !== id));
  },
};
