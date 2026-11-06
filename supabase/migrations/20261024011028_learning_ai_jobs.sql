create table public.learning_ai_jobs (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 request_key text not null check(length(request_key) between 8 and 100),
 scenario_id text not null check(scenario_id='cash-gap-v1'),
 locale text not null check(locale in ('vi','en')),
 generation bigint not null,
 status text not null default 'queued' check(status in ('queued','claimed','dispatched','completed','failed','cancelled','expired')),
 lease_token uuid,
 expires_at timestamptz not null default now()+interval '5 minutes',
 created_at timestamptz not null default now(),
 statement_ids text[] check(statement_ids <@ array['timing','buffer','incomplete-records']::text[]),
 unique(owner_id,request_key)
);
create index learning_ai_jobs_queue on public.learning_ai_jobs(created_at) where status='queued';
create index learning_ai_jobs_owner_day on public.learning_ai_jobs(owner_id,created_at);
alter table public.learning_ai_jobs enable row level security;
revoke all on public.learning_ai_jobs from anon,authenticated;
grant select on public.learning_ai_jobs to authenticated;
create policy learning_ai_jobs_owner_read on public.learning_ai_jobs for select to authenticated
 using(owner_id=(select auth.uid()) and (select public.is_account_active()));

-- Counters are deliberately independent of history deletion and consent toggles.
create table public.learning_ai_daily_usage (
 usage_day date primary key,
 requests integer not null default 0 check(requests between 0 and 100)
);
alter table public.learning_ai_daily_usage enable row level security;
revoke all on public.learning_ai_daily_usage from anon,authenticated;

create function public.enqueue_learning_ai_job(p_request_key text,p_scenario_id text,p_locale text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o uuid:=auth.uid(); c public.learning_ai_consents; j public.learning_ai_jobs;
 d date:=(now() at time zone 'UTC')::date; n integer;
begin
 if o is null or not public.is_account_active() then raise exception 'Active account required' using errcode='42501'; end if;
 if p_request_key is null or p_request_key !~ '^[a-zA-Z0-9_-]{8,100}$' or p_scenario_id is distinct from 'cash-gap-v1' or p_locale is null or p_locale not in ('vi','en') then
  raise exception 'Fixed educational case required' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('learning-ai:'||o::text,0));
 select * into c from public.learning_ai_consents where owner_id=o;
 if c.accepted is distinct from true then raise exception 'Explicit consent required' using errcode='42501'; end if;
 select * into j from public.learning_ai_jobs where owner_id=o and request_key=p_request_key;
 if found then
  if j.scenario_id<>p_scenario_id or j.locale<>p_locale then raise exception 'Request key reused' using errcode='PT409'; end if;
  return jsonb_build_object('id',j.id,'status',j.status);
 end if;
 select count(*) into n from public.learning_ai_jobs where owner_id=o and created_at>=d::timestamp at time zone 'UTC';
 if n>=3 then raise exception 'Daily educational limit reached' using errcode='PT429'; end if;
 insert into public.learning_ai_daily_usage(usage_day) values(d) on conflict do nothing;
 update public.learning_ai_daily_usage set requests=requests+1 where usage_day=d and requests<100;
 if not found then raise exception 'Educational service daily limit reached' using errcode='PT429'; end if;
 insert into public.learning_ai_jobs(owner_id,request_key,scenario_id,locale,generation)
 values(o,p_request_key,p_scenario_id,p_locale,c.generation) returning * into j;
 return jsonb_build_object('id',j.id,'status',j.status);
end $$;

create function public.claim_learning_ai_job() returns jsonb
language plpgsql security definer set search_path='' as $$
declare j public.learning_ai_jobs;
begin
 -- Expired dispatched jobs remain terminal: uncertain provider calls never retry.
 update public.learning_ai_jobs set status='expired',statement_ids=null
 where status in ('queued','claimed','dispatched') and expires_at<now();
 select * into j from public.learning_ai_jobs where status='queued' and expires_at>=now()
 order by created_at for update skip locked limit 1;
 if not found then return null; end if;
 update public.learning_ai_jobs set status='claimed',lease_token=gen_random_uuid(),expires_at=now()+interval '45 seconds'
 where id=j.id returning * into j;
 return jsonb_build_object('id',j.id,'leaseToken',j.lease_token,'scenarioId',j.scenario_id,'locale',j.locale);
end $$;

create function public.dispatch_learning_ai_job(p_id uuid,p_lease_token uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare o uuid; n integer;
begin
 select owner_id into o from public.learning_ai_jobs where id=p_id;
 if o is null then return false; end if;
 perform pg_advisory_xact_lock(hashtextextended('learning-ai:'||o::text,0));
 update public.learning_ai_jobs j set status='dispatched'
 where j.id=p_id and j.lease_token=p_lease_token and j.status='claimed' and j.expires_at>=now()
 and exists(select 1 from public.learning_ai_consents c where c.owner_id=o and c.accepted and c.generation=j.generation)
 and exists(select 1 from auth.users u where u.id=o and (u.banned_until is null or u.banned_until<=now()));
 get diagnostics n=row_count;
 return n=1;
end $$;

create function public.finish_learning_ai_job(p_id uuid,p_lease_token uuid,p_statement_ids text[]) returns boolean
language plpgsql security definer set search_path='' as $$
declare o uuid; n integer;
begin
 if p_statement_ids is not null and (cardinality(p_statement_ids) not between 1 and 3
  or not p_statement_ids <@ array['timing','buffer','incomplete-records']::text[]
  or array_position(p_statement_ids,null) is not null
  or cardinality(p_statement_ids)<>(select count(distinct x) from unnest(p_statement_ids) x)) then
  raise exception 'Approved explanation IDs required' using errcode='22023'; end if;
 select owner_id into o from public.learning_ai_jobs where id=p_id;
 if o is null then return false; end if;
 perform pg_advisory_xact_lock(hashtextextended('learning-ai:'||o::text,0));
 update public.learning_ai_jobs j set status=case when p_statement_ids is null then 'failed' else 'completed' end,statement_ids=p_statement_ids
 where j.id=p_id and j.lease_token=p_lease_token and j.status in ('claimed','dispatched') and j.expires_at>=now()
 and (p_statement_ids is null or j.status='dispatched')
 and exists(select 1 from public.learning_ai_consents c where c.owner_id=o and c.accepted and c.generation=j.generation)
 and exists(select 1 from auth.users u where u.id=o and (u.banned_until is null or u.banned_until<=now()));
 get diagnostics n=row_count;
 return n=1;
end $$;

-- Trigger executes inside the consent owner's lock, so completion cannot race
-- revocation into resurrecting output. Accepting again cannot restore old jobs.
create function public.cancel_revoked_learning_ai_jobs() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if not new.accepted then
  update public.learning_ai_jobs set status='cancelled',statement_ids=null
  where owner_id=new.owner_id and status<>'cancelled';
 end if;
 return new;
end $$;
create trigger learning_ai_revoke after update on public.learning_ai_consents
 for each row execute function public.cancel_revoked_learning_ai_jobs();

revoke all on function public.enqueue_learning_ai_job(text,text,text) from public,anon;
grant execute on function public.enqueue_learning_ai_job(text,text,text) to authenticated;
revoke all on function public.claim_learning_ai_job() from public,anon,authenticated;
revoke all on function public.dispatch_learning_ai_job(uuid,uuid) from public,anon,authenticated;
revoke all on function public.finish_learning_ai_job(uuid,uuid,text[]) from public,anon,authenticated;
revoke all on function public.cancel_revoked_learning_ai_jobs() from public,anon,authenticated;
grant execute on function public.claim_learning_ai_job() to service_role;
grant execute on function public.dispatch_learning_ai_job(uuid,uuid) to service_role;
grant execute on function public.finish_learning_ai_job(uuid,uuid,text[]) to service_role;
