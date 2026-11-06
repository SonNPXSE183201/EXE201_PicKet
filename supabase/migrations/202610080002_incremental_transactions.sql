-- Incremental category and transaction persistence for the Dart REST API.
alter table public.categories
  add column row_version bigint not null default 1
    check (row_version > 0);

alter table public.transactions
  add column row_version bigint not null default 1
    check (row_version > 0),
  add column deleted_at timestamptz;

create trigger categories_increment_version
before update on public.categories
for each row execute function public.increment_row_version();

create trigger transactions_increment_version
before update on public.transactions
for each row execute function public.increment_row_version();

create index categories_active_owner_idx
  on public.categories(user_id, kind, name, id)
  where archived_at is null;

create index transactions_active_owner_occurred_idx
  on public.transactions(user_id, occurred_at desc, id desc)
  where deleted_at is null;

create table public.idempotency_keys (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (length(key) between 8 and 128),
  operation text not null check (length(operation) between 1 and 80),
  resource_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, key, operation)
);

alter table public.idempotency_keys enable row level security;
revoke all on public.idempotency_keys from anon, authenticated;
grant select, insert on public.idempotency_keys to authenticated;
create policy idempotency_owner_select on public.idempotency_keys
  for select to authenticated using ((select auth.uid()) = user_id);
create policy idempotency_owner_insert on public.idempotency_keys
  for insert to authenticated with check ((select auth.uid()) = user_id);

create function public.seed_default_categories() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.onboarding_completed then
    insert into public.categories(user_id, name, kind, is_custom)
    values
      (new.id, 'Ăn uống', 'expense', false),
      (new.id, 'Di chuyển', 'expense', false),
      (new.id, 'Mua sắm', 'expense', false),
      (new.id, 'Hóa đơn', 'expense', false),
      (new.id, 'Giải trí', 'expense', false),
      (new.id, 'Sức khỏe', 'expense', false),
      (new.id, 'Lương', 'income', false),
      (new.id, 'Thu nhập khác', 'income', false)
    on conflict(user_id, name) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.seed_default_categories() from public;

create trigger profiles_seed_default_categories
after insert or update of onboarding_completed on public.profiles
for each row execute function public.seed_default_categories();

insert into public.categories(user_id, name, kind, is_custom)
select p.id, seed.name, seed.kind, false
from public.profiles p
cross join (values
  ('Ăn uống', 'expense'),
  ('Di chuyển', 'expense'),
  ('Mua sắm', 'expense'),
  ('Hóa đơn', 'expense'),
  ('Giải trí', 'expense'),
  ('Sức khỏe', 'expense'),
  ('Lương', 'income'),
  ('Thu nhập khác', 'income')
) as seed(name, kind)
where p.onboarding_completed
on conflict(user_id, name) do nothing;

create function public.reject_closed_month_transaction() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare target_user uuid; target_time timestamptz;
begin
  target_user := coalesce(new.user_id, old.user_id);
  target_time := coalesce(new.occurred_at, old.occurred_at);
  if exists(
    select 1 from public.month_closes mc
    where mc.user_id = target_user
      and mc.month_start = date_trunc('month', target_time)::date
  ) then
    raise exception 'Closed month cannot be changed' using errcode = '23514';
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function public.reject_closed_month_transaction() from public;

create trigger transactions_reject_closed_month
before insert or update or delete on public.transactions
for each row execute function public.reject_closed_month_transaction();

create function public.validate_transaction_change() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare category_kind text;
begin
  if not exists(
    select 1 from public.wallets
    where user_id = new.user_id and id = new.wallet_id and archived_at is null
  ) then
    raise exception 'Account not found' using errcode = '23503';
  end if;
  if new.category_id is not null and new.kind in ('expense', 'income') then
    select kind into category_kind from public.categories
      where user_id = new.user_id
        and id = new.category_id
        and archived_at is null;
    if category_kind is null or category_kind not in (new.kind, 'both') then
      raise exception 'Category is incompatible' using errcode = '23503';
    end if;
  end if;
  if tg_op = 'UPDATE'
      and old.kind = 'expense'
      and exists(
        select 1 from public.transactions refund
        where refund.user_id = old.user_id
          and refund.refund_of = old.id
          and refund.deleted_at is null
      )
      and (
        new.amount <> old.amount
        or new.wallet_id <> old.wallet_id
        or new.category_id is distinct from old.category_id
        or new.deleted_at is distinct from old.deleted_at
      ) then
    raise exception 'Transaction has linked refunds' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_transaction_change() from public;

create trigger transactions_validate_change
before insert or update on public.transactions
for each row execute function public.validate_transaction_change();

create function public.create_finance_transaction(
  p_idempotency_key text,
  p_wallet_id uuid,
  p_category_id uuid,
  p_title text,
  p_amount bigint,
  p_kind text,
  p_occurred_at timestamptz,
  p_note text default ''
) returns public.transactions
language plpgsql security invoker set search_path = '' as $$
declare
  owner uuid := auth.uid();
  existing_id uuid;
  created public.transactions;
  category_kind text;
begin
  if owner is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if length(p_idempotency_key) not between 8 and 128 then
    raise exception 'Invalid idempotency key' using errcode = '22023';
  end if;
  if p_kind not in ('expense', 'income') then
    raise exception 'Unsupported transaction kind' using errcode = '22023';
  end if;
  if length(trim(p_title)) not between 1 and 160
      or p_amount <= 0 or p_amount > 9000000000000
      or length(p_note) > 2000 then
    raise exception 'Invalid transaction data' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(owner::text || ':' || p_idempotency_key, 0)
  );
  select resource_id into existing_id
    from public.idempotency_keys
    where user_id = owner
      and key = p_idempotency_key
      and operation = 'create_transaction';
  if existing_id is not null then
    select * into created from public.transactions
      where user_id = owner and id = existing_id;
    if created.id is null then
      raise exception 'Idempotency resource is unavailable' using errcode = '40001';
    end if;
    return created;
  end if;

  if not exists(
    select 1 from public.wallets
    where user_id = owner and id = p_wallet_id and archived_at is null
  ) then
    raise exception 'Account not found' using errcode = '23503';
  end if;
  if p_category_id is not null then
    select kind into category_kind from public.categories
      where user_id = owner and id = p_category_id and archived_at is null;
    if category_kind is null or category_kind not in (p_kind, 'both') then
      raise exception 'Category is incompatible' using errcode = '23503';
    end if;
  end if;

  insert into public.transactions(
    user_id, wallet_id, category_id, title, amount, kind, occurred_at, note
  ) values (
    owner, p_wallet_id, p_category_id, trim(p_title), p_amount,
    p_kind, p_occurred_at, p_note
  ) returning * into created;

  insert into public.idempotency_keys(user_id, key, operation, resource_id)
  values(owner, p_idempotency_key, 'create_transaction', created.id);
  return created;
end;
$$;

revoke all on function public.create_finance_transaction(
  text, uuid, uuid, text, bigint, text, timestamptz, text
) from public;
grant execute on function public.create_finance_transaction(
  text, uuid, uuid, text, bigint, text, timestamptz, text
) to authenticated;
