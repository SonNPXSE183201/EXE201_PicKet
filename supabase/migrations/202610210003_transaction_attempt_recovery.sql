-- A permanent owner/key fence prevents delayed requests from creating a
-- transaction after the user starts a corrected receipt attempt.
create table public.transaction_attempt_tombstones (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (length(key) between 8 and 128),
  created_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.transaction_attempt_tombstones enable row level security;
create policy transaction_attempt_owner_read on public.transaction_attempt_tombstones
  for select to authenticated using (user_id = auth.uid());
revoke all on public.transaction_attempt_tombstones from public, anon, authenticated;
grant select on public.transaction_attempt_tombstones to authenticated;

create function public.resolve_finance_transaction_attempt(p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner uuid := auth.uid();
  existing_id uuid;
  existing public.transactions;
begin
  if owner is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 128 then
    raise exception 'Invalid idempotency key' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(owner::text || ':' || p_idempotency_key,0));
  select resource_id into existing_id from public.idempotency_keys
    where user_id=owner and key=p_idempotency_key and operation='create_transaction';
  if existing_id is not null then
    select * into existing from public.transactions where user_id=owner and id=existing_id;
    if existing.id is null then raise exception 'Idempotency resource is unavailable' using errcode='40001'; end if;
    return jsonb_build_object('status','committed','transaction',to_jsonb(existing));
  end if;
  insert into public.transaction_attempt_tombstones(user_id,key)
    values(owner,p_idempotency_key) on conflict do nothing;
  return jsonb_build_object('status','abandoned');
end;
$$;
revoke all on function public.resolve_finance_transaction_attempt(text) from public,anon;
grant execute on function public.resolve_finance_transaction_attempt(text) to authenticated;

create or replace function public.create_finance_transaction(
  p_idempotency_key text, p_wallet_id uuid, p_category_id uuid,
  p_title text, p_amount bigint, p_kind text, p_occurred_at timestamptz,
  p_note text default ''
) returns public.transactions
language plpgsql security invoker set search_path = '' as $$
declare
  owner uuid := auth.uid();
  existing_id uuid;
  created public.transactions;
  category_kind text;
begin
  if owner is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 128 then
    raise exception 'Invalid idempotency key' using errcode='22023';
  end if;
  if p_kind not in ('expense','income') then raise exception 'Unsupported transaction kind' using errcode='22023'; end if;
  if length(trim(p_title)) not between 1 and 160 or p_amount<=0 or p_amount>9000000000000 or length(p_note)>2000 then
    raise exception 'Invalid transaction data' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(owner::text || ':' || p_idempotency_key,0));
  select resource_id into existing_id from public.idempotency_keys
    where user_id=owner and key=p_idempotency_key and operation='create_transaction';
  if existing_id is not null then
    select * into created from public.transactions where user_id=owner and id=existing_id;
    if created.id is null then raise exception 'Idempotency resource is unavailable' using errcode='40001'; end if;
    return created;
  end if;
  if exists(select 1 from public.transaction_attempt_tombstones where user_id=owner and key=p_idempotency_key) then
    raise exception 'TRANSACTION_ATTEMPT_ABANDONED' using errcode='40001';
  end if;
  if not exists(select 1 from public.wallets where user_id=owner and id=p_wallet_id and archived_at is null) then
    raise exception 'Account not found' using errcode='23503';
  end if;
  if p_category_id is not null then
    select kind into category_kind from public.categories where user_id=owner and id=p_category_id and archived_at is null;
    if category_kind is null or category_kind not in (p_kind,'both') then
      raise exception 'Category is incompatible' using errcode='23503';
    end if;
  end if;
  insert into public.transactions(user_id,wallet_id,category_id,title,amount,kind,occurred_at,note)
    values(owner,p_wallet_id,p_category_id,trim(p_title),p_amount,p_kind,p_occurred_at,p_note) returning * into created;
  insert into public.idempotency_keys(user_id,key,operation,resource_id)
    values(owner,p_idempotency_key,'create_transaction',created.id);
  return created;
end;
$$;
