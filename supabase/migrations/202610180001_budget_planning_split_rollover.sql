-- Recalculate monthly rollover from split allocations, including refund splits.
-- A late close cannot mutate the limit of a month that has already been closed.
create or replace function public.close_budget_month(p_month date, p_rollover boolean, p_note text)
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
  if coalesce(p_rollover,false) and exists(
    select 1 from public.month_closes where user_id = owner and month_start = next_month
  ) then
    raise exception 'Next month already closed' using errcode = '23514';
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
      select coalesce(sum(
        case when t.kind='expense' then
          case when allocation.split_count > 0 then allocation.category_amount
            when t.category_id=budget_row.category_id then t.amount else 0 end
        else -case when allocation.split_count > 0 then allocation.category_amount
          when original.id is not null and original.kind='expense' then
            round(t.amount::numeric *
              (case when source_allocation.split_count > 0 then source_allocation.category_amount
                when original.category_id=budget_row.category_id then original.amount else 0 end)::numeric
              / original.amount)::bigint
          else 0 end end
      ),0) into current_spent
      from public.transactions t
      left join public.transactions original on original.user_id=owner and original.id=t.refund_of and original.deleted_at is null
      left join lateral (
        select count(*) as split_count,
               coalesce(sum(s.amount) filter(where s.category_id=budget_row.category_id),0) as category_amount
        from public.transaction_splits s where s.user_id=owner and s.transaction_id=t.id
      ) allocation on true
      left join lateral (
        select count(*) as split_count,
               coalesce(sum(s.amount) filter(where s.category_id=budget_row.category_id),0) as category_amount
        from public.transaction_splits s where s.user_id=owner and s.transaction_id=original.id
      ) source_allocation on true
      where t.user_id=owner and t.deleted_at is null and t.kind in ('expense','refund')
        and t.occurred_at >= p_month::timestamptz and t.occurred_at < next_month::timestamptz;
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
