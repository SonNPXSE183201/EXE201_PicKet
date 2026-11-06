-- Idempotent create RPCs make offline retries safe when the server completed a
-- write but the client lost the response. Keys are scoped by user + operation.
create function public.create_finance_account(
  p_idempotency_key text,
  p_name text,
  p_kind text,
  p_currency_code text,
  p_opening_balance bigint
) returns public.wallets
language plpgsql security invoker set search_path = '' as $$
declare
  owner uuid := auth.uid();
  existing_id uuid;
  created public.wallets;
begin
  if owner is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if length(p_idempotency_key) not between 8 and 128
      or length(trim(p_name)) not between 1 and 80
      or p_kind not in ('cash','bank','ewallet','other')
      or p_currency_code !~ '^[A-Z]{3}$'
      or abs(p_opening_balance) > 9000000000000 then
    raise exception 'Invalid account data' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(owner::text || ':create_account:' || p_idempotency_key, 0)
  );
  select resource_id into existing_id from public.idempotency_keys
    where user_id = owner and key = p_idempotency_key
      and operation = 'create_account';
  if existing_id is not null then
    select * into created from public.wallets
      where user_id = owner and id = existing_id;
    if created.id is null then
      raise exception 'Idempotency resource is unavailable' using errcode = '40001';
    end if;
    return created;
  end if;

  insert into public.wallets(
    user_id, name, kind, currency_code, opening_balance
  ) values (
    owner, trim(p_name), p_kind, p_currency_code, p_opening_balance
  ) returning * into created;
  insert into public.idempotency_keys(user_id, key, operation, resource_id)
    values(owner, p_idempotency_key, 'create_account', created.id);
  return created;
end;
$$;

create function public.create_finance_category(
  p_idempotency_key text,
  p_name text,
  p_kind text,
  p_color text default null,
  p_icon text default null
) returns public.categories
language plpgsql security invoker set search_path = '' as $$
declare
  owner uuid := auth.uid();
  existing_id uuid;
  created public.categories;
begin
  if owner is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if length(p_idempotency_key) not between 8 and 128
      or length(trim(p_name)) not between 1 and 80
      or p_kind not in ('expense','income','both')
      or (p_color is not null and p_color !~ '^#[0-9A-Fa-f]{6}$')
      or (p_icon is not null and length(p_icon) > 80) then
    raise exception 'Invalid category data' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(owner::text || ':create_category:' || p_idempotency_key, 0)
  );
  select resource_id into existing_id from public.idempotency_keys
    where user_id = owner and key = p_idempotency_key
      and operation = 'create_category';
  if existing_id is not null then
    select * into created from public.categories
      where user_id = owner and id = existing_id;
    if created.id is null then
      raise exception 'Idempotency resource is unavailable' using errcode = '40001';
    end if;
    return created;
  end if;

  insert into public.categories(
    user_id, name, kind, color, icon, is_custom
  ) values (
    owner, trim(p_name), p_kind, upper(p_color), nullif(trim(p_icon), ''), true
  ) returning * into created;
  insert into public.idempotency_keys(user_id, key, operation, resource_id)
    values(owner, p_idempotency_key, 'create_category', created.id);
  return created;
end;
$$;

create function public.create_finance_budget(
  p_idempotency_key text,
  p_category_id uuid,
  p_name text,
  p_default_limit bigint,
  p_alert_percent integer
) returns public.budgets
language plpgsql security invoker set search_path = '' as $$
declare
  owner uuid := auth.uid();
  existing_id uuid;
  created public.budgets;
begin
  if owner is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if length(p_idempotency_key) not between 8 and 128
      or length(trim(p_name)) not between 1 and 120
      or p_default_limit <= 0 or p_default_limit > 9000000000000
      or p_alert_percent not between 1 and 100 then
    raise exception 'Invalid budget data' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(owner::text || ':create_budget:' || p_idempotency_key, 0)
  );
  select resource_id into existing_id from public.idempotency_keys
    where user_id = owner and key = p_idempotency_key
      and operation = 'create_budget';
  if existing_id is not null then
    select * into created from public.budgets
      where user_id = owner and id = existing_id;
    if created.id is null then
      raise exception 'Idempotency resource is unavailable' using errcode = '40001';
    end if;
    return created;
  end if;

  if not exists(
    select 1 from public.categories
      where user_id = owner and id = p_category_id
        and archived_at is null and kind in ('expense','both')
  ) then
    raise exception 'Expense category not found' using errcode = '23503';
  end if;
  insert into public.budgets(
    user_id, category_id, name, default_limit, alert_percent
  ) values (
    owner, p_category_id, trim(p_name), p_default_limit, p_alert_percent
  ) returning * into created;
  insert into public.idempotency_keys(user_id, key, operation, resource_id)
    values(owner, p_idempotency_key, 'create_budget', created.id);
  return created;
end;
$$;

revoke all on function public.create_finance_account(text,text,text,text,bigint) from public;
revoke all on function public.create_finance_category(text,text,text,text,text) from public;
revoke all on function public.create_finance_budget(text,uuid,text,bigint,integer) from public;
grant execute on function public.create_finance_account(text,text,text,text,bigint) to authenticated;
grant execute on function public.create_finance_category(text,text,text,text,text) to authenticated;
grant execute on function public.create_finance_budget(text,uuid,text,bigint,integer) to authenticated;
