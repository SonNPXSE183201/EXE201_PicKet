-- Reject cross-user split mutations before attempting to lock a transaction
-- row, and make auth-user cascades deterministic when split rows exist.

alter table public.transaction_splits
  drop constraint split_category,
  add constraint split_category foreign key (user_id, category_id)
    references public.categories(user_id, id) on delete cascade;

create or replace function public.set_transaction_splits(
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

  -- A plain MVCC read avoids waiting on a row owned by another user. The
  -- locked read below is still required for an authorized optimistic update.
  if not exists(
    select 1 from public.transactions
    where user_id = owner
      and id = p_transaction_id
      and kind in ('expense', 'income')
      and deleted_at is null
  ) then
    raise exception 'Transaction version conflict' using errcode = '40001';
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
