-- Atomic transfer, refund and split operations for the Dart REST API.
alter table public.transaction_splits
  add column row_version bigint not null default 1
    check (row_version > 0);

alter table public.transaction_splits
  add constraint transaction_splits_owner_id_unique unique (user_id, id),
  add constraint transaction_splits_category_unique
    unique (user_id, transaction_id, category_id);

create trigger transaction_splits_increment_version
before update on public.transaction_splits
for each row execute function public.increment_row_version();

create or replace function public.validate_transaction_change() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  category_kind text;
  source_currency text;
  destination_currency text;
  original public.transactions;
  refunded bigint;
begin
  select currency_code into source_currency from public.wallets
    where user_id = new.user_id and id = new.wallet_id and archived_at is null;
  if source_currency is null then
    raise exception 'Account not found' using errcode = '23503';
  end if;

  if new.kind = 'transfer' then
    select currency_code into destination_currency from public.wallets
      where user_id = new.user_id
        and id = new.destination_wallet_id
        and archived_at is null;
    if destination_currency is null then
      raise exception 'Destination account not found' using errcode = '23503';
    end if;
    if destination_currency <> source_currency then
      raise exception 'Cross-currency transfer is unsupported' using errcode = '23514';
    end if;
    if new.category_id is not null then
      raise exception 'Transfer cannot have a category' using errcode = '23514';
    end if;
  elsif new.kind in ('expense', 'income') and new.category_id is not null then
    select kind into category_kind from public.categories
      where user_id = new.user_id
        and id = new.category_id
        and archived_at is null;
    if category_kind is null or category_kind not in (new.kind, 'both') then
      raise exception 'Category is incompatible' using errcode = '23503';
    end if;
  elsif new.kind = 'refund' then
    select * into original from public.transactions
      where user_id = new.user_id
        and id = new.refund_of
        and kind = 'expense'
        and deleted_at is null
      for update;
    if original.id is null then
      raise exception 'Refund source not found' using errcode = '23503';
    end if;
    if new.wallet_id <> original.wallet_id
        or new.category_id is distinct from original.category_id then
      raise exception 'Refund must preserve account and category' using errcode = '23514';
    end if;
    select coalesce(sum(amount), 0) into refunded
      from public.transactions
      where user_id = new.user_id
        and refund_of = original.id
        and id <> new.id
        and deleted_at is null;
    if refunded + new.amount > original.amount then
      raise exception 'Refund exceeds remaining amount' using errcode = '23514';
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

create function public.validate_transaction_split_change() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  target_user uuid := coalesce(new.user_id, old.user_id);
  target_transaction uuid := coalesce(new.transaction_id, old.transaction_id);
  target_category uuid := coalesce(new.category_id, old.category_id);
  parent public.transactions;
  category_kind text;
begin
  select * into parent from public.transactions
    where user_id = target_user
      and id = target_transaction
      and deleted_at is null;
  if parent.id is null and tg_op = 'DELETE' then
    return old;
  end if;
  if parent.id is null or parent.kind = 'transfer' then
    raise exception 'Transaction cannot be split' using errcode = '23514';
  end if;
  if exists(
    select 1 from public.month_closes mc
    where mc.user_id = target_user
      and mc.month_start = date_trunc('month', parent.occurred_at)::date
  ) then
    raise exception 'Closed month cannot be changed' using errcode = '23514';
  end if;
  if tg_op <> 'DELETE' then
    select kind into category_kind from public.categories
      where user_id = target_user
        and id = target_category
        and (archived_at is null or parent.kind = 'refund');
    if category_kind is null
        or category_kind not in (
          case when parent.kind = 'refund' then 'expense' else parent.kind end,
          'both'
        ) then
      raise exception 'Split category is incompatible' using errcode = '23503';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function public.validate_transaction_split_change() from public;
create trigger transaction_splits_validate_change
before insert or update or delete on public.transaction_splits
for each row execute function public.validate_transaction_split_change();

create function public.create_finance_transfer(
  p_idempotency_key text,
  p_source_wallet_id uuid,
  p_destination_wallet_id uuid,
  p_title text,
  p_amount bigint,
  p_occurred_at timestamptz,
  p_note text default ''
) returns public.transactions
language plpgsql security invoker set search_path = '' as $$
declare
  owner uuid := auth.uid();
  existing_id uuid;
  created public.transactions;
begin
  if owner is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if length(p_idempotency_key) not between 8 and 128
      or p_source_wallet_id = p_destination_wallet_id
      or length(trim(p_title)) not between 1 and 160
      or p_amount <= 0 or p_amount > 9000000000000
      or length(p_note) > 2000 then
    raise exception 'Invalid transfer data' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(owner::text || ':' || p_idempotency_key, 0)
  );
  select resource_id into existing_id from public.idempotency_keys
    where user_id = owner and key = p_idempotency_key
      and operation = 'create_transfer';
  if existing_id is not null then
    select * into created from public.transactions
      where user_id = owner and id = existing_id;
    if created.id is null then
      raise exception 'Idempotency resource is unavailable' using errcode = '40001';
    end if;
    return created;
  end if;

  insert into public.transactions(
    user_id, wallet_id, destination_wallet_id, title, amount, kind,
    occurred_at, note
  ) values (
    owner, p_source_wallet_id, p_destination_wallet_id, trim(p_title),
    p_amount, 'transfer', p_occurred_at, p_note
  ) returning * into created;

  insert into public.idempotency_keys(user_id, key, operation, resource_id)
  values(owner, p_idempotency_key, 'create_transfer', created.id);
  return created;
end;
$$;

revoke all on function public.create_finance_transfer(
  text, uuid, uuid, text, bigint, timestamptz, text
) from public;
grant execute on function public.create_finance_transfer(
  text, uuid, uuid, text, bigint, timestamptz, text
) to authenticated;

create function public.create_finance_refund(
  p_idempotency_key text,
  p_original_transaction_id uuid,
  p_amount bigint,
  p_occurred_at timestamptz,
  p_note text default ''
) returns public.transactions
language plpgsql security invoker set search_path = '' as $$
declare
  owner uuid := auth.uid();
  existing_id uuid;
  original public.transactions;
  created public.transactions;
  refunded bigint;
  split_total bigint;
begin
  if owner is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if length(p_idempotency_key) not between 8 and 128
      or p_amount <= 0 or p_amount > 9000000000000
      or length(p_note) > 2000 then
    raise exception 'Invalid refund data' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(owner::text || ':' || p_idempotency_key, 0)
  );
  select resource_id into existing_id from public.idempotency_keys
    where user_id = owner and key = p_idempotency_key
      and operation = 'create_refund';
  if existing_id is not null then
    select * into created from public.transactions
      where user_id = owner and id = existing_id;
    if created.id is null then
      raise exception 'Idempotency resource is unavailable' using errcode = '40001';
    end if;
    return created;
  end if;

  select * into original from public.transactions
    where user_id = owner
      and id = p_original_transaction_id
      and kind = 'expense'
      and deleted_at is null
    for update;
  if original.id is null then
    raise exception 'Refund source not found' using errcode = '23503';
  end if;
  select coalesce(sum(amount), 0) into refunded from public.transactions
    where user_id = owner
      and refund_of = original.id
      and deleted_at is null;
  if refunded + p_amount > original.amount then
    raise exception 'Refund exceeds remaining amount' using errcode = '23514';
  end if;

  insert into public.transactions(
    user_id, wallet_id, category_id, refund_of, title, amount, kind,
    occurred_at, note
  ) values (
    owner, original.wallet_id, original.category_id, original.id,
    'Hoàn tiền · ' || original.title, p_amount, 'refund', p_occurred_at, p_note
  ) returning * into created;

  select coalesce(sum(amount), 0) into split_total
    from public.transaction_splits
    where user_id = owner and transaction_id = original.id;
  if split_total > 0 then
    with category_balances as (
      select
        source.category_id,
        source.amount - coalesce(sum(refund_split.amount), 0) as available
      from public.transaction_splits source
      left join public.transactions prior_refund
        on prior_refund.user_id = owner
        and prior_refund.refund_of = original.id
        and prior_refund.deleted_at is null
        and prior_refund.id <> created.id
      left join public.transaction_splits refund_split
        on refund_split.user_id = owner
        and refund_split.transaction_id = prior_refund.id
        and refund_split.category_id = source.category_id
      where source.user_id = owner and source.transaction_id = original.id
      group by source.category_id, source.amount
    ), proportional as (
      select
        category_id,
        available,
        floor((p_amount::numeric * available) / (original.amount - refunded))::bigint as base,
        mod(p_amount::numeric * available, original.amount - refunded) as remainder
      from category_balances where available > 0
    ), ranked as (
      select *,
        p_amount - sum(base) over () as leftovers,
        row_number() over(order by remainder desc, category_id) as position
      from proportional
    )
    insert into public.transaction_splits(user_id, transaction_id, category_id, amount)
    select owner, created.id, category_id,
      base + case when position <= leftovers then 1 else 0 end
    from ranked
    where base > 0 or position <= leftovers;
  end if;

  insert into public.idempotency_keys(user_id, key, operation, resource_id)
  values(owner, p_idempotency_key, 'create_refund', created.id);
  return created;
end;
$$;

revoke all on function public.create_finance_refund(
  text, uuid, bigint, timestamptz, text
) from public;
grant execute on function public.create_finance_refund(
  text, uuid, bigint, timestamptz, text
) to authenticated;

create function public.set_transaction_splits(
  p_transaction_id uuid,
  p_expected_version bigint,
  p_splits jsonb
) returns public.transactions
language plpgsql security invoker set search_path = '' as $$
declare
  owner uuid := auth.uid();
  target public.transactions;
  split_count integer;
  split_sum numeric;
begin
  if owner is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_splits) <> 'array' or jsonb_array_length(p_splits) > 20 then
    raise exception 'Invalid split data' using errcode = '22023';
  end if;

  select * into target from public.transactions
    where user_id = owner
      and id = p_transaction_id
      and row_version = p_expected_version
      and kind in ('expense', 'income')
      and deleted_at is null
    for update;
  if target.id is null then
    raise exception 'Transaction version conflict' using errcode = '40001';
  end if;
  if exists(
    select 1 from public.transactions refund
    where refund.user_id = owner
      and refund.refund_of = target.id
      and refund.deleted_at is null
  ) then
    raise exception 'Transaction has linked refunds' using errcode = '23514';
  end if;

  select count(*), coalesce(sum((item->>'amount')::numeric), 0)
    into split_count, split_sum
    from jsonb_array_elements(p_splits) item
    where jsonb_typeof(item) = 'object'
      and item ? 'categoryId' and item ? 'amount'
      and (item->>'categoryId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      and (item->>'amount') ~ '^[1-9][0-9]*$';
  if split_count <> jsonb_array_length(p_splits)
      or (split_count > 0 and split_sum <> target.amount)
      or split_sum > 9000000000000
      or split_count <> (
        select count(distinct item->>'categoryId')
        from jsonb_array_elements(p_splits) item
      ) then
    raise exception 'Split amounts must be unique and equal transaction amount' using errcode = '22023';
  end if;

  delete from public.transaction_splits
    where user_id = owner and transaction_id = target.id;
  insert into public.transaction_splits(user_id, transaction_id, category_id, amount)
  select owner, target.id, (item->>'categoryId')::uuid, (item->>'amount')::bigint
    from jsonb_array_elements(p_splits) item;

  update public.transactions set updated_at = now()
    where user_id = owner and id = target.id
    returning * into target;
  return target;
end;
$$;

revoke all on function public.set_transaction_splits(uuid, bigint, jsonb) from public;
grant execute on function public.set_transaction_splits(uuid, bigint, jsonb) to authenticated;
