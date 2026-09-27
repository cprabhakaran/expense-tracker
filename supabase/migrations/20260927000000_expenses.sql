-- Expenses recorded from receipt photos (cash) and bank statement imports (transfers).
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  merchant text not null,
  description text not null default '',
  -- Money spent in cents; refunds and income are negative.
  amount_cents bigint not null,
  currency text not null default 'AUD',
  category text not null default 'Other',
  source text not null check (source in ('cash', 'transfer')),
  -- Identifies a statement row so importing an overlapping statement adds nothing twice.
  import_key text,
  receipt_path text,
  notes text,
  created_at timestamptz not null default now(),
  constraint expenses_user_import_key unique (user_id, import_key)
);

create index expenses_user_date on public.expenses (user_id, date desc);

alter table public.expenses enable row level security;

create policy "Users manage their own expenses" on public.expenses
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Receipt photos, stored under a folder named after the user's id.
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false);

create policy "Users manage their own receipt photos" on storage.objects
  for all to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
