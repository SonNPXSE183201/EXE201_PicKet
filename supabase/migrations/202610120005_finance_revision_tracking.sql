-- Every server-authoritative table represented by load_normalized_finance must
-- advance the profile revision so restore can detect concurrent mutations.
create function public.touch_finance_revision() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid := coalesce(new.user_id, old.user_id);
begin
  update public.profiles
    set updated_at = clock_timestamp()
    where id = owner;
  return coalesce(new, old);
end;
$$;

revoke all on function public.touch_finance_revision() from public;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'user_preferences', 'wallets', 'categories', 'transactions',
    'transaction_splits', 'budgets', 'budget_periods', 'bills',
    'subscriptions', 'keepsakes', 'receipts', 'month_closes',
    'reconciliations', 'reminders'
  ] loop
    execute format(
      'create trigger %I_touch_finance_revision after insert or update or delete on public.%I for each row execute function public.touch_finance_revision()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

-- 40001 is reserved for serialization failures and can be retried upstream.
-- A stale restore is a business conflict and must return promptly as HTTP 409.
do $$
declare
  definition text;
begin
  select pg_get_functiondef(
    'public.save_normalized_finance(bigint,jsonb)'::regprocedure
  ) into definition;

  if position('40001' in definition) = 0 then
    raise exception 'save_normalized_finance does not contain the expected conflict code';
  end if;

  execute replace(definition, '''40001''', '''23514''');
end;
$$;
