# Expense Tracker

A personal expense tracker that runs on the web, iOS and Android from one Expo codebase.

- **Cash:** photograph a receipt and Claude reads the merchant, date, total and category for you to check before saving.
- **Card and transfers:** import your bank's Excel (.xls/.xlsx) or CSV export. Statements converted from PDF work too, and rows you've already imported are skipped.
- **Dashboard:** monthly spending against the previous month, cash vs card, spending by category, a six-month trend and top merchants. Buy Now Pay Later repayments (StepPay, Afterpay and so on) and incoming money are shown but left out of spending totals.

## Use it on the web

The web app is published to GitHub Pages at **https://cprabhakaran.github.io/expense-tracker/** every time `main` changes (see `.github/workflows/deploy-web.yml`). To turn this on once, go to the repository's **Settings > Pages** and set **Source** to **GitHub Actions**.

Until Supabase is connected, each browser keeps its own expenses. To make the site sync, add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` under **Settings > Secrets and variables > Actions > Variables**, then re-run the workflow.

## Run it

```bash
npm install
npx expo start        # press w for web, or scan the QR code with Expo Go on your phone
```

With no configuration the app keeps expenses on the device, with no sign-in and no receipt scanning. That's enough to try the statement import and dashboard.

## Connect Supabase (sync, sign-in and receipt scanning)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/migrations/20260927000000_expenses.sql`](supabase/migrations/20260927000000_expenses.sql). It creates the `expenses` table and the private `receipts` photo bucket, each limited to the signed-in user.
3. Sign-in uses a six-digit email code. Under **Authentication > Emails > Magic Link**, make sure the template includes `{{ .Token }}`.
4. Copy `.env.example` to `.env.local` and fill in the project URL and anon key from **Project Settings > API**.
5. Deploy the receipt reader and give it an [Anthropic API key](https://console.anthropic.com/):

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   npx supabase functions deploy scan-receipt
   ```

The API key stays on Supabase and never ships in the app.

## Develop

```bash
npm test              # statement parser, amounts, dates and dashboard maths
npm run typecheck
npm run lint
```

- `src/app/` has the three screens (Dashboard, Add, Expenses).
- `src/lib/statement.ts` finds the Date, Details, Amount and Balance columns on every sheet, so PDF conversions with shifting columns still import cleanly.
- `src/lib/categories.ts` has the category rules. Add merchants there to improve automatic categories.
- `supabase/functions/scan-receipt/` is the Edge Function that sends receipt photos to Claude.

Store builds for iOS and Android go through [EAS Build](https://docs.expo.dev/build/introduction/).
