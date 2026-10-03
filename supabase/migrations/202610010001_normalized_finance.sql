-- Normalized Picket domain. finance_snapshots remains available during migration.
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 120),
  avatar_url text check (avatar_url is null or avatar_url ~ '^https://'),
  onboarding_completed boolean not null default false,
  locale text not null default 'vi-VN' check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  timezone text not null default 'Asia/Ho_Chi_Minh' check (length(timezone) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  persona text not null default '' check (length(persona) <= 80),
  goal text not null default '' check (length(goal) <= 120),
  currency_code text not null default 'VND' check (currency_code ~ '^[A-Z]{3}$'),
  hide_balance boolean not null default false,
  notifications_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  opening_balance bigint not null default 0 check (abs(opening_balance) <= 9000000000000),
  currency_code text not null default 'VND' check (currency_code ~ '^[A-Z]{3}$'),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  kind text not null default 'expense' check (kind in ('expense','income','both')),
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  icon text check (icon is null or length(icon) <= 80),
  is_custom boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, name)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid not null,
  destination_wallet_id uuid,
  category_id uuid,
  refund_of uuid,
  title text not null check (length(trim(title)) between 1 and 160),
  amount bigint not null check (amount > 0 and amount <= 9000000000000),
  kind text not null check (kind in ('expense','income','transfer','refund')),
  occurred_at timestamptz not null,
  note text not null default '' check (length(note) <= 2000),
  reconciled_wallet_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  constraint transaction_wallet foreign key (user_id, wallet_id)
    references public.wallets(user_id, id),
  constraint transaction_destination foreign key (user_id, destination_wallet_id)
    references public.wallets(user_id, id),
  constraint transaction_category foreign key (user_id, category_id)
    references public.categories(user_id, id),
  constraint transaction_refund foreign key (user_id, refund_of)
    references public.transactions(user_id, id),
  constraint transfer_wallets check (
    (kind = 'transfer' and destination_wallet_id is not null and destination_wallet_id <> wallet_id)
    or (kind <> 'transfer' and destination_wallet_id is null)
  ),
  constraint refund_link check ((kind = 'refund') = (refund_of is not null))
);

create table public.transaction_splits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null,
  category_id uuid not null,
  amount bigint not null check (amount > 0 and amount <= 9000000000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint split_transaction foreign key (user_id, transaction_id)
    references public.transactions(user_id, id) on delete cascade,
  constraint split_category foreign key (user_id, category_id)
    references public.categories(user_id, id)
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 120),
  default_limit bigint not null check (default_limit > 0 and default_limit <= 9000000000000),
  alert_percent integer not null default 80 check (alert_percent between 1 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, category_id),
  constraint budget_category foreign key (user_id, category_id)
    references public.categories(user_id, id)
);

create table public.budget_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_id uuid not null,
  period_start date not null,
  period_end date not null,
  limit_amount bigint not null check (limit_amount > 0 and limit_amount <= 9000000000000),
  carried_amount bigint not null default 0 check (abs(carried_amount) <= 9000000000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, budget_id, period_start),
  constraint budget_period_owner foreign key (user_id, budget_id)
    references public.budgets(user_id, id) on delete cascade,
  constraint valid_budget_period check (period_end >= period_start)
);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paid_transaction_id uuid,
  title text not null check (length(trim(title)) between 1 and 160),
  amount bigint not null check (amount > 0 and amount <= 9000000000000),
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','paid','overdue','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  constraint bill_payment foreign key (user_id, paid_transaction_id)
    references public.transactions(user_id, id)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid,
  category_id uuid,
  title text not null check (length(trim(title)) between 1 and 160),
  amount bigint not null check (amount > 0 and amount <= 9000000000000),
  cadence text not null check (cadence in ('weekly','monthly','quarterly','yearly','custom')),
  next_due_at timestamptz not null,
  cycle_months integer not null default 1 check (cycle_months between 1 and 120),
  active boolean not null default true,
  note text not null default '' check (length(note) <= 2000),
  alert_days integer not null default 3 check (alert_days between 0 and 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  constraint subscription_wallet foreign key (user_id, wallet_id)
    references public.wallets(user_id, id),
  constraint subscription_category foreign key (user_id, category_id)
    references public.categories(user_id, id)
);

create table public.keepsakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid,
  title text not null check (length(trim(title)) between 1 and 160),
  amount bigint not null check (amount >= 0 and amount <= 9000000000000),
  purchased_at timestamptz not null,
  warranty_until date,
  return_until date,
  note text not null default '' check (length(note) <= 2000),
  category_name text not null default 'Khác' check (length(category_name) between 1 and 80),
  media_path text check (media_path is null or length(media_path) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  constraint keepsake_transaction foreign key (user_id, transaction_id)
    references public.transactions(user_id, id)
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid,
  storage_path text not null check (length(storage_path) between 1 and 500),
  merchant text check (merchant is null or length(merchant) <= 160),
  detected_total bigint check (detected_total is null or detected_total > 0),
  confidence numeric(5,4) check (confidence is null or confidence between 0 and 1),
  ocr_provider text not null default 'ml-kit' check (ocr_provider in ('ml-kit','pp-ocr','manual')),
  review_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  constraint receipt_transaction foreign key (user_id, transaction_id)
    references public.transactions(user_id, id)
);

create table public.month_closes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  closed_at timestamptz not null default now(),
  rollover_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(rollover_payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month_start),
  check (date_trunc('month', month_start)::date = month_start)
);

create table public.reconciliations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid not null,
  statement_balance bigint not null check (abs(statement_balance) <= 9000000000000),
  reconciled_at timestamptz not null default now(),
  period_end date not null,
  note text not null default '' check (length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reconciliation_wallet foreign key (user_id, wallet_id)
    references public.wallets(user_id, id)
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('bill','subscription','budget','custom')),
  target_id uuid,
  title text not null check (length(trim(title)) between 1 and 160),
  remind_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','sent','dismissed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transactions_user_occurred_idx on public.transactions(user_id, occurred_at desc);
create index transactions_wallet_idx on public.transactions(user_id, wallet_id);
create index transaction_splits_transaction_idx on public.transaction_splits(user_id, transaction_id);
create index budget_periods_period_idx on public.budget_periods(user_id, period_start);
create index bills_due_idx on public.bills(user_id, due_at);
create index subscriptions_due_idx on public.subscriptions(user_id, next_due_at);
create index receipts_transaction_idx on public.receipts(user_id, transaction_id);
create index reminders_due_idx on public.reminders(user_id, remind_at) where status = 'scheduled';

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','user_preferences','wallets','categories','transactions',
    'transaction_splits','budgets','budget_periods','bills','subscriptions',
    'keepsakes','receipts','month_closes','reconciliations','reminders'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end;
$$;

-- Profiles use id as ownership key; every other table exposes user_id.
create policy profiles_select on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy profiles_delete on public.profiles for delete to authenticated using ((select auth.uid()) = id);

create policy preferences_select on public.user_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy preferences_insert on public.user_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy preferences_update on public.user_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy preferences_delete on public.user_preferences for delete to authenticated using ((select auth.uid()) = user_id);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'wallets','categories','transactions','transaction_splits','budgets',
    'budget_periods','bills','subscriptions','keepsakes','receipts',
    'month_closes','reconciliations','reminders'
  ] loop
    execute format('create policy %I_select on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name, table_name);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name, table_name);
    execute format('create policy %I_update on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name, table_name);
    execute format('create policy %I_delete on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name, table_name);
  end loop;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','user_preferences','wallets','categories','transactions',
    'transaction_splits','budgets','budget_periods','bills','subscriptions',
    'keepsakes','receipts','month_closes','reconciliations','reminders'
  ] loop
    execute format(
      'create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name, table_name
    );
  end loop;
end;
$$;

create function public.check_transaction_split_total() returns trigger
language plpgsql set search_path = '' as $$
declare target_id uuid; target_user uuid; expected bigint; actual bigint;
begin
  target_id := coalesce(new.transaction_id, old.transaction_id);
  target_user := coalesce(new.user_id, old.user_id);
  select amount into expected from public.transactions
    where id = target_id and user_id = target_user;
  if expected is null then return null; end if;
  select coalesce(sum(amount), 0) into actual from public.transaction_splits
    where transaction_id = target_id and user_id = target_user;
  if actual <> 0 and actual <> expected then
    raise exception 'Transaction splits must equal transaction amount' using errcode = '23514';
  end if;
  return null;
end;
$$;

revoke all on function public.check_transaction_split_total() from public;
create constraint trigger transaction_split_total
after insert or update or delete on public.transaction_splits
deferrable initially deferred for each row execute function public.check_transaction_split_total();

create function public.complete_onboarding(
  display_name text,
  persona text,
  goal text,
  currency_code text,
  wallet_name text,
  opening_balance bigint,
  locale text default 'vi-VN',
  timezone text default 'Asia/Ho_Chi_Minh'
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare owner uuid := auth.uid(); wallet uuid;
begin
  if owner is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if length(trim(display_name)) not between 1 and 120 then raise exception 'Invalid display name' using errcode = '22023'; end if;
  if length(trim(wallet_name)) not between 1 and 80 then raise exception 'Invalid wallet name' using errcode = '22023'; end if;
  if currency_code !~ '^[A-Z]{3}$' then raise exception 'Invalid currency code' using errcode = '22023'; end if;
  if abs(opening_balance) > 9000000000000 then raise exception 'Invalid opening balance' using errcode = '22023'; end if;

  insert into public.profiles(id, display_name, onboarding_completed, locale, timezone)
    values(owner, trim(display_name), true, locale, timezone)
    on conflict(id) do update set
      display_name = excluded.display_name,
      onboarding_completed = true,
      locale = excluded.locale,
      timezone = excluded.timezone;
  insert into public.user_preferences(user_id, persona, goal, currency_code)
    values(owner, trim(persona), trim(goal), currency_code)
    on conflict(user_id) do update set
      persona = excluded.persona,
      goal = excluded.goal,
      currency_code = excluded.currency_code;

  select id into wallet from public.wallets where user_id = owner order by created_at limit 1;
  if wallet is null then
    insert into public.wallets(user_id, name, opening_balance, currency_code)
      values(owner, trim(wallet_name), opening_balance, currency_code)
      returning id into wallet;
  end if;
  return wallet;
end;
$$;

revoke all on function public.complete_onboarding(text,text,text,text,text,bigint,text,text) from public;
grant execute on function public.complete_onboarding(text,text,text,text,text,bigint,text,text) to authenticated;

create function public.current_profile() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id,
    'displayName', p.display_name,
    'avatarUrl', p.avatar_url,
    'onboardingCompleted', p.onboarding_completed,
    'locale', p.locale,
    'timezone', p.timezone,
    'persona', coalesce(up.persona, ''),
    'goal', coalesce(up.goal, ''),
    'currencyCode', coalesce(up.currency_code, 'VND'),
    'hideBalance', coalesce(up.hide_balance, false)
  ) from public.profiles p
  left join public.user_preferences up on up.user_id = p.id
  where p.id = auth.uid();
$$;

revoke all on function public.current_profile() from public;
grant execute on function public.current_profile() to authenticated;

create function public.load_normalized_finance() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'revision', floor(extract(epoch from p.updated_at) * 1000000)::bigint,
    'payload', jsonb_build_object(
      'version', 2,
      'name', p.display_name,
      'onboarded', p.onboarding_completed,
      'hideBalance', coalesce(up.hide_balance, false),
      'wallets', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', w.id::text, 'name', w.name, 'openingBalance', w.opening_balance
        ) order by w.created_at, w.id)
        from public.wallets w where w.user_id = p.id and w.archived_at is null
      ), '[]'::jsonb),
      'entries', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', t.id::text,
          'title', t.title,
          'amount', t.amount,
          'type', case when t.kind = 'refund' then 'income' else t.kind end,
          'walletId', t.wallet_id::text,
          'category', coalesce(c.name, 'Khác'),
          'date', t.occurred_at,
          'destinationId', t.destination_wallet_id::text,
          'note', t.note,
          'receiptPath', r.storage_path,
          'refundOf', t.refund_of::text,
          'parts', coalesce((
            select jsonb_agg(jsonb_build_object(
              'category', sc.name, 'amount', ts.amount, 'label', ''
            ) order by ts.created_at, ts.id)
            from public.transaction_splits ts
            join public.categories sc on sc.id = ts.category_id and sc.user_id = ts.user_id
            where ts.user_id = t.user_id and ts.transaction_id = t.id
          ), '[]'::jsonb),
          'reconciled', cardinality(t.reconciled_wallet_ids) > 0,
          'reconciledWalletIds', to_jsonb(t.reconciled_wallet_ids)
        ) order by t.occurred_at, t.id)
        from public.transactions t
        left join public.categories c on c.id = t.category_id and c.user_id = t.user_id
        left join public.receipts r on r.transaction_id = t.id and r.user_id = t.user_id
        where t.user_id = p.id
      ), '[]'::jsonb),
      'budgets', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', b.id::text,
          'category', c.name,
          'limit', b.default_limit,
          'alertPercent', b.alert_percent,
          'monthLimits', coalesce((
            select jsonb_object_agg(
              extract(year from bp.period_start)::int || '-' || extract(month from bp.period_start)::int,
              bp.limit_amount
            ) from public.budget_periods bp
            where bp.user_id = b.user_id and bp.budget_id = b.id
          ), '{}'::jsonb)
        ) order by b.created_at, b.id)
        from public.budgets b
        join public.categories c on c.id = b.category_id and c.user_id = b.user_id
        where b.user_id = p.id and b.active
      ), '[]'::jsonb),
      'bills', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', b.id::text, 'title', b.title, 'amount', b.amount,
          'dueDate', b.due_at, 'paidEntryId', b.paid_transaction_id::text
        ) order by b.due_at, b.id) from public.bills b where b.user_id = p.id
      ), '[]'::jsonb),
      'keepsakes', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', k.id::text, 'title', k.title, 'amount', k.amount,
          'date', k.purchased_at, 'note', k.note, 'photoPath', k.media_path,
          'category', k.category_name, 'warrantyUntil', k.warranty_until,
          'returnUntil', k.return_until
        ) order by k.purchased_at, k.id) from public.keepsakes k where k.user_id = p.id
      ), '[]'::jsonb),
      'subscriptions', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', s.id::text, 'name', s.title, 'amount', s.amount,
          'nextDate', s.next_due_at, 'cycleMonths', s.cycle_months,
          'active', s.active, 'note', s.note, 'alertDays', s.alert_days
        ) order by s.next_due_at, s.id) from public.subscriptions s where s.user_id = p.id
      ), '[]'::jsonb),
      'closedMonths', coalesce((
        select jsonb_agg(jsonb_build_object(
          'month', to_char(mc.month_start, 'YYYY-MM'),
          'income', coalesce((mc.rollover_payload->>'income')::bigint, 0),
          'expense', coalesce((mc.rollover_payload->>'expense')::bigint, 0),
          'note', coalesce(mc.rollover_payload->>'note', ''),
          'closedAt', mc.closed_at
        ) order by mc.month_start) from public.month_closes mc where mc.user_id = p.id
      ), '[]'::jsonb),
      'customCategories', coalesce((
        select jsonb_agg(c.name order by c.name) from public.categories c
        where c.user_id = p.id and c.is_custom and c.archived_at is null
      ), '[]'::jsonb),
      'preferences', jsonb_build_object(
        'goal', coalesce(up.goal, ''),
        'persona', coalesce(up.persona, ''),
        'currency', coalesce(up.currency_code, 'VND'),
        'notifications', coalesce(up.notifications_enabled, false)
      )
    )
  )
  from public.profiles p
  left join public.user_preferences up on up.user_id = p.id
  where p.id = auth.uid();
$$;

revoke all on function public.load_normalized_finance() from public;
grant execute on function public.load_normalized_finance() to authenticated;

create function public.save_normalized_finance(expected_revision bigint, new_payload jsonb)
returns bigint
language plpgsql security invoker set search_path = '' as $$
declare
  owner uuid := auth.uid();
  current_revision bigint;
  next_revision bigint;
  item jsonb;
  part jsonb;
  month_key text;
  category_name text;
begin
  if owner is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if jsonb_typeof(new_payload) <> 'object' or (new_payload->>'version')::int <> 2 then
    raise exception 'Invalid finance payload' using errcode = '22023';
  end if;

  select floor(extract(epoch from updated_at) * 1000000)::bigint
    into current_revision from public.profiles where id = owner for update;
  if current_revision is null then raise exception 'Profile not found' using errcode = '22023'; end if;
  if expected_revision <> current_revision and not (
    expected_revision = 0
    and not exists(select 1 from public.transactions where user_id = owner)
    and not exists(select 1 from public.budgets where user_id = owner)
  ) then
    raise exception 'Normalized finance conflict' using errcode = '40001';
  end if;

  delete from public.transaction_splits where user_id = owner;
  delete from public.receipts where user_id = owner;
  delete from public.bills where user_id = owner;
  delete from public.keepsakes where user_id = owner;
  delete from public.reminders where user_id = owner;
  delete from public.budget_periods where user_id = owner;
  delete from public.budgets where user_id = owner;
  delete from public.subscriptions where user_id = owner;
  delete from public.reconciliations where user_id = owner;
  delete from public.transactions where user_id = owner;
  delete from public.categories where user_id = owner;
  delete from public.wallets where user_id = owner;

  for item in select value from jsonb_array_elements(coalesce(new_payload->'wallets', '[]'::jsonb)) loop
    insert into public.wallets(id, user_id, name, opening_balance, currency_code)
    values(
      (item->>'id')::uuid, owner, trim(item->>'name'), (item->>'openingBalance')::bigint,
      coalesce(nullif(new_payload->'preferences'->>'currency', ''), 'VND')
    );
  end loop;

  for category_name in
    select distinct name from (
      select value #>> '{}' as name from jsonb_array_elements(coalesce(new_payload->'customCategories', '[]'::jsonb))
      union all
      select value->>'category' from jsonb_array_elements(coalesce(new_payload->'entries', '[]'::jsonb))
      union all
      select p->>'category' from jsonb_array_elements(coalesce(new_payload->'entries', '[]'::jsonb)) e,
        jsonb_array_elements(coalesce(e->'parts', '[]'::jsonb)) p
      union all
      select value->>'category' from jsonb_array_elements(coalesce(new_payload->'budgets', '[]'::jsonb))
    ) names where name is not null and trim(name) <> ''
  loop
    insert into public.categories(user_id, name, kind, is_custom)
    values(
      owner, trim(category_name), 'both',
      coalesce(new_payload->'customCategories', '[]'::jsonb) ? category_name
    );
  end loop;

  for item in select value from jsonb_array_elements(coalesce(new_payload->'entries', '[]'::jsonb))
    where value->>'refundOf' is null
  loop
    insert into public.transactions(
      id, user_id, wallet_id, destination_wallet_id, category_id, title,
      amount, kind, occurred_at, note, reconciled_wallet_ids
    ) values(
      (item->>'id')::uuid, owner, (item->>'walletId')::uuid,
      nullif(item->>'destinationId', '')::uuid,
      (select id from public.categories where user_id = owner and name = item->>'category'),
      trim(item->>'title'), (item->>'amount')::bigint, item->>'type',
      (item->>'date')::timestamptz, coalesce(item->>'note', ''),
      coalesce(array(select jsonb_array_elements_text(coalesce(item->'reconciledWalletIds', '[]'::jsonb))::uuid), '{}')
    );
  end loop;

  for item in select value from jsonb_array_elements(coalesce(new_payload->'entries', '[]'::jsonb))
    where value->>'refundOf' is not null
  loop
    insert into public.transactions(
      id, user_id, wallet_id, category_id, refund_of, title, amount, kind,
      occurred_at, note, reconciled_wallet_ids
    ) values(
      (item->>'id')::uuid, owner, (item->>'walletId')::uuid,
      (select id from public.categories where user_id = owner and name = item->>'category'),
      (item->>'refundOf')::uuid, trim(item->>'title'), (item->>'amount')::bigint,
      'refund', (item->>'date')::timestamptz, coalesce(item->>'note', ''),
      coalesce(array(select jsonb_array_elements_text(coalesce(item->'reconciledWalletIds', '[]'::jsonb))::uuid), '{}')
    );
  end loop;

  for item in select value from jsonb_array_elements(coalesce(new_payload->'entries', '[]'::jsonb)) loop
    for part in select value from jsonb_array_elements(coalesce(item->'parts', '[]'::jsonb)) loop
      insert into public.transaction_splits(user_id, transaction_id, category_id, amount)
      values(
        owner, (item->>'id')::uuid,
        (select id from public.categories where user_id = owner and name = part->>'category'),
        (part->>'amount')::bigint
      );
    end loop;
    if nullif(item->>'receiptPath', '') is not null then
      insert into public.receipts(user_id, transaction_id, storage_path, review_required)
      values(owner, (item->>'id')::uuid, item->>'receiptPath', false);
    end if;
  end loop;

  for item in select value from jsonb_array_elements(coalesce(new_payload->'budgets', '[]'::jsonb)) loop
    insert into public.budgets(id, user_id, category_id, name, default_limit, alert_percent)
    values(
      (item->>'id')::uuid, owner,
      (select id from public.categories where user_id = owner and name = item->>'category'),
      item->>'category', (item->>'limit')::bigint, coalesce((item->>'alertPercent')::int, 80)
    );
    for month_key in select key from jsonb_each(coalesce(item->'monthLimits', '{}'::jsonb)) loop
      insert into public.budget_periods(user_id, budget_id, period_start, period_end, limit_amount)
      values(
        owner, (item->>'id')::uuid, (month_key || '-01')::date,
        ((month_key || '-01')::date + interval '1 month - 1 day')::date,
        (item->'monthLimits'->>month_key)::bigint
      );
    end loop;
  end loop;

  for item in select value from jsonb_array_elements(coalesce(new_payload->'bills', '[]'::jsonb)) loop
    insert into public.bills(id, user_id, paid_transaction_id, title, amount, due_at, status)
    values(
      (item->>'id')::uuid, owner, nullif(item->>'paidEntryId', '')::uuid,
      trim(item->>'title'), (item->>'amount')::bigint, (item->>'dueDate')::timestamptz,
      case when item->>'paidEntryId' is null then 'pending' else 'paid' end
    );
  end loop;

  for item in select value from jsonb_array_elements(coalesce(new_payload->'subscriptions', '[]'::jsonb)) loop
    insert into public.subscriptions(
      id, user_id, title, amount, cadence, next_due_at, cycle_months, active, note, alert_days
    ) values(
      (item->>'id')::uuid, owner, trim(item->>'name'), (item->>'amount')::bigint,
      case (item->>'cycleMonths')::int when 1 then 'monthly' when 3 then 'quarterly' when 12 then 'yearly' else 'custom' end,
      (item->>'nextDate')::timestamptz, (item->>'cycleMonths')::int,
      coalesce((item->>'active')::boolean, true), coalesce(item->>'note', ''),
      coalesce((item->>'alertDays')::int, 3)
    );
  end loop;

  for item in select value from jsonb_array_elements(coalesce(new_payload->'keepsakes', '[]'::jsonb)) loop
    insert into public.keepsakes(
      id, user_id, title, amount, purchased_at, warranty_until, return_until,
      note, category_name, media_path
    ) values(
      (item->>'id')::uuid, owner, trim(item->>'title'), (item->>'amount')::bigint,
      (item->>'date')::timestamptz, nullif(item->>'warrantyUntil', '')::date,
      nullif(item->>'returnUntil', '')::date, coalesce(item->>'note', ''),
      coalesce(nullif(item->>'category', ''), 'Khác'), nullif(item->>'photoPath', '')
    );
  end loop;

  for item in select value from jsonb_array_elements(coalesce(new_payload->'closedMonths', '[]'::jsonb)) loop
    insert into public.month_closes(user_id, month_start, closed_at, rollover_payload)
    values(
      owner, ((item->>'month') || '-01')::date, (item->>'closedAt')::timestamptz,
      jsonb_build_object('income', (item->>'income')::bigint, 'expense', (item->>'expense')::bigint, 'note', coalesce(item->>'note', ''))
    );
  end loop;

  update public.profiles set
    display_name = trim(new_payload->>'name'),
    onboarding_completed = coalesce((new_payload->>'onboarded')::boolean, false),
    updated_at = clock_timestamp()
  where id = owner
  returning floor(extract(epoch from updated_at) * 1000000)::bigint into next_revision;

  insert into public.user_preferences(
    user_id, persona, goal, currency_code, hide_balance, notifications_enabled
  ) values(
    owner, coalesce(new_payload->'preferences'->>'persona', ''),
    coalesce(new_payload->'preferences'->>'goal', ''),
    coalesce(nullif(new_payload->'preferences'->>'currency', ''), 'VND'),
    coalesce((new_payload->>'hideBalance')::boolean, false),
    coalesce((new_payload->'preferences'->>'notifications')::boolean, false)
  ) on conflict(user_id) do update set
    persona = excluded.persona, goal = excluded.goal,
    currency_code = excluded.currency_code, hide_balance = excluded.hide_balance,
    notifications_enabled = excluded.notifications_enabled;

  return next_revision;
end;
$$;

revoke all on function public.save_normalized_finance(bigint,jsonb) from public;
grant execute on function public.save_normalized_finance(bigint,jsonb) to authenticated;

-- One-time backfill for projects that already contain the legacy snapshot table.
do $$
declare
  legacy record;
  profile_revision bigint;
begin
  for legacy in
    select user_id, payload from public.finance_snapshots order by user_id
  loop
    perform set_config('request.jwt.claim.sub', legacy.user_id::text, true);
    insert into public.profiles(id, display_name, onboarding_completed)
    values(
      legacy.user_id,
      coalesce(legacy.payload->>'name', ''),
      coalesce((legacy.payload->>'onboarded')::boolean, false)
    ) on conflict(id) do nothing;
    select floor(extract(epoch from updated_at) * 1000000)::bigint
      into profile_revision from public.profiles where id = legacy.user_id;
    perform public.save_normalized_finance(profile_revision, legacy.payload);
  end loop;
  perform set_config('request.jwt.claim.sub', '', true);
end;
$$;
