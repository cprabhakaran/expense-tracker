import { RECEIPTS_BUCKET, supabase } from './supabase';

export type ScannedReceipt = {
  is_receipt: boolean;
  merchant: string;
  date: string;
  total: number;
  tax: number | null;
  currency: string;
  category: string;
  items: { name: string; amount: number }[];
};

export const canScanReceipts = supabase !== null;

/** Sends a receipt photo to the scan-receipt function, which reads it with Claude. */
export async function scanReceipt(imageBase64: string, mediaType: string): Promise<ScannedReceipt> {
  if (!supabase) throw new Error('Receipt scanning needs the Supabase backend. Enter the details by hand.');
  const { data, error } = await supabase.functions.invoke<ScannedReceipt>('scan-receipt', {
    body: { imageBase64, mediaType },
  });
  if (error || !data) {
    const message = await (error as { context?: Response })?.context?.json?.().catch(() => null);
    throw new Error(message?.error ?? 'The receipt could not be read. Enter the details by hand.');
  }
  return data;
}

/** Uploads the photo under the user's folder and returns its storage path. */
export async function uploadReceiptPhoto(imageBase64: string, mediaType: string): Promise<string | null> {
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const extension = mediaType.split('/')[1] ?? 'jpg';
  const path = `${auth.user.id}/${Date.now()}.${extension}`;
  const bytes = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
  const { error } = await supabase.storage.from(RECEIPTS_BUCKET).upload(path, bytes, { contentType: mediaType });
  return error ? null : path;
}
