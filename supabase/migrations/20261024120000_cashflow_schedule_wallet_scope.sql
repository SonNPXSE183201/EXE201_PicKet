begin;
alter table public.cashflow_schedules add column wallet_id uuid;
alter table public.cashflow_schedules add constraint cashflow_schedules_wallet_owner_fkey
 foreign key(user_id,wallet_id) references public.wallets(user_id,id) on delete set null (wallet_id);
create index cashflow_schedules_wallet_idx on public.cashflow_schedules(wallet_id) where wallet_id is not null;
-- Existing schedules remain unassigned; no wallet is inferred from historical data.
create or replace function public.load_cashflow_schedules() returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare owner uuid:=auth.uid();
begin
 if owner is null or not public.is_account_active() then raise exception 'Unauthorized' using errcode='42501'; end if;
 return jsonb_build_object('schemaVersion',1,
  'revision',coalesce((select revision from public.cashflow_schedule_revisions where user_id=owner),0),
  'schedules',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id',id,'startDay',start_day,'endDay',end_day,'frequency',frequency,
    'amount',amount,'currency',currency,'active',active,'walletId',wallet_id)) order by start_day,id)
    from public.cashflow_schedules where user_id=owner),'[]'::jsonb));
end $$;
revoke all on function public.load_cashflow_schedules() from public,anon;
grant execute on function public.load_cashflow_schedules() to authenticated;

create or replace function public.mutate_cashflow_schedule(p_request_key text,p_expected_revision bigint,p_action text,p_schedule jsonb)
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
     p_schedule-array['id','startDay','endDay','frequency','amount','currency','active','walletId']<>'{}'::jsonb or
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
  if p_schedule ? 'walletId' and
     (jsonb_typeof(p_schedule->'walletId')<>'string' or not exists(
       select 1 from public.wallets w where w.id=(p_schedule->>'walletId')::uuid
       and w.user_id=owner and w.currency_code=p_schedule->>'currency' and w.archived_at is null)) then
   raise exception 'Wallet unavailable or wrong currency' using errcode='22023';
  end if;
  insert into public.cashflow_schedules(user_id,id,start_day,end_day,frequency,amount,currency,active,wallet_id)
  values(owner,schedule_id,(p_schedule->>'startDay')::date,(p_schedule->>'endDay')::date,
   p_schedule->>'frequency',(p_schedule->>'amount')::bigint,p_schedule->>'currency',(p_schedule->>'active')::boolean,(p_schedule->>'walletId')::uuid)
  on conflict(user_id,id) do update set start_day=excluded.start_day,end_day=excluded.end_day,
   frequency=excluded.frequency,amount=excluded.amount,currency=excluded.currency,active=excluded.active,wallet_id=excluded.wallet_id;
 end if;
 update public.cashflow_schedule_revisions set revision=current_revision+1 where user_id=owner;
 result:=jsonb_build_object('appliedRevision',current_revision+1);
 insert into public.cashflow_schedule_attempts(user_id,request_key,payload,result) values(owner,p_request_key,requested,result);
 return public.load_cashflow_schedules() || result;
end $$;
revoke all on function public.mutate_cashflow_schedule(text,bigint,text,jsonb) from public,anon;
grant execute on function public.mutate_cashflow_schedule(text,bigint,text,jsonb) to authenticated;
commit;
