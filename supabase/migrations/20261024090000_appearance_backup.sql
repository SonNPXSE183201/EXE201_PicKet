-- Preserve optional account appearance in export/restore.
-- Existing owner checks, revision locking and permissions are retained.
CREATE OR REPLACE FUNCTION public.load_normalized_finance()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'revision', floor(extract(epoch from p.updated_at) * 1000000)::bigint,
    'payload', jsonb_build_object(
      'version', 2,
      'name', p.display_name,
      'onboarded', p.onboarding_completed,
      'hideBalance', coalesce(up.hide_balance, false),
      'wallets', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', w.id::text, 'name', w.name, 'openingBalance', w.opening_balance
        ) order by w.created_at, w.id)
        from public.wallets w where w.user_id = p.id and w.archived_at is null
      ), '[]'::jsonb),
      'entries', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', t.id::text,
          'title', t.title,
          'amount', t.amount,
          'type', case when t.kind = 'refund' then 'income' else t.kind end,
          'walletId', t.wallet_id::text,
          'category', coalesce(c.name, 'Khác'),
          'date', t.occurred_at,
          'destinationId', t.destination_wallet_id::text,
          'note', t.note,
          'receiptPath', r.storage_path,
          'refundOf', t.refund_of::text,
          'parts', coalesce((
            select jsonb_agg(jsonb_build_object(
              'category', sc.name, 'amount', ts.amount, 'label', ''
            ) order by ts.created_at, ts.id)
            from public.transaction_splits ts
            join public.categories sc on sc.id = ts.category_id and sc.user_id = ts.user_id
            where ts.user_id = t.user_id and ts.transaction_id = t.id
          ), '[]'::jsonb),
          'reconciled', cardinality(t.reconciled_wallet_ids) > 0,
          'reconciledWalletIds', to_jsonb(t.reconciled_wallet_ids)
        ) order by t.occurred_at, t.id)
        from public.transactions t
        left join public.categories c on c.id = t.category_id and c.user_id = t.user_id
        left join public.receipts r on r.transaction_id = t.id and r.user_id = t.user_id
        where t.user_id = p.id
      ), '[]'::jsonb),
      'budgets', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', b.id::text,
          'category', c.name,
          'limit', b.default_limit,
          'alertPercent', b.alert_percent,
          'monthLimits', coalesce((
            select jsonb_object_agg(
              extract(year from bp.period_start)::int || '-' || extract(month from bp.period_start)::int,
              bp.limit_amount
            ) from public.budget_periods bp
            where bp.user_id = b.user_id and bp.budget_id = b.id
          ), '{}'::jsonb)
        ) order by b.created_at, b.id)
        from public.budgets b
        join public.categories c on c.id = b.category_id and c.user_id = b.user_id
        where b.user_id = p.id and b.active
      ), '[]'::jsonb),
      'bills', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', b.id::text, 'title', b.title, 'amount', b.amount,
          'dueDate', b.due_at, 'paidEntryId', b.paid_transaction_id::text
        ) order by b.due_at, b.id) from public.bills b where b.user_id = p.id
      ), '[]'::jsonb),
      'keepsakes', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', k.id::text, 'title', k.title, 'amount', k.amount,
          'date', k.purchased_at, 'note', k.note, 'photoPath', k.media_path,
          'category', k.category_name, 'warrantyUntil', k.warranty_until,
          'returnUntil', k.return_until
        ) order by k.purchased_at, k.id) from public.keepsakes k where k.user_id = p.id
      ), '[]'::jsonb),
      'subscriptions', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', s.id::text, 'name', s.title, 'amount', s.amount,
          'nextDate', s.next_due_at, 'cycleMonths', s.cycle_months,
          'active', s.active, 'note', s.note, 'alertDays', s.alert_days
        ) order by s.next_due_at, s.id) from public.subscriptions s where s.user_id = p.id
      ), '[]'::jsonb),
      'closedMonths', coalesce((
        select jsonb_agg(jsonb_build_object(
          'month', to_char(mc.month_start, 'YYYY-MM'),
          'income', coalesce((mc.rollover_payload->>'income')::bigint, 0),
          'expense', coalesce((mc.rollover_payload->>'expense')::bigint, 0),
          'note', coalesce(mc.rollover_payload->>'note', ''),
          'closedAt', mc.closed_at
        ) order by mc.month_start) from public.month_closes mc where mc.user_id = p.id
      ), '[]'::jsonb),
      'customCategories', coalesce((
        select jsonb_agg(c.name order by c.name) from public.categories c
        where c.user_id = p.id and c.is_custom and c.archived_at is null
      ), '[]'::jsonb),
      'preferences', jsonb_build_object(
        'goal', coalesce(up.goal, ''),
        'persona', coalesce(up.persona, ''),
        'currency', coalesce(up.currency_code, 'VND'),
        'notifications', coalesce(up.notifications_enabled, false),
        'themeMode', up.theme_mode, 'languageMode', up.language_mode,
        'colorSchemeId', up.color_scheme_id
      )
    )
  )
  from public.profiles p
  left join public.user_preferences up on up.user_id = p.id
  where p.id = auth.uid();
$function$;

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
      coalesce(nullif(new_payload->'preferences'->>'currency', ''), 'VND')
    );
  end loop;

  for category_name in
    select distinct name from (
      select value #>> '{}' as name from jsonb_array_elements(coalesce(new_payload->'customCategories', '[]'::jsonb))
      union all
      select value->>'category' from jsonb_array_elements(coalesce(new_payload->'entries', '[]'::jsonb))
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
    );
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
      (select id from public.categories where user_id = owner and name = item->>'category'),
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

  for item in select value from jsonb_array_elements(coalesce(new_payload->'closedMonths', '[]'::jsonb)) loop
    insert into public.month_closes(user_id, month_start, closed_at, rollover_payload)
    values(
      owner, ((item->>'month') || '-01')::date, (item->>'closedAt')::timestamptz,
      jsonb_build_object('income', (item->>'income')::bigint, 'expense', (item->>'expense')::bigint, 'note', coalesce(item->>'note', ''))
    );
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
