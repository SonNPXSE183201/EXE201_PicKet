-- Mobile budget planning operates on monthly periods without rewriting the
-- default limit or past months. Functions run as the authenticated user.
alter table public.user_preferences
  add column budget_method text not null default 'simple'
  check (budget_method in ('simple','envelope','zero_based','fifty_thirty_twenty','event'));

create function public.transfer_budget_period_limit(
  p_source uuid, p_destination uuid, p_month date, p_amount bigint
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  owner uuid := auth.uid();
  source_budget public.budgets%rowtype;
  destination_budget public.budgets%rowtype;
  source_limit bigint;
  destination_limit bigint;
begin
  if owner is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_source is null or p_destination is null or p_source = p_destination
      or p_month is null or date_trunc('month', p_month)::date <> p_month
      or p_amount is null or p_amount <= 0 or p_amount > 9000000000000 then
    raise exception 'Invalid budget transfer' using errcode = '22023';
  end if;
  if exists(select 1 from public.month_closes where user_id=owner and month_start=p_month) then
    raise exception 'Closed month cannot be changed' using errcode = '23514';
  end if;
  -- Lock in a stable order so concurrent transfers cannot deadlock.
  perform 1 from public.budgets b
    where b.user_id = owner and b.id in (p_source,p_destination)
      and b.active and b.archived_at is null
    order by b.id for update;
  select * into source_budget from public.budgets where user_id = owner and id = p_source and active and archived_at is null;
  select * into destination_budget from public.budgets where user_id = owner and id = p_destination and active and archived_at is null;
  if source_budget.id is null or destination_budget.id is null then
    raise exception 'Budget not found' using errcode = 'P0002';
  end if;
  select coalesce((select limit_amount from public.budget_periods where user_id = owner and budget_id = p_source and period_start = p_month), source_budget.default_limit) into source_limit;
  select coalesce((select limit_amount from public.budget_periods where user_id = owner and budget_id = p_destination and period_start = p_month), destination_budget.default_limit) into destination_limit;
  if source_limit <= p_amount or destination_limit + p_amount > 9000000000000 then
    raise exception 'Insufficient or excessive budget limit' using errcode = '22023';
  end if;
  insert into public.budget_periods(user_id,budget_id,period_start,period_end,limit_amount)
    values(owner,p_source,p_month,(p_month + interval '1 month' - interval '1 day')::date,source_limit-p_amount)
    on conflict(user_id,budget_id,period_start) do update set limit_amount = excluded.limit_amount;
  insert into public.budget_periods(user_id,budget_id,period_start,period_end,limit_amount)
    values(owner,p_destination,p_month,(p_month + interval '1 month' - interval '1 day')::date,destination_limit+p_amount)
    on conflict(user_id,budget_id,period_start) do update set limit_amount = excluded.limit_amount;
  return jsonb_build_object('month',p_month,'sourceLimit',source_limit-p_amount,'destinationLimit',destination_limit+p_amount);
end;
$$;
revoke all on function public.transfer_budget_period_limit(uuid,uuid,date,bigint) from public;
grant execute on function public.transfer_budget_period_limit(uuid,uuid,date,bigint) to authenticated;

create function public.close_budget_month(p_month date, p_rollover boolean, p_note text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  owner uuid := auth.uid();
  next_month date;
  income_total bigint;
  expense_total bigint;
  budget_row public.budgets%rowtype;
  current_limit bigint;
  current_spent bigint;
  surplus bigint;
  next_limit bigint;
begin
  if owner is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_month is null or date_trunc('month',p_month)::date <> p_month
      or p_month >= date_trunc('month',now())::date or length(coalesce(p_note,'')) > 1000 then
    raise exception 'Invalid closed month' using errcode = '22023';
  end if;
  next_month := (p_month + interval '1 month')::date;
  perform 1 from public.profiles where id = owner for update;
  if exists(select 1 from public.month_closes where user_id = owner and month_start = p_month) then
    raise exception 'Month already closed' using errcode = '23505';
  end if;
  select coalesce(sum(amount) filter(where kind='income'),0),
         coalesce(sum(amount) filter(where kind='expense'),0) - coalesce(sum(amount) filter(where kind='refund'),0)
    into income_total, expense_total
    from public.transactions where user_id=owner and deleted_at is null
      and occurred_at >= p_month::timestamptz and occurred_at < next_month::timestamptz;
  insert into public.month_closes(user_id,month_start,rollover_payload)
    values(owner,p_month,jsonb_build_object('income',income_total,'expense',expense_total,'note',coalesce(p_note,''),'rollover',coalesce(p_rollover,false)));
  if coalesce(p_rollover,false) then
    for budget_row in select * from public.budgets where user_id=owner and active and archived_at is null order by id loop
      select coalesce((select limit_amount from public.budget_periods where user_id=owner and budget_id=budget_row.id and period_start=p_month),budget_row.default_limit) into current_limit;
      select coalesce(sum(case when kind='refund' then -amount else amount end),0)
        into current_spent from public.transactions
        where user_id=owner and deleted_at is null and kind in ('expense','refund')
          and category_id=budget_row.category_id
          and occurred_at >= p_month::timestamptz and occurred_at < next_month::timestamptz;
      surplus := greatest(0,current_limit-current_spent);
      if surplus > 0 then
        select coalesce((select limit_amount from public.budget_periods where user_id=owner and budget_id=budget_row.id and period_start=next_month),budget_row.default_limit) into next_limit;
        if next_limit + surplus > 9000000000000 then raise exception 'Rollover limit too large' using errcode='22023'; end if;
        insert into public.budget_periods(user_id,budget_id,period_start,period_end,limit_amount,carried_amount)
          values(owner,budget_row.id,next_month,(next_month+interval '1 month' - interval '1 day')::date,next_limit+surplus,surplus)
          on conflict(user_id,budget_id,period_start) do update
            set limit_amount=excluded.limit_amount, carried_amount=public.budget_periods.carried_amount+excluded.carried_amount;
      end if;
    end loop;
  end if;
  return jsonb_build_object('month',p_month,'income',income_total,'expense',expense_total,'rollover',coalesce(p_rollover,false));
end;
$$;
revoke all on function public.close_budget_month(date,boolean,text) from public;
grant execute on function public.close_budget_month(date,boolean,text) to authenticated;
