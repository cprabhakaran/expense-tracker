import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Slice } from '@/lib/summary';

/** Horizontal bars, one per row, with the label and value as text beside the bar. */
export function BarList({ slices, format }: { slices: Slice[]; format: (cents: number) => string }) {
  const theme = useTheme();
  const max = Math.max(...slices.map((s) => s.cents), 1);
  return (
    <View style={styles.list} accessibilityRole="list">
      {slices.map((slice) => (
        <View key={slice.label} style={styles.row} accessible accessibilityLabel={`${slice.label}: ${format(slice.cents)}`}>
          <View style={styles.rowText}>
            <ThemedText type="small" numberOfLines={1} style={styles.label}>
              {slice.label}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {format(slice.cents)}
            </ThemedText>
          </View>
          <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
            <View style={[styles.bar, { width: `${(slice.cents / max) * 100}%`, backgroundColor: theme.tint }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Vertical bars for a short run of months, with each month labelled underneath. */
export function TrendBars({
  slices,
  labelOf,
  format,
  highlight,
}: {
  slices: Slice[];
  labelOf: (slice: Slice) => string;
  format: (cents: number) => string;
  highlight: string;
}) {
  const theme = useTheme();
  const max = Math.max(...slices.map((s) => s.cents), 1);
  return (
    <View style={styles.trend}>
      {slices.map((slice) => (
        <View key={slice.label} style={styles.column} accessible accessibilityLabel={`${labelOf(slice)}: ${format(slice.cents)}`}>
          <View style={styles.columnArea}>
            <View
              style={[
                styles.columnBar,
                {
                  height: `${Math.max((slice.cents / max) * 100, slice.cents > 0 ? 2 : 0)}%`,
                  backgroundColor: theme.tint,
                  opacity: slice.label === highlight ? 1 : 0.45,
                },
              ]}
            />
          </View>
          <ThemedText type="small" themeColor={slice.label === highlight ? 'text' : 'textSecondary'}>
            {labelOf(slice)}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two },
  row: { gap: Spacing.one },
  rowText: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  label: { flexShrink: 1 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4 },
  trend: { flexDirection: 'row', gap: Spacing.two, height: 140 },
  column: { flex: 1, alignItems: 'center', gap: Spacing.one },
  columnArea: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  columnBar: { width: '70%', maxWidth: 56, alignSelf: 'center', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
});
