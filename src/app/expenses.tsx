import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ExpenseForm } from '@/components/expense-form';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chip, Message, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { countsAsSpending } from '@/lib/categories';
import { formatDate } from '@/lib/dates';
import { useExpenses } from '@/lib/expenses-context';
import { formatCents } from '@/lib/money';
import { supabase } from '@/lib/supabase';
import type { Expense } from '@/lib/types';

type Filter = 'all' | 'cash' | 'transfer';

export default function ExpensesScreen() {
  const { expenses, update, remove, loading } = useExpenses();
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Expense | null>(null);

  if (editing) {
    return (
      <Screen title="Edit expense">
        <Card>
          <ExpenseForm
            initial={{
              merchant: editing.merchant,
              date: formatDate(editing.date),
              amount: (Math.abs(editing.amountCents) / 100).toFixed(2),
              category: editing.category,
              notes: editing.notes ?? '',
            }}
            source={editing.source}
            saveLabel="Save changes"
            onCancel={() => setEditing(null)}
            onSave={async (changes) => {
              // Keep the sign so refunds and income stay negative.
              const amountCents = editing.amountCents < 0 ? -changes.amountCents : changes.amountCents;
              await update(editing.id, { ...changes, amountCents, description: editing.description });
              setEditing(null);
            }}
          />
        </Card>
        <Button
          label="Delete expense"
          variant="danger"
          onPress={async () => {
            await remove(editing.id);
            setEditing(null);
          }}
        />
      </Screen>
    );
  }

  const shown = expenses.filter((e) => filter === 'all' || e.source === filter);
  return (
    <Screen title="Expenses">
      <View style={styles.filters}>
        <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="Cash" selected={filter === 'cash'} onPress={() => setFilter('cash')} />
        <Chip label="Card and transfers" selected={filter === 'transfer'} onPress={() => setFilter('transfer')} />
      </View>
      {!loading && shown.length === 0 ? <Message text="Nothing here yet." /> : null}
      <Card>
        {shown.map((e) => (
          <Pressable key={e.id} onPress={() => setEditing(e)} accessibilityRole="button" style={styles.row}>
            <View style={styles.text}>
              <ThemedText type="small" numberOfLines={1}>
                {e.merchant}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatDate(e.date)} · {e.category} · {e.source === 'cash' ? 'Cash' : 'Card/transfer'}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor={countsAsSpending(e.category) ? 'text' : 'textSecondary'}>
              {e.amountCents < 0 ? '+' : ''}
              {formatCents(Math.abs(e.amountCents))}
            </ThemedText>
          </Pressable>
        ))}
      </Card>
      {supabase ? <Button label="Sign out" variant="secondary" onPress={() => supabase!.auth.signOut()} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two, paddingVertical: Spacing.one },
  text: { flexShrink: 1 },
});
