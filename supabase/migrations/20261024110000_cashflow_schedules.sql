begin;
create table public.cashflow_schedule_revisions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null default 0 check(revision between 0 and 9007199254740991)
);
create table public.cashflow_schedules (
 user_id uuid not null references auth.users(id) on delete cascade,
 id uuid not null,
 start_day date not null,
 end_day date check(end_day>=start_day),
 frequency text not null check(frequency in ('once','weekly','monthly')),
 amount bigint not null check(amount<>0 and amount between -9000000000000 and 9000000000000),
 currency text not null check(currency ~ '^[A-Z]{3}$'),
 active boolean not null,
 primary key(user_id,id)
);
create table public.cashflow_schedule_attempts (
 user_id uuid not null references auth.users(id) on delete cascade,
 request_key text not null check(request_key ~ '^[A-Za-z0-9._:-]{8,128}$'),
 payload jsonb not null,
 result jsonb not null,
 created_at timestamptz not null default now(),
 primary key(user_id,request_key)
);
alter table public.cashflow_schedule_revisions enable row level security;
alter table public.cashflow_schedules enable row level security;
alter table public.cashflow_schedule_attempts enable row level security;
create policy cashflow_revision_owner on public.cashflow_schedule_revisions for select to authenticated
 using(user_id=(select auth.uid()) and (select public.is_account_active()));
create policy cashflow_schedule_owner on public.cashflow_schedules for select to authenticated
 using(user_id=(select auth.uid()) and (select public.is_account_active()));
create policy cashflow_attempt_owner on public.cashflow_schedule_attempts for select to authenticated
 using(user_id=(select auth.uid()) and (select public.is_account_active()));
revoke all on public.cashflow_schedule_revisions,public.cashflow_schedules,public.cashflow_schedule_attempts from public,anon,authenticated;
grant select on public.cashflow_schedule_revisions,public.cashflow_schedules,public.cashflow_schedule_attempts to authenticated;

create function public.load_cashflow_schedules() returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare owner uuid:=auth.uid();
begin
 if owner is null or not public.is_account_active() then raise exception 'Unauthorized' using errcode='42501'; end if;
 return jsonb_build_object('schemaVersion',1,
  'revision',coalesce((select revision from public.cashflow_schedule_revisions where user_id=owner),0),
  'schedules',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id',id,'startDay',start_day,'endDay',end_day,'frequency',frequency,
    'amount',amount,'currency',currency,'active',active)) order by start_day,id)
    from public.cashflow_schedules where user_id=owner),'[]'::jsonb));
end $$;
revoke all on function public.load_cashflow_schedules() from public,anon;
grant execute on function public.load_cashflow_schedules() to authenticated;

create function public.mutate_cashflow_schedule(p_request_key text,p_expected_revision bigint,p_action text,p_schedule jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 owner uuid:=auth.uid(); previous public.cashflow_schedule_attempts;
 current_revision bigint; requested jsonb; result jsonb; schedule_id uuid;
begin
 if owner is null or not public.is_account_active() then raise exception 'Unauthorized' using errcode='42501'; end if;
 if p_request_key is null or p_request_key !~ '^[A-Za-z0-9._:-]{8,128}$' or
    p_expected_revision is null or p_expected_revision<0 or p_expected_revision>=9007199254740991 or
    p_action is null or p_action not in ('save','remove') or p_schedule is null or jsonb_typeof(p_schedule)<>'object' then
  raise exception 'Invalid schedule mutation' using errcode='22023';
 end if;
 if not (p_schedule ? 'id') or jsonb_typeof(p_schedule->'id')<>'string' then raise exception 'Schedule ID required' using errcode='22023'; end if;
 schedule_id:=(p_schedule->>'id')::uuid;
 requested:=jsonb_build_object('revision',p_expected_revision,'action',p_action,'schedule',p_schedule);
 -- Serialize all changes in one owner's document, including first creation.
 perform pg_advisory_xact_lock(hashtextextended('cashflow-schedules:'||owner::text,0));
 select * into previous from public.cashflow_schedule_attempts where user_id=owner and request_key=p_request_key;
 if found then
  if previous.payload is distinct from requested then raise exception 'Schedule request key mismatch' using errcode='23505'; end if;
  return public.load_cashflow_schedules() || previous.result;
 end if;
 insert into public.cashflow_schedule_revisions(user_id) values(owner) on conflict do nothing;
 select revision into current_revision from public.cashflow_schedule_revisions where user_id=owner for update;
 if current_revision<>p_expected_revision then raise exception 'Schedule revision conflict' using errcode='23514'; end if;
 if p_action='remove' then
  if p_schedule-'id'<>'{}'::jsonb then raise exception 'Invalid remove fields' using errcode='22023'; end if;
  delete from public.cashflow_schedules where user_id=owner and id=schedule_id;
  if not found then raise exception 'Schedule not found' using errcode='22023'; end if;
 else
  if not (p_schedule ?& array['id','startDay','frequency','amount','currency','active']) or
     p_schedule-array['id','startDay','endDay','frequency','amount','currency','active']<>'{}'::jsonb or
     jsonb_typeof(p_schedule->'startDay')<>'string' or p_schedule->>'startDay' !~ '^\d{4}-\d{2}-\d{2}$' or
     jsonb_typeof(p_schedule->'frequency')<>'string' or jsonb_typeof(p_schedule->'currency')<>'string' or
     jsonb_typeof(p_schedule->'amount')<>'number' or p_schedule->>'amount' !~ '^-?[0-9]+$' or
     jsonb_typeof(p_schedule->'active')<>'boolean' or
     (p_schedule ? 'endDay' and jsonb_typeof(p_schedule->'endDay')<>'null' and
       (jsonb_typeof(p_schedule->'endDay')<>'string' or p_schedule->>'endDay' !~ '^\d{4}-\d{2}-\d{2}$')) then
   raise exception 'Invalid schedule fields' using errcode='22023';
  end if;
  if not exists(select 1 from public.cashflow_schedules where user_id=owner and id=schedule_id) and
     (select count(*) from public.cashflow_schedules where user_id=owner)>=1000 then
   raise exception 'Schedule limit reached' using errcode='22023';
  end if;
  insert into public.cashflow_schedules(user_id,id,start_day,end_day,frequency,amount,currency,active)
  values(owner,schedule_id,(p_schedule->>'startDay')::date,(p_schedule->>'endDay')::date,
   p_schedule->>'frequency',(p_schedule->>'amount')::bigint,p_schedule->>'currency',(p_schedule->>'active')::boolean)
  on conflict(user_id,id) do update set start_day=excluded.start_day,end_day=excluded.end_day,
   frequency=excluded.frequency,amount=excluded.amount,currency=excluded.currency,active=excluded.active;
 end if;
 update public.cashflow_schedule_revisions set revision=current_revision+1 where user_id=owner;
 result:=jsonb_build_object('appliedRevision',current_revision+1);
 insert into public.cashflow_schedule_attempts(user_id,request_key,payload,result) values(owner,p_request_key,requested,result);
 return public.load_cashflow_schedules() || result;
end $$;
revoke all on function public.mutate_cashflow_schedule(text,bigint,text,jsonb) from public,anon;
grant execute on function public.mutate_cashflow_schedule(text,bigint,text,jsonb) to authenticated;
commit;
