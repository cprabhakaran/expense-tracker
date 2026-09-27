import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { emptyDraft, ExpenseForm, type ExpenseDraft } from '@/components/expense-form';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Message, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatDate } from '@/lib/dates';
import { useExpenses } from '@/lib/expenses-context';
import { formatCents } from '@/lib/money';
import { canScanReceipts, scanReceipt, uploadReceiptPhoto } from '@/lib/receipt';
import { parseStatement, type StatementTransaction } from '@/lib/statement';
import { readWorkbook } from '@/lib/statement-file';

type Photo = { base64: string; mediaType: string };

export default function AddScreen() {
  const { add, importStatement, expenses } = useExpenses();
  const [draft, setDraft] = useState<ExpenseDraft | null>(null);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<StatementTransaction[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone?: 'error' } | null>(null);

  async function pickReceipt(useCamera: boolean) {
    setMessage(null);
    if (useCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return setMessage({ text: 'Allow camera access to photograph receipts.', tone: 'error' });
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], base64: true, quality: 0.6 };
    const result = useCamera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? null : result.assets[0];
    if (!asset?.base64) return;

    const picked = { base64: asset.base64, mediaType: asset.mimeType ?? 'image/jpeg' };
    setPhoto(picked);
    setScanning(true);
    try {
      const scanned = await scanReceipt(picked.base64, picked.mediaType);
      if (!scanned.is_receipt) setMessage({ text: "That photo doesn't look like a receipt. Check the details below.", tone: 'error' });
      setDraft({
        merchant: scanned.merchant,
        date: scanned.date ? formatDate(scanned.date) : emptyDraft().date,
        amount: scanned.total ? scanned.total.toFixed(2) : '',
        category: scanned.category,
        notes: scanned.items.map((i) => `${i.name} ${i.amount.toFixed(2)}`).join(', '),
      });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : 'The receipt could not be read.', tone: 'error' });
      setDraft(emptyDraft());
    } finally {
      setScanning(false);
    }
  }

  async function pickStatement() {
    setMessage(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'text/comma-separated-values',
      ],
      copyToCacheDirectory: true,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    try {
      const bytes = Platform.OS === 'web' && asset.file ? await asset.file.arrayBuffer() : await new File(asset.uri).arrayBuffer();
      const transactions = parseStatement(readWorkbook(bytes));
      if (transactions.length === 0) {
        return setMessage({ text: 'No transactions were found. The file needs Date, Details and Amount columns.', tone: 'error' });
      }
      setPreview(transactions);
    } catch {
      setMessage({ text: 'That file could not be read. Try an .xls, .xlsx or .csv export.', tone: 'error' });
    }
  }

  async function confirmImport() {
    if (!preview) return;
    setImporting(true);
    try {
      const { added, skipped } = await importStatement(preview);
      setPreview(null);
      setMessage({ text: `Imported ${added} transactions.${skipped ? ` Skipped ${skipped} already in your expenses.` : ''}` });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : 'The import failed.', tone: 'error' });
    } finally {
      setImporting(false);
    }
  }

  function reset(text?: string) {
    setDraft(null);
    setPhoto(null);
    setMessage(text ? { text } : null);
  }

  if (draft) {
    return (
      <Screen title={photo ? 'Check the receipt' : 'Add a cash expense'}>
        {message ? <Message {...message} /> : null}
        <Card>
          <ExpenseForm
            initial={draft}
            source="cash"
            onCancel={() => reset()}
            onSave={async (expense) => {
              const receiptPath = photo ? await uploadReceiptPhoto(photo.base64, photo.mediaType) : null;
              await add({ ...expense, receiptPath });
              reset(`Saved ${expense.merchant}.`);
            }}
          />
        </Card>
      </Screen>
    );
  }

  if (preview) {
    const known = new Set(expenses.map((e) => e.importKey));
    const fresh = preview.filter((t) => !known.has(t.importKey));
    return (
      <Screen title="Import statement">
        <Card>
          <ThemedText type="small">
            Found {preview.length} transactions. {fresh.length} are new
            {preview.length - fresh.length ? ` and ${preview.length - fresh.length} are already in your expenses` : ''}.
          </ThemedText>
          {fresh.slice(0, 50).map((t) => (
            <View key={t.importKey} style={styles.previewRow}>
              <View style={styles.previewText}>
                <ThemedText type="small" numberOfLines={1}>
                  {t.merchant}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatDate(t.date)}
                </ThemedText>
              </View>
              <ThemedText type="small">{formatCents(t.amountCents)}</ThemedText>
            </View>
          ))}
          {fresh.length > 50 ? <Message text={`And ${fresh.length - 50} more.`} /> : null}
        </Card>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button label="Cancel" variant="secondary" onPress={() => setPreview(null)} />
          </View>
          <View style={styles.flex}>
            <Button label={`Import ${fresh.length}`} onPress={confirmImport} busy={importing} disabled={fresh.length === 0} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Add expenses">
      {message ? <Message {...message} /> : null}
      <Card title="Cash: scan a receipt">
        <Message
          text={
            canScanReceipts
              ? 'Take or choose a photo. The merchant, date, total and category are filled in for you to check.'
              : 'Receipt scanning needs the Supabase backend. You can still type cash expenses in.'
          }
        />
        {canScanReceipts ? (
          <View style={styles.row}>
            {Platform.OS !== 'web' ? (
              <View style={styles.flex}>
                <Button label="Take photo" onPress={() => pickReceipt(true)} busy={scanning} />
              </View>
            ) : null}
            <View style={styles.flex}>
              <Button label="Choose photo" variant={Platform.OS === 'web' ? 'primary' : 'secondary'} onPress={() => pickReceipt(false)} busy={scanning} />
            </View>
          </View>
        ) : null}
        <Button label="Type it in" variant="secondary" onPress={() => setDraft(emptyDraft())} />
      </Card>
      <Card title="Card and transfers: import a statement">
        <Message text="Upload your bank's Excel or CSV export. Transactions already imported are skipped." />
        <Button label="Choose statement file" onPress={pickStatement} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  previewText: { flexShrink: 1 },
});
