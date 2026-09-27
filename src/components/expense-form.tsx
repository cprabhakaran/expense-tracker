import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { Button, Chip, Field, Message } from './ui';

import { Spacing } from '@/constants/theme';
import { CATEGORIES } from '@/lib/categories';
import { formatDate, parseStatementDate, todayIso } from '@/lib/dates';
import { parseAmountCents } from '@/lib/money';
import type { NewExpense } from '@/lib/types';

export type ExpenseDraft = {
  merchant: string;
  date: string;
  amount: string;
  category: string;
  notes: string;
};

export function emptyDraft(): ExpenseDraft {
  return { merchant: '', date: formatDate(todayIso()), amount: '', category: 'Other', notes: '' };
}

type Props = {
  initial: ExpenseDraft;
  source: NewExpense['source'];
  saveLabel?: string;
  onSave: (expense: NewExpense) => Promise<void>;
  onCancel?: () => void;
  extra?: Partial<NewExpense>;
};

/** Lets the user check or type an expense before it is saved. */
export function ExpenseForm({ initial, source, saveLabel = 'Save expense', onSave, onCancel, extra }: Props) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof ExpenseDraft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));

  async function save() {
    const date = parseStatementDate(draft.date);
    const amountCents = parseAmountCents(draft.amount);
    if (!draft.merchant.trim()) return setError('Enter where the money was spent.');
    if (!date) return setError('Enter the date as DD/MM/YYYY.');
    if (amountCents === null || amountCents === 0) return setError('Enter the amount, for example 12.50.');
    setError(null);
    setSaving(true);
    try {
      await onSave({
        merchant: draft.merchant.trim(),
        description: draft.merchant.trim(),
        date,
        amountCents: Math.abs(amountCents),
        currency: 'AUD',
        category: draft.category,
        source,
        notes: draft.notes.trim() || null,
        ...extra,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the expense.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.form}>
      <Field label="Merchant" value={draft.merchant} onChangeText={set('merchant')} placeholder="e.g. Corner Cafe" />
      <View style={styles.row}>
        <View style={styles.half}>
          <Field label="Date" value={draft.date} onChangeText={set('date')} placeholder="DD/MM/YYYY" />
        </View>
        <View style={styles.half}>
          <Field label="Amount" value={draft.amount} onChangeText={set('amount')} keyboardType="decimal-pad" placeholder="0.00" />
        </View>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Category
      </ThemedText>
      <View style={styles.chips}>
        {CATEGORIES.filter((c) => c !== 'Income & refunds').map((c) => (
          <Chip key={c} label={c} selected={draft.category === c} onPress={() => set('category')(c)} />
        ))}
      </View>
      <Field label="Notes (optional)" value={draft.notes} onChangeText={set('notes')} />
      {error ? <Message text={error} tone="error" /> : null}
      <View style={styles.row}>
        {onCancel ? (
          <View style={styles.half}>
            <Button label="Cancel" variant="secondary" onPress={onCancel} />
          </View>
        ) : null}
        <View style={styles.half}>
          <Button label={saveLabel} onPress={save} busy={saving} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
});
