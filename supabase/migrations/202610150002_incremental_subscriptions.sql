alter table public.subscriptions
  add column if not exists row_version bigint not null default 1 check (row_version > 0),
  add column if not exists archived_at timestamptz;

create trigger subscriptions_increment_version before update on public.subscriptions
for each row execute function public.increment_row_version();

create index if not exists subscriptions_active_owner_idx
  on public.subscriptions(user_id, next_due_at, id) where active and archived_at is null;

create function public.create_finance_subscription(
  p_idempotency_key text, p_wallet_id uuid, p_category_id uuid,
  p_title text, p_amount bigint, p_cadence text, p_next_due_at timestamptz,
  p_cycle_months integer, p_note text, p_alert_days integer
) returns public.subscriptions
language plpgsql security invoker set search_path = '' as $$
declare owner uuid := auth.uid(); existing_id uuid; created public.subscriptions;
begin
  if owner is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if length(p_idempotency_key) not between 8 and 128
      or length(trim(p_title)) not between 1 and 160
      or p_amount <= 0 or p_amount > 9000000000000
      or p_cadence not in ('weekly','monthly','quarterly','yearly','custom')
      or p_cycle_months not between 1 and 120
      or length(p_note) > 2000 or p_alert_days not between 0 and 365 then
    raise exception 'Invalid subscription data' using errcode = '22023';
  end if;
  if p_wallet_id is not null and not exists(select 1 from public.wallets where user_id = owner and id = p_wallet_id and archived_at is null) then raise exception 'Wallet not found' using errcode = '23503'; end if;
  if p_category_id is not null and not exists(select 1 from public.categories where user_id = owner and id = p_category_id and archived_at is null and kind in ('expense','both')) then raise exception 'Category not found' using errcode = '23503'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner::text || ':create_subscription:' || p_idempotency_key, 0));
  select resource_id into existing_id from public.idempotency_keys where user_id = owner and key = p_idempotency_key and operation = 'create_subscription';
  if existing_id is not null then
    select * into created from public.subscriptions where user_id = owner and id = existing_id;
    if created.id is null then raise exception 'Idempotency resource is unavailable' using errcode = '40001'; end if;
    return created;
  end if;
  insert into public.subscriptions(user_id,wallet_id,category_id,title,amount,cadence,next_due_at,cycle_months,note,alert_days)
    values(owner,p_wallet_id,p_category_id,trim(p_title),p_amount,p_cadence,p_next_due_at,p_cycle_months,trim(p_note),p_alert_days)
    returning * into created;
  insert into public.idempotency_keys(user_id,key,operation,resource_id) values(owner,p_idempotency_key,'create_subscription',created.id);
  return created;
end;
$$;

revoke all on function public.create_finance_subscription(text,uuid,uuid,text,bigint,text,timestamptz,integer,text,integer) from public;
grant execute on function public.create_finance_subscription(text,uuid,uuid,text,bigint,text,timestamptz,integer,text,integer) to authenticated;
