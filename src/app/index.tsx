import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BarList, TrendBars } from '@/components/charts';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Message, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatDate, monthKey, monthLabel, shiftMonth, todayIso } from '@/lib/dates';
import { useExpenses } from '@/lib/expenses-context';
import { formatCents } from '@/lib/money';
import { latestMonth, summarizeMonth } from '@/lib/summary';

export default function DashboardScreen() {
  const { expenses, loading, error, isLocalOnly } = useExpenses();
  const [pickedMonth, setPickedMonth] = useState<string | null>(null);
  const month = pickedMonth ?? latestMonth(expenses, monthKey(todayIso()));
  const summary = useMemo(() => summarizeMonth(expenses, month), [expenses, month]);
  const recent = expenses.filter((e) => monthKey(e.date) === month).slice(0, 5);

  const change = summary.spentCents - summary.previousSpentCents;
  const changeText =
    summary.previousSpentCents === 0
      ? 'Nothing recorded the month before'
      : `${formatCents(Math.abs(change))} ${change >= 0 ? 'more' : 'less'} than ${monthLabel(shiftMonth(month, -1), 'short')}`;

  return (
    <Screen title="Dashboard">
      {isLocalOnly ? (
        <Message text="Expenses are saved on this device only. Connect Supabase to sync them and scan receipts." />
      ) : null}
      {error ? <Message text={error} tone="error" /> : null}

      <View style={styles.monthRow}>
        <View style={styles.monthButton}>
          <Button label="‹" variant="secondary" onPress={() => setPickedMonth(shiftMonth(month, -1))} />
        </View>
        <ThemedText type="smallBold" style={styles.monthLabel}>
          {monthLabel(month)}
        </ThemedText>
        <View style={styles.monthButton}>
          <Button label="›" variant="secondary" onPress={() => setPickedMonth(shiftMonth(month, 1))} />
        </View>
      </View>

      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          Spent
        </ThemedText>
        <ThemedText type="subtitle">{formatCents(summary.spentCents)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {changeText}
        </ThemedText>
      </Card>

      <View style={styles.tiles}>
        <Tile label="Cash (receipts)" value={formatCents(summary.cashCents)} />
        <Tile label="Card and transfers" value={formatCents(summary.transferCents)} />
        <Tile label="Buy Now Pay Later repaid" value={formatCents(summary.bnplCents)} note="Not counted as spending" />
      </View>

      {loading ? null : summary.count === 0 ? (
        <Card>
          <Message text="No expenses this month yet. Add a receipt or import a bank statement from the Add tab." />
        </Card>
      ) : (
        <>
          <Card title="Spending by category">
            <BarList slices={summary.byCategory} format={(c) => formatCents(c)} />
          </Card>
          <Card title="Last six months">
            <TrendBars
              slices={summary.trend}
              highlight={month}
              labelOf={(s) => monthLabel(s.label, 'short')}
              format={(c) => formatCents(c)}
            />
          </Card>
          <Card title="Top merchants">
            <BarList slices={summary.topMerchants} format={(c) => formatCents(c)} />
          </Card>
          <Card title="Recent">
            {recent.map((e) => (
              <View key={e.id} style={styles.recentRow}>
                <View style={styles.recentText}>
                  <ThemedText type="small" numberOfLines={1}>
                    {e.merchant}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatDate(e.date)} · {e.category}
                  </ThemedText>
                </View>
                <ThemedText type="small">{formatCents(e.amountCents)}</ThemedText>
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View style={styles.tile}>
      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText type="smallBold">{value}</ThemedText>
        {note ? (
          <ThemedText type="small" themeColor="textSecondary">
            {note}
          </ThemedText>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  monthButton: { width: 48 },
  monthLabel: { flex: 1, textAlign: 'center' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: { flexGrow: 1, flexBasis: 160 },
  recentRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  recentText: { flexShrink: 1 },
});
