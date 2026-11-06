-- Bills use optimistic concurrency and idempotent creation like the other
-- incremental finance resources.
alter table public.bills
  add column if not exists row_version bigint not null default 1
    check (row_version > 0),
  add column if not exists archived_at timestamptz;

create trigger bills_increment_version
before update on public.bills
for each row execute function public.increment_row_version();

create index if not exists bills_active_owner_idx
  on public.bills(user_id, due_at, id)
  where archived_at is null;

create function public.create_finance_bill(
  p_idempotency_key text,
  p_title text,
  p_amount bigint,
  p_due_at timestamptz
) returns public.bills
language plpgsql security invoker set search_path = '' as $$
declare
  owner uuid := auth.uid();
  existing_id uuid;
  created public.bills;
begin
  if owner is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if length(p_idempotency_key) not between 8 and 128
      or length(trim(p_title)) not between 1 and 160
      or p_amount <= 0 or p_amount > 9000000000000 then
    raise exception 'Invalid bill data' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(owner::text || ':create_bill:' || p_idempotency_key, 0)
  );
  select resource_id into existing_id from public.idempotency_keys
    where user_id = owner and key = p_idempotency_key
      and operation = 'create_bill';
  if existing_id is not null then
    select * into created from public.bills
      where user_id = owner and id = existing_id;
    if created.id is null then
      raise exception 'Idempotency resource is unavailable' using errcode = '40001';
    end if;
    return created;
  end if;

  insert into public.bills(user_id, title, amount, due_at)
    values(owner, trim(p_title), p_amount, p_due_at)
    returning * into created;
  insert into public.idempotency_keys(user_id, key, operation, resource_id)
    values(owner, p_idempotency_key, 'create_bill', created.id);
  return created;
end;
$$;

revoke all on function public.create_finance_bill(text,text,bigint,timestamptz) from public;
grant execute on function public.create_finance_bill(text,text,bigint,timestamptz) to authenticated;
