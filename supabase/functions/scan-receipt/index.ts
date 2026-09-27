// Reads a receipt photo with Claude and returns the fields for the app to show for review.
// Runs as a Supabase Edge Function so the Anthropic API key never reaches the app.
import Anthropic from 'npm:@anthropic-ai/sdk@^0.128.0';
import { betaZodOutputFormat } from 'npm:@anthropic-ai/sdk@^0.128.0/helpers/beta/zod';
import { z } from 'npm:zod@^4';

const Receipt = z.object({
  is_receipt: z.boolean().describe('False when the photo is not a receipt or bill.'),
  merchant: z.string().describe('Store or business name as printed, without the address.'),
  date: z.string().describe('Purchase date as YYYY-MM-DD, or an empty string if not shown.'),
  total: z.number().describe('Final amount paid, including tax and after discounts.'),
  tax: z.number().nullable().describe('GST or other tax shown on the receipt, if any.'),
  currency: z.string().describe('ISO currency code, e.g. AUD.'),
  category: z.enum([
    'Groceries',
    'Dining & cafes',
    'Transport',
    'Shopping',
    'Bills & utilities',
    'Health',
    'Entertainment',
    'Subscriptions',
    'Fees & interest',
    'Other',
  ]),
  items: z.array(z.object({ name: z.string(), amount: z.number() })).describe('Line items, if legible.'),
});

const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

const client = new Anthropic();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  const { imageBase64, mediaType } = await req.json().catch(() => ({}));
  if (typeof imageBase64 !== 'string' || !MEDIA_TYPES.includes(mediaType)) {
    return json({ error: 'Send imageBase64 and a mediaType of jpeg, png, webp or gif.' }, 400);
  }

  try {
    const response = await client.beta.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 4096,
      // Re-runs the request on Anthropic's recommended model if a safety classifier declines it.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: betaZodOutputFormat(Receipt) },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            {
              type: 'text',
              text:
                'Read this receipt for a personal expense tracker in Australia. Use the total the ' +
                'customer actually paid. Dates on Australian receipts are day first.',
            },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal' || !response.parsed_output) {
      return json({ error: 'The receipt could not be read. Enter the details by hand.' }, 422);
    }
    return json(response.parsed_output);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'Too many scans right now. Try again shortly.' }, 429);
    if (error instanceof Anthropic.APIError) return json({ error: `Receipt reader error (${error.status}).` }, 502);
    throw error;
  }
});
