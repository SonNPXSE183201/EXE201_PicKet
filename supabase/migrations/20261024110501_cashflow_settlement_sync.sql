begin;
create table public.cashflow_settlement_documents(
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null check(revision between 1 and 9007199254740991),
 links jsonb not null check(jsonb_typeof(links)='array' and jsonb_array_length(links)<=1000)
);
create table public.cashflow_settlement_attempts(
 user_id uuid not null references auth.users(id) on delete cascade,
 request_key text not null,
 payload jsonb not null,
 applied_revision bigint not null,
 primary key(user_id,request_key)
);
alter table public.cashflow_settlement_documents enable row level security;
alter table public.cashflow_settlement_attempts enable row level security;
create policy settlement_document_owner on public.cashflow_settlement_documents for select to authenticated
 using(user_id=(select auth.uid()) and (select public.is_account_active()));
create policy settlement_attempt_owner on public.cashflow_settlement_attempts for select to authenticated
 using(user_id=(select auth.uid()) and (select public.is_account_active()));
revoke all on public.cashflow_settlement_documents,public.cashflow_settlement_attempts from public,anon,authenticated;
grant select on public.cashflow_settlement_documents,public.cashflow_settlement_attempts to authenticated;
create function public.load_cashflow_settlements() returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare owner uuid:=auth.uid();result jsonb;
begin
 if owner is null or not public.is_account_active() then raise exception 'Unauthorized' using errcode='42501';end if;
 select jsonb_build_object('schemaVersion',1,'revision',revision,'links',links) into result
 from public.cashflow_settlement_documents where user_id=owner;
 return coalesce(result,jsonb_build_object('schemaVersion',1,'revision',0,'links','[]'::jsonb));
end $$;
revoke all on function public.load_cashflow_settlements() from public,anon;
grant execute on function public.load_cashflow_settlements() to authenticated;
-- Definer is intentional: callers cannot bypass the atomic revision protocol with
-- direct table writes. Explicit active-owner checks and predicates apply throughout.
create function public.save_cashflow_settlements(p_request_key text,p_expected_revision bigint,p_links jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 owner uuid:=auth.uid();old public.cashflow_settlement_attempts;requested jsonb;
 current_revision bigint;row jsonb;s public.cashflow_schedules;t public.transactions;w public.wallets;
 d date;anchor_day integer;monthly_day date;seen_occ text[]:='{}';seen_tx uuid[]:='{}';schedule_id uuid;transaction_id uuid;
begin
 if owner is null or not public.is_account_active() then raise exception 'Unauthorized' using errcode='42501';end if;
 if p_request_key is null or p_request_key !~ '^[A-Za-z0-9._:-]{8,128}$' or
    p_expected_revision is null or p_expected_revision<0 or p_expected_revision>=9007199254740991 or
    p_links is null or jsonb_typeof(p_links)<>'array' or jsonb_array_length(p_links)>1000 then
  raise exception 'Invalid settlements' using errcode='22023';end if;
 requested:=jsonb_build_object('revision',p_expected_revision,'links',p_links);
 -- Serialize against schedule mutations as well as competing settlement documents.
 perform pg_advisory_xact_lock(hashtextextended('cashflow-schedules:'||owner::text,0));
 perform pg_advisory_xact_lock(hashtextextended('cashflow-settlements:'||owner::text,0));
 select * into old from public.cashflow_settlement_attempts where user_id=owner and request_key=p_request_key;
 if found then
  if old.payload is distinct from requested then raise exception 'Settlement key mismatch' using errcode='23505';end if;
  return public.load_cashflow_settlements()||jsonb_build_object('appliedRevision',old.applied_revision);
 end if;
 select revision into current_revision from public.cashflow_settlement_documents where user_id=owner for update;
 current_revision:=coalesce(current_revision,0);
 if current_revision<>p_expected_revision then raise exception 'Settlement revision conflict' using errcode='23514';end if;
 if (select count(*) from public.cashflow_settlement_attempts where user_id=owner)>=10000 then raise exception 'Settlement history capacity reached' using errcode='22023';end if;
 -- Consistent lock order prevents two selections locking shared transactions in
 -- opposite order. Locks keep evidence stable until the document is committed.
 perform 1 from public.transactions where user_id=owner and id::text in
 (select value->>'transactionId' from jsonb_array_elements(p_links)) order by id for share;
 for row in select value from jsonb_array_elements(p_links) loop
  if jsonb_typeof(row)<>'object' or not(row ?& array['occurrenceId','day','amount','currency','transactionId','transactionUpdatedAt']) or
     row-array['occurrenceId','day','amount','currency','transactionId','transactionUpdatedAt']<>'{}'::jsonb or
     jsonb_typeof(row->'day')<>'string' or row->>'day' !~ '^\d{4}-\d{2}-\d{2}$' or
     jsonb_typeof(row->'amount')<>'number' or row->>'amount' !~ '^-?\d+$' or abs((row->>'amount')::numeric)>9000000000000 or (row->>'amount')::numeric=0 or
     jsonb_typeof(row->'currency')<>'string' or row->>'currency' !~ '^[A-Z]{3}$' or
     jsonb_typeof(row->'occurrenceId')<>'string' or row->>'occurrenceId' !~ '^[0-9a-fA-F-]{36}:\d{4}-\d{2}-\d{2}$' or
     jsonb_typeof(row->'transactionId')<>'string' or
     jsonb_typeof(row->'transactionUpdatedAt')<>'string' or row->>'transactionUpdatedAt' !~ '^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$' then
    raise exception 'Invalid settlement evidence' using errcode='22023';end if;
  d:=(row->>'day')::date;
  if row->>'occurrenceId'<>split_part(row->>'occurrenceId',':',1)||':'||d::text then raise exception 'Invalid occurrence' using errcode='22023';end if;
  schedule_id:=split_part(row->>'occurrenceId',':',1)::uuid;transaction_id:=(row->>'transactionId')::uuid;
  if lower(row->>'occurrenceId')=any(seen_occ) or transaction_id=any(seen_tx) then raise exception 'Duplicate settlement evidence' using errcode='22023';end if;
  seen_occ:=array_append(seen_occ,lower(row->>'occurrenceId'));seen_tx:=array_append(seen_tx,transaction_id);
  select * into s from public.cashflow_schedules where user_id=owner and id=schedule_id;
  select * into t from public.transactions where user_id=owner and id=transaction_id;
  select * into w from public.wallets where user_id=owner and id=t.wallet_id;
  if s.id is null or not s.active or s.wallet_id is null or t.id is null or w.id is null or w.archived_at is not null or
     t.deleted_at is not null or t.kind='transfer' or t.wallet_id<>s.wallet_id or w.currency_code<>s.currency or
     s.currency<>row->>'currency' or s.amount<>(row->>'amount')::bigint or
     (case when t.kind='expense' then -t.amount else t.amount end)<>s.amount or
     t.updated_at<>(row->>'transactionUpdatedAt')::timestamptz or t.occurred_at>now() or
     d<s.start_day or (s.end_day is not null and d>s.end_day) then
    raise exception 'Settlement evidence changed or is unavailable' using errcode='22023';end if;
  if s.frequency='once' and d<>s.start_day or s.frequency='weekly' and (d-s.start_day)%7<>0 then
   raise exception 'Invalid occurrence day' using errcode='22023';end if;
  if s.frequency='monthly' then
   anchor_day:=extract(day from s.start_day)::integer;
   monthly_day:=date_trunc('month',d)::date+least(anchor_day,extract(day from(date_trunc('month',d)+interval '1 month - 1 day'))::integer)-1;
   if d<>monthly_day then raise exception 'Invalid monthly occurrence' using errcode='22023';end if;
  end if;
 end loop;
 insert into public.cashflow_settlement_documents(user_id,revision,links) values(owner,current_revision+1,p_links)
 on conflict(user_id) do update set revision=excluded.revision,links=excluded.links;
 insert into public.cashflow_settlement_attempts(user_id,request_key,payload,applied_revision) values(owner,p_request_key,requested,current_revision+1);
 return public.load_cashflow_settlements()||jsonb_build_object('appliedRevision',current_revision+1);
end $$;
revoke all on function public.save_cashflow_settlements(text,bigint,jsonb) from public,anon;
grant execute on function public.save_cashflow_settlements(text,bigint,jsonb) to authenticated;
commit;
