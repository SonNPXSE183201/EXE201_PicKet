-- Atomic reconciliation for one wallet and statement date.
alter table public.reconciliations
  add column request_id uuid,
  add column selected_transaction_ids uuid[] not null default '{}',
  add column difference bigint not null default 0,
  add column adjustment_transaction_id uuid,
  add constraint reconciliation_request_unique unique(user_id,request_id),
  add constraint reconciliation_adjustment_fk foreign key(user_id,adjustment_transaction_id)
    references public.transactions(user_id,id);

-- A closed month remains immutable financially; clearing flags is bookkeeping.
create or replace function public.reject_closed_month_transaction() returns trigger
language plpgsql security definer set search_path = '' as $$
declare target_user uuid; target_time timestamptz;
begin
  if tg_op = 'UPDATE' and
      to_jsonb(new) - 'reconciled_wallet_ids' - 'row_version' - 'updated_at' =
      to_jsonb(old) - 'reconciled_wallet_ids' - 'row_version' - 'updated_at' then
    return new;
  end if;
  target_user := coalesce(new.user_id, old.user_id);
  target_time := coalesce(new.occurred_at, old.occurred_at);
  if exists(select 1 from public.month_closes mc
      where mc.user_id=target_user and mc.month_start=date_trunc('month',target_time)::date) then
    raise exception 'Closed month cannot be changed' using errcode='23514';
  end if;
  return coalesce(new,old);
end;
$$;

create function public.reconcile_finance_wallet(
  p_request_id uuid, p_wallet_id uuid, p_period_end date,
  p_statement_balance bigint, p_selected_ids uuid[], p_reason text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  owner uuid := auth.uid();
  wallet public.wallets%rowtype;
  existing public.reconciliations%rowtype;
  eligible_ids uuid[];
  cleared_balance bigint;
  delta bigint;
  adjustment_id uuid;
begin
  if owner is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_request_id is null or p_wallet_id is null or p_period_end is null
      or p_period_end > current_date or p_statement_balance is null
      or abs(p_statement_balance) > 9000000000000
      or p_selected_ids is null or cardinality(p_selected_ids) > 10000
      or length(coalesce(p_reason,'')) > 1000 then
    raise exception 'Invalid reconciliation' using errcode='22023';
  end if;
  select * into wallet from public.wallets where user_id=owner and id=p_wallet_id and archived_at is null for update;
  if wallet.id is null then raise exception 'Wallet not found' using errcode='P0002'; end if;
  select * into existing from public.reconciliations where user_id=owner and request_id=p_request_id;
  if existing.id is not null then
    if existing.wallet_id <> p_wallet_id or existing.period_end <> p_period_end or
        existing.statement_balance <> p_statement_balance or
        existing.selected_transaction_ids <> p_selected_ids or
        existing.note <> coalesce(p_reason,'') then
      raise exception 'Idempotency conflict' using errcode='23505';
    end if;
    return jsonb_build_object('id',existing.id,'difference',existing.difference,
      'adjustmentTransactionId',existing.adjustment_transaction_id,'replayed',true);
  end if;
  -- Lock all eligible rows to serialize selection and prevent concurrent edits.
  perform 1 from public.transactions t where t.user_id=owner and t.deleted_at is null
    and (t.wallet_id=p_wallet_id or t.destination_wallet_id=p_wallet_id)
    and t.occurred_at < (p_period_end + interval '1 day')::timestamptz
    order by t.id for update;
  select coalesce(array_agg(t.id order by t.id),'{}'::uuid[]) into eligible_ids
    from public.transactions t where t.user_id=owner and t.deleted_at is null
      and (t.wallet_id=p_wallet_id or t.destination_wallet_id=p_wallet_id)
      and t.occurred_at < (p_period_end + interval '1 day')::timestamptz;
  if exists(select 1 from unnest(p_selected_ids) id where id <> all(eligible_ids))
      or cardinality(p_selected_ids) <> (select count(distinct id) from unnest(p_selected_ids) id) then
    raise exception 'Invalid selected transactions' using errcode='22023';
  end if;
  select wallet.opening_balance + coalesce(sum(case
      when t.wallet_id=p_wallet_id and t.kind in ('income','refund') then t.amount
      when t.wallet_id=p_wallet_id then -t.amount
      when t.kind='transfer' and t.destination_wallet_id=p_wallet_id then t.amount
      else 0 end),0)
    into cleared_balance from public.transactions t
    where t.user_id=owner and t.id=any(p_selected_ids) and t.deleted_at is null;
  delta := p_statement_balance-cleared_balance;
  if abs(delta) > 9000000000000 or (delta <> 0 and trim(coalesce(p_reason,''))='') then
    raise exception 'Adjustment requires reason or is too large' using errcode='22023';
  end if;
  update public.transactions t set reconciled_wallet_ids =
    case when t.id=any(p_selected_ids)
      then array_append(array_remove(t.reconciled_wallet_ids,p_wallet_id),p_wallet_id)
      else array_remove(t.reconciled_wallet_ids,p_wallet_id) end
    where t.user_id=owner and t.id=any(eligible_ids);
  if delta <> 0 then
    insert into public.transactions(user_id,wallet_id,title,amount,kind,occurred_at,note,reconciled_wallet_ids)
      values(owner,p_wallet_id,'Điều chỉnh đối soát',abs(delta),
        case when delta>0 then 'income' else 'expense' end,
        (p_period_end::timestamp + interval '12 hours') at time zone 'UTC',
        trim(p_reason),array[p_wallet_id]) returning id into adjustment_id;
  end if;
  insert into public.reconciliations(user_id,wallet_id,statement_balance,period_end,note,
    request_id,selected_transaction_ids,difference,adjustment_transaction_id)
    values(owner,p_wallet_id,p_statement_balance,p_period_end,coalesce(p_reason,''),
      p_request_id,p_selected_ids,delta,adjustment_id)
    returning * into existing;
  return jsonb_build_object('id',existing.id,'difference',delta,
    'adjustmentTransactionId',adjustment_id,'replayed',false);
end;
$$;
revoke all on function public.reconcile_finance_wallet(uuid,uuid,date,bigint,uuid[],text) from public;
grant execute on function public.reconcile_finance_wallet(uuid,uuid,date,bigint,uuid[],text) to authenticated;
