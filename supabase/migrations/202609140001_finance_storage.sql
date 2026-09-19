-- Validate the client document before it can reach other devices or admin views.
create function public.valid_finance_payload(value jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare collection text; item jsonb; part jsonb; key text; amount numeric;
begin
 if octet_length(value::text)>10485760 then return false; end if;
 if jsonb_typeof(value) is distinct from 'object' or jsonb_typeof(value->'name') is distinct from 'string' or jsonb_typeof(value->'onboarded') is distinct from 'boolean' or jsonb_typeof(value->'hideBalance') is distinct from 'boolean' then return false; end if;
 foreach collection in array array['wallets','entries','budgets','bills','keepsakes','subscriptions','closedMonths'] loop
  if collection in ('subscriptions','closedMonths') and not value ? collection then continue; end if;
  if jsonb_typeof(value->collection) is distinct from 'array' then return false; end if;
  for item in select * from jsonb_array_elements(value->collection) loop
   if jsonb_typeof(item) is distinct from 'object' then return false; end if;
   key:=case when collection='closedMonths' then 'month' else 'id' end;
   if jsonb_typeof(item->key) is distinct from 'string' or length(item->>key)=0 then return false; end if;
   if collection='wallets' then
    if jsonb_typeof(item->'name') is distinct from 'string' or jsonb_typeof(item->'openingBalance') is distinct from 'number' or (item->>'openingBalance') !~ '^-?[0-9]+$' or item->>'openingBalance' is null then return false; end if;
    if abs((item->>'openingBalance')::numeric)>9000000000000 then return false; end if;
   end if;
   if collection in ('entries','bills','keepsakes','subscriptions') then
    if jsonb_typeof(item->'amount') is distinct from 'number' or (item->>'amount') !~ '^[0-9]+$' or item->>'amount' is null then return false; end if;
    amount:=(item->>'amount')::numeric;
    if amount>9000000000000 or (amount=0 and collection<>'keepsakes') then return false; end if;
    key:=case when collection='subscriptions' then 'name' else 'title' end;
    if jsonb_typeof(item->key) is distinct from 'string' or length(trim(item->>key))=0 then return false; end if;
    key:=case when collection='bills' then 'dueDate' when collection='subscriptions' then 'nextDate' else 'date' end;
    if (item->>key) !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' or item->>key is null then return false; end if;
    perform (item->>key)::timestamptz;
   end if;
   if collection='entries' then
    if item->>'type' not in ('expense','income','transfer') or item->>'type' is null or jsonb_typeof(item->'category') is distinct from 'string' then return false; end if;
    if not exists(select 1 from jsonb_array_elements(value->'wallets') w where w->>'id'=item->>'walletId') then return false; end if;
    if item->>'type'='transfer' and (item->>'destinationId'=item->>'walletId' or not exists(select 1 from jsonb_array_elements(value->'wallets') w where w->>'id'=item->>'destinationId')) then return false; end if;
    if item ? 'parts' then
     if jsonb_typeof(item->'parts') is distinct from 'array' then return false; end if;
     for part in select * from jsonb_array_elements(item->'parts') loop
      if jsonb_typeof(part) is distinct from 'object' or jsonb_typeof(part->'category') is distinct from 'string' or jsonb_typeof(part->'amount') is distinct from 'number' or (part->>'amount') !~ '^[1-9][0-9]*$' or part->>'amount' is null then return false; end if;
     end loop;
     if jsonb_array_length(item->'parts')>0 and (item->>'type'='transfer' or (select sum((p->>'amount')::numeric) from jsonb_array_elements(item->'parts') p)<>amount) then return false; end if;
    end if;
   end if;
   if collection='budgets' and (jsonb_typeof(item->'category') is distinct from 'string' or jsonb_typeof(item->'limit') is distinct from 'number' or item->>'limit' is null or (item->>'limit') !~ '^[1-9][0-9]*$' or (item->>'limit')::numeric>9000000000000) then return false; end if;
  end loop;
  key:=case when collection='closedMonths' then 'month' else 'id' end;
  if (select count(*)<>count(distinct x->>key) from jsonb_array_elements(value->collection) x) then return false; end if;
 end loop;
 return true;
exception when others then return false;
end $$;
revoke all on function public.valid_finance_payload(jsonb) from public;
-- Each user's ledger is committed atomically using optimistic concurrency.
create table public.finance_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  constraint payload_version check (payload->>'version' is not null and payload->>'version' in ('1','2')),
  constraint payload_size check (octet_length(payload::text) <= 10485760)
);
alter table public.finance_snapshots enable row level security;
revoke all on public.finance_snapshots from anon, authenticated;
grant select on public.finance_snapshots to authenticated;
create policy owner_read on public.finance_snapshots for select to authenticated using (user_id = (select auth.uid()));

create function public.save_finance_snapshot(expected_revision bigint, new_payload jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); next_revision bigint;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not public.valid_finance_payload(new_payload) then raise exception 'Invalid document' using errcode = '22023'; end if;
  if expected_revision is null or expected_revision < 0 or new_payload->>'version' not in ('1','2') or new_payload->>'version' is null then
    raise exception 'Invalid snapshot' using errcode = '22023';
  end if;
  if jsonb_typeof(new_payload->'entries') is distinct from 'array' or jsonb_typeof(new_payload->'wallets') is distinct from 'array' then
    raise exception 'Invalid ledger' using errcode = '22023';
  end if;
  insert into public.finance_snapshots(user_id, revision, payload)
    values(owner_id, 1, new_payload)
    on conflict(user_id) do update
      set payload = excluded.payload, revision = finance_snapshots.revision + 1, updated_at = now()
      where finance_snapshots.revision = expected_revision
    returning revision into next_revision;
  -- Reject a nonzero base when there is no existing server snapshot.
  if next_revision is null or (next_revision = 1 and expected_revision <> 0) then
    raise exception 'Snapshot conflict' using errcode = '40001';
  end if;
  return next_revision;
end $$;
revoke all on function public.save_finance_snapshot(bigint,jsonb) from public;
grant execute on function public.save_finance_snapshot(bigint,jsonb) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('picket-media','picket-media',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy media_owner_select on storage.objects for select to authenticated
using(bucket_id='picket-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy media_owner_insert on storage.objects for insert to authenticated
with check(bucket_id='picket-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy media_owner_update on storage.objects for update to authenticated
using(bucket_id='picket-media' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check(bucket_id='picket-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy media_owner_delete on storage.objects for delete to authenticated
using(bucket_id='picket-media' and (storage.foldername(name))[1]=(select auth.uid())::text);



