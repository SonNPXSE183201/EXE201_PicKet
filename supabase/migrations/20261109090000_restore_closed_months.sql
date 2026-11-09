-- Restore round trip for an account that closed a month (live API test,
-- 09/11/2026): save_normalized_finance re-inserted closedMonths without
-- clearing them first and failed with 23505 "Resource already exists"; data
-- inside a closed month was also locked ("Closed month cannot be changed").
-- Only save_normalized_finance is replaced; no data is changed.
CREATE OR REPLACE FUNCTION public.save_normalized_finance(expected_revision bigint, new_payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  owner uuid := auth.uid();
  current_revision bigint;
  next_revision bigint;
  item jsonb;
  part jsonb;
  month_key text;
  category_name text;
  previous_closes jsonb;
begin
  if owner is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if jsonb_typeof(new_payload) <> 'object' or (new_payload->>'version')::int <> 2 then
    raise exception 'Invalid finance payload' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_each(new_payload->'preferences') entry
    where entry.key in ('themeMode','languageMode','colorSchemeId')
      and jsonb_typeof(entry.value) not in ('string','null')
  ) then raise exception 'Invalid appearance preference type' using errcode='22023'; end if;

  select floor(extract(epoch from updated_at) * 1000000)::bigint
    into current_revision from public.profiles where id = owner for update;
  if current_revision is null then raise exception 'Profile not found' using errcode = '22023'; end if;
  if expected_revision <> current_revision and not (
    expected_revision = 0
    and not exists(select 1 from public.transactions where user_id = owner)
    and not exists(select 1 from public.budgets where user_id = owner)
  ) then
    raise exception 'Normalized finance conflict' using errcode = '23514';
  end if;

  -- Closed months lock their transactions, splits and periods. Restore
  -- replaces the whole account, so lift the locks first (keeping the server
  -- details of each close) and close the backed-up months again at the end.
  select coalesce(jsonb_object_agg(to_char(month_start, 'YYYY-MM'), rollover_payload), '{}'::jsonb)
    into previous_closes from public.month_closes where user_id = owner;
  delete from public.month_closes where user_id = owner;

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
      case when item ? 'currencyCode' then item->>'currencyCode' else coalesce(nullif(new_payload->'preferences'->>'currency', ''), 'VND') end
    );
  end loop;

  -- Categories exported with ids keep them (on conflict: an id or name that
  -- cannot be reused falls back to the name-based insert below).
  if jsonb_typeof(new_payload->'categories') = 'array' then
    for item in select value from jsonb_array_elements(new_payload->'categories') loop
      if jsonb_typeof(item) = 'object'
        and coalesce(item->>'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        and length(trim(coalesce(item->>'name', ''))) between 1 and 80
      then
        insert into public.categories(id, user_id, name, kind, color, icon, is_custom)
        values(
          (item->>'id')::uuid, owner, trim(item->>'name'),
          case when item->>'kind' in ('expense','income','both') then item->>'kind' else 'both' end,
          case when coalesce(item->>'color', '') ~ '^#[0-9A-Fa-f]{6}$' then item->>'color' end,
          case when length(item->>'icon') <= 80 then item->>'icon' end,
          coalesce((item->>'isCustom')::boolean, coalesce(new_payload->'customCategories', '[]'::jsonb) ? trim(item->>'name'))
        ) on conflict do nothing;
      end if;
    end loop;
  end if;

  for category_name in
    select distinct name from (
      select value #>> '{}' as name from jsonb_array_elements(coalesce(new_payload->'customCategories', '[]'::jsonb))
      union all
      -- Transfers have no category (old exports wrote "Khác" on them).
      select value->>'category' from jsonb_array_elements(coalesce(new_payload->'entries', '[]'::jsonb))
        where value->>'type' is distinct from 'transfer'
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
    ) on conflict do nothing;
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
      case when item->>'type' = 'transfer' then null
        else (select id from public.categories where user_id = owner and name = item->>'category') end,
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

  -- Previously closedMonths were inserted without clearing, so an account
  -- that had closed a month failed with unique(user_id, month_start).
  for item in select value from jsonb_array_elements(coalesce(new_payload->'closedMonths', '[]'::jsonb)) loop
    insert into public.month_closes(user_id, month_start, closed_at, rollover_payload)
    values(
      owner, ((item->>'month') || '-01')::date, (item->>'closedAt')::timestamptz,
      coalesce(previous_closes->(item->>'month'), '{}'::jsonb) || jsonb_build_object(
        'income', (item->>'income')::bigint, 'expense', (item->>'expense')::bigint, 'note', coalesce(item->>'note', '')
      )
    ) on conflict (user_id, month_start) do nothing;
  end loop;

  update public.profiles set
    display_name = trim(new_payload->>'name'),
    onboarding_completed = coalesce((new_payload->>'onboarded')::boolean, false),
    updated_at = clock_timestamp()
  where id = owner
  returning floor(extract(epoch from updated_at) * 1000000)::bigint into next_revision;

  insert into public.user_preferences(
    user_id, persona, goal, currency_code, hide_balance, notifications_enabled,
    theme_mode, language_mode, color_scheme_id
  ) values(
    owner, coalesce(new_payload->'preferences'->>'persona', ''),
    coalesce(new_payload->'preferences'->>'goal', ''),
    coalesce(nullif(new_payload->'preferences'->>'currency', ''), 'VND'),
    coalesce((new_payload->>'hideBalance')::boolean, false),
    coalesce((new_payload->'preferences'->>'notifications')::boolean, false),
    new_payload->'preferences'->>'themeMode',
    new_payload->'preferences'->>'languageMode',
    new_payload->'preferences'->>'colorSchemeId'
  ) on conflict(user_id) do update set
    persona = excluded.persona, goal = excluded.goal,
    currency_code = excluded.currency_code, hide_balance = excluded.hide_balance,
    notifications_enabled = excluded.notifications_enabled,
    theme_mode = case when (new_payload->'preferences') ? 'themeMode'
      then excluded.theme_mode else user_preferences.theme_mode end,
    language_mode = case when (new_payload->'preferences') ? 'languageMode'
      then excluded.language_mode else user_preferences.language_mode end,
    color_scheme_id = case when (new_payload->'preferences') ? 'colorSchemeId'
      then excluded.color_scheme_id else user_preferences.color_scheme_id end;

  return next_revision;
end;
$function$;
