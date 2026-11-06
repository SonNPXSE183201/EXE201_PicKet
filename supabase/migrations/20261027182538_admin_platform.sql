-- Private implementation routines are not exposed as PostgREST endpoints.
create schema if not exists picket_private;
revoke all on schema picket_private from public, anon;
grant usage on schema picket_private to authenticated, service_role;

alter table public.staff_members add column role text not null default 'owner'
 check (role in ('owner','operations','support','analyst','content'));
alter table public.admin_audit add column reason text;
alter table public.admin_audit add column request_id uuid;
alter table public.admin_audit add column details jsonb not null default '{}'::jsonb;
alter table public.app_settings add column row_version integer not null default 1;
alter table public.app_settings add column disk_warning_percent integer not null default 85 check(disk_warning_percent between 60 and 99);
alter table public.app_settings add column probe_timeout_seconds integer not null default 8 check(probe_timeout_seconds between 2 and 20);
alter table public.app_settings add column stale_minutes integer not null default 15 check(stale_minutes between 5 and 60);
alter table public.app_settings add column analytics_retention_days integer not null default 90 check(analytics_retention_days between 30 and 90);
alter table public.app_settings add column aggregate_retention_months integer not null default 13 check(aggregate_retention_months between 3 and 13);
alter table public.partner_ads add column row_version integer not null default 1;
-- Existing purchases remain unknown until verified again by Google; never
-- silently label historical license tests as paid customers.
alter table public.play_purchases add column is_test boolean;
alter table public.play_purchases add column subscription_state text;
alter table public.play_purchases add column acknowledgement_state text;
alter table public.play_purchases add column metadata_verified_at timestamptz;
create function public.record_play_purchase_metadata(p_hash text,p_user uuid,p_is_test boolean,p_state text,p_ack text)returns void
language plpgsql security definer set search_path=''as $$begin
 if p_is_test is null or p_state is null or p_ack is null or p_state not in('SUBSCRIPTION_STATE_UNSPECIFIED','SUBSCRIPTION_STATE_PENDING','SUBSCRIPTION_STATE_ACTIVE','SUBSCRIPTION_STATE_PAUSED','SUBSCRIPTION_STATE_IN_GRACE_PERIOD','SUBSCRIPTION_STATE_ON_HOLD','SUBSCRIPTION_STATE_CANCELED','SUBSCRIPTION_STATE_EXPIRED','SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED')or p_ack not in('ACKNOWLEDGEMENT_STATE_UNSPECIFIED','ACKNOWLEDGEMENT_STATE_PENDING','ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED')then raise exception 'Invalid purchase metadata'using errcode='22023';end if;
 update public.play_purchases set is_test=p_is_test,subscription_state=p_state,acknowledgement_state=p_ack,metadata_verified_at=now()where token_hash=p_hash and user_id=p_user;
 if not found then raise exception 'Verified purchase not found'using errcode='22023';end if;
end $$;
revoke all on function public.record_play_purchase_metadata(text,uuid,boolean,text,text)from public,anon,authenticated;
grant execute on function public.record_play_purchase_metadata(text,uuid,boolean,text,text)to service_role;
create index admin_audit_created_idx on public.admin_audit(created_at desc,id desc);
create index ocr_events_created_idx on public.ocr_events(created_at desc);

create table public.admin_tickets (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(title) between 1 and 160),
 body text not null default '' check(length(body)<=4000),
 status text not null default 'open' check(status in ('open','in_progress','resolved','closed')),
 priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),
 category text not null default 'support' check(category in('support','bug','billing','account_deletion')),
 target_user uuid references auth.users(id) on delete set null,
 assignee uuid references auth.users(id) on delete set null,
 row_version integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index admin_tickets_status_idx on public.admin_tickets(status,updated_at desc,id);
create table public.admin_records (
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in ('incident','release','content')),
 title text not null check(length(title) between 1 and 160),
 body text not null default '' check(length(body)<=10000),
 status text not null default 'draft' check(status in ('draft','review','published','open','investigating','resolved','archived')),
 details jsonb not null default '{}'::jsonb check(jsonb_typeof(details)='object' and octet_length(details::text)<=16000),
 row_version integer not null default 1,updated_by uuid references auth.users(id)on delete set null,
 reviewed_by uuid references auth.users(id)on delete set null,reviewed_hash text,reviewed_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index admin_records_kind_idx on public.admin_records(kind,updated_at desc,id);
create table public.admin_ticket_comments(
 id bigint generated always as identity primary key,ticket_id uuid not null references public.admin_tickets(id)on delete cascade,
 author uuid references auth.users(id)on delete set null,body text not null check(length(body)between 1 and 2000),created_at timestamptz not null default now()
);
create index admin_ticket_comments_ticket_idx on public.admin_ticket_comments(ticket_id,created_at desc);
create table public.admin_mutation_requests (
 actor uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null, fingerprint text not null, result jsonb not null,
 created_at timestamptz not null default now(),primary key(actor,request_id)
);
create table public.app_analytics_events (
 id uuid primary key,
 event text not null check(event in ('landing_view','apk_click','app_open','first_open','meaningful_action')),
 session_id uuid not null,
 user_id uuid references auth.users(id) on delete set null,
 environment text not null check(environment in ('production','test')),
 version text not null default '' check(length(version)<=40),
 channel text not null default 'unknown' check(channel in ('landing','direct','google_play','unknown')),
 campaign text not null default '' check(length(campaign)<=120),
 created_at timestamptz not null default now()
);
create index app_analytics_created_idx on public.app_analytics_events(created_at,event);
create index app_analytics_user_idx on public.app_analytics_events(user_id,created_at desc) where user_id is not null;
create index app_analytics_session_idx on public.app_analytics_events(session_id,created_at desc);
-- Bounded per-user activity projection avoids sorting raw event history on
-- every dashboard request. Statement trigger also handles import batches.
create table public.admin_user_activity(
 user_id uuid primary key references auth.users(id)on delete cascade,
 last_seen_at timestamptz not null,last_meaningful_at timestamptz,first_open_at timestamptz,
 version text not null default ''check(length(version)<=40),version_observed_at timestamptz
);
alter table public.admin_user_activity enable row level security;
revoke all on public.admin_user_activity from public,anon,authenticated;
grant all on public.admin_user_activity to service_role;
create function picket_private.project_admin_activity()returns trigger
language plpgsql security definer set search_path=''as $$begin
 with summary as(select user_id,max(created_at)as seen,max(created_at)filter(where event='meaningful_action')as meaningful,min(created_at)filter(where event='first_open')as first_open from new_events where user_id is not null and environment='production'group by user_id),
 versions as(select distinct on(user_id)user_id,version,created_at from new_events where user_id is not null and environment='production'and version<>''order by user_id,created_at desc)
 insert into public.admin_user_activity(user_id,last_seen_at,last_meaningful_at,first_open_at,version,version_observed_at)
 select s.user_id,s.seen,s.meaningful,s.first_open,coalesce(v.version,''),v.created_at from summary s left join versions v using(user_id)
 on conflict(user_id)do update set last_seen_at=greatest(admin_user_activity.last_seen_at,excluded.last_seen_at),last_meaningful_at=greatest(admin_user_activity.last_meaningful_at,excluded.last_meaningful_at),first_open_at=least(admin_user_activity.first_open_at,excluded.first_open_at),version=case when excluded.version_observed_at>=coalesce(admin_user_activity.version_observed_at,'-infinity'::timestamptz)then excluded.version else admin_user_activity.version end,version_observed_at=greatest(admin_user_activity.version_observed_at,excluded.version_observed_at);
 return null;
end $$;
revoke all on function picket_private.project_admin_activity()from public,anon,authenticated;
create trigger project_admin_activity after insert on public.app_analytics_events referencing new table as new_events for each statement execute function picket_private.project_admin_activity();
create table public.admin_daily_metrics (
 source text not null check(length(source)<=80),metric text not null check(length(metric)<=80),day date not null,
 dimension text not null default '' check(length(dimension)<=160),environment text not null default 'production' check(environment in ('production','test')),
 value numeric not null check(value>=0),source_timezone text not null default 'UTC',
 observed_at timestamptz not null default now(),primary key(source,metric,day,dimension,environment)
);
create table public.admin_integration_runs (
 source text primary key check(length(source)<=80),status text not null check(status in ('ok','error','not_configured')),
 message text not null default '' check(length(message)<=500),updated_at timestamptz not null default now(),
 last_success_at timestamptz,checkpoint text check(length(checkpoint)<=500)
);
create table public.admin_health_samples (
 id bigint generated always as identity primary key,
 component text not null check(length(component)<=80),checked_at timestamptz not null default clock_timestamp(),
 status text not null check(status in ('ok','degraded','down','unknown')),
 latency_ms integer check(latency_ms between 0 and 120000),
 message text not null default '' check(length(message)<=300)
);
create index admin_health_latest_idx on public.admin_health_samples(component,checked_at desc,id desc);
create table public.admin_exports (
 id uuid primary key default gen_random_uuid(),actor uuid not null references auth.users(id)on delete cascade,
 section text not null,filters jsonb not null default '{}'::jsonb,
 status text not null default 'queued'check(status in('queued','ready','failed')),
 result jsonb,created_at timestamptz not null default now(),expires_at timestamptz,
 request_id uuid not null,unique(actor,request_id)
);
create index admin_exports_queue_idx on public.admin_exports(created_at)where status='queued';
create table public.admin_revoked_sessions(session_id uuid primary key,user_id uuid not null references auth.users(id)on delete cascade,revoked_at timestamptz not null default now());
do $$ declare t text; begin
 foreach t in array array['admin_tickets','admin_records','admin_mutation_requests','app_analytics_events','admin_daily_metrics','admin_integration_runs','admin_health_samples','admin_exports','admin_ticket_comments','admin_revoked_sessions'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;

-- A refreshed JWT keeps its session_id. Revocation therefore remains effective
-- across refreshes, while a new interactive sign-in creates a new session.
create or replace function public.is_account_active()returns boolean language sql stable security definer set search_path=''as $$
 select exists(select 1 from auth.users where id=auth.uid()and(banned_until is null or banned_until<=now()))and not exists(select 1 from public.admin_revoked_sessions where user_id=auth.uid()and session_id=nullif(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'session_id','')::uuid)
 and(nullif(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'session_id','')is null or exists(select 1 from auth.sessions where id=(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'session_id')::uuid and user_id=auth.uid()))
$$;

create function picket_private.admin_role() returns text language sql stable security definer set search_path='' as $$
 select s.role from public.staff_members s where s.user_id=auth.uid() and public.is_account_active()
$$;
create function picket_private.admin_require(p_capability text,p_sensitive boolean default false) returns void
language plpgsql stable security definer set search_path='' as $$
declare r text:=picket_private.admin_role(); begin
 if r is null or not (r='owner' or
  (r='operations' and p_capability in ('overview','users','billing','ocr','health','releases','incidents','tickets','audit','settings','integrations','acquisition','engagement')) or
  (r='support' and p_capability in ('overview','users','billing','tickets','audit')) or
  (r='analyst' and p_capability in ('overview','acquisition','engagement','ocr','integrations')) or
  (r='content' and p_capability in ('overview','content','partners'))) then
  raise exception 'Administrative permission required' using errcode='42501';
 end if;
 if p_sensitive and coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'aal','aal1')<>'aal2' then
  raise exception 'MFA verification required' using errcode='42501';
 end if;
end $$;
create function picket_private.account_access() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r text; begin
 if auth.uid() is null or not public.is_account_active() then raise exception 'Active account required' using errcode='42501'; end if;
 if not exists(select 1 from auth.users where id=auth.uid()and email_confirmed_at is not null)then raise exception 'Verified email required'using errcode='42501';end if;
 select role into r from public.staff_members where user_id=auth.uid();
 return jsonb_build_object('staff',r is not null,'role',r,'mobileAllowed',r is null,
  'mfaVerified',coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'aal','aal1')='aal2');
end $$;
create function public.account_access() returns jsonb language sql stable security invoker set search_path='' as $$ select picket_private.account_access() $$;

create function picket_private.admin_user_filter(p_user auth.users,p_filters jsonb)returns boolean
language plpgsql stable security definer set search_path=''as $$
declare v_tier text;v_effective text;begin
 v_tier:=coalesce(p_filters->>'tier','');
 if v_tier not in('','free','plus','pro')or length(coalesce(p_filters->>'version',''))>40 then raise exception 'Invalid user filter'using errcode='22023';end if;
 if coalesce(p_filters->>'createdFrom','')<>''and p_user.created_at<((p_filters->>'createdFrom')::date::timestamp at time zone 'Asia/Ho_Chi_Minh')then return false;end if;
 if coalesce(p_filters->>'createdTo','')<>''and p_user.created_at>=(((p_filters->>'createdTo')::date+1)::timestamp at time zone 'Asia/Ho_Chi_Minh')then return false;end if;
 if coalesce(p_filters->>'version','')<>''and coalesce((select version from public.admin_user_activity where user_id=p_user.id),'')<>p_filters->>'version'then return false;end if;
 if v_tier<>''then
  select tier into v_effective from(select tier from public.play_purchases where user_id=p_user.id and active and expires_at>now()and verified_at>now()-interval '24 hours'union all select tier from public.plan_grants where user_id=p_user.id and expires_at>now())p order by case tier when'pro'then 3 when'plus'then 2 else 1 end desc limit 1;
  if coalesce(v_effective,'free')<>v_tier then return false;end if;
 end if;
 return true;
end $$;
revoke all on function picket_private.admin_user_filter(auth.users,jsonb)from public,anon,authenticated;

create function picket_private.admin_portal(p_section text,p_filters jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' set work_mem='16MB' as $$
declare v_page integer:=coalesce((p_filters->>'page')::integer,0);
 v_days integer:=coalesce((p_filters->>'days')::integer,30);
 v_since timestamptz; v_result jsonb; v_search text:=lower(trim(coalesce(p_filters->>'search','')));
 v_status text:=coalesce(p_filters->>'status',''); v_kind text;
begin
 perform picket_private.admin_require(p_section);
 if v_page<0 or v_page>10000 or v_days not in (7,30,90) or length(v_search)>160 or jsonb_typeof(p_filters)<>'object' then
  raise exception 'Invalid filters' using errcode='22023'; end if;
 v_since:=(date_trunc('day',now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh')-(v_days-1)*interval '1 day';
 if p_section='overview' then
  select jsonb_build_object('totalUsers',(select count(*) from auth.users u where not exists(select 1 from public.staff_members s where s.user_id=u.id)),
   'newUsers',(select count(*) from auth.users u where u.created_at>=v_since and not exists(select 1 from public.staff_members s where s.user_id=u.id)),
   'newUsersPrevious',(select count(*)from auth.users u where u.created_at>=v_since-v_days*interval '1 day'and u.created_at<now()-v_days*interval '1 day'and not exists(select 1 from public.staff_members s where s.user_id=u.id)),
   'health',coalesce((select jsonb_agg(x)from(select distinct on(component)component,status,checked_at from public.admin_health_samples order by component,checked_at desc,id desc)x),'[]'::jsonb),
   'verifiedUsers',(select count(*) from auth.users u where email_confirmed_at is not null and not exists(select 1 from public.staff_members s where s.user_id=u.id)),
   'paidUsers',(select count(distinct user_id) from public.play_purchases where active and expires_at>now()and verified_at>now()-interval '24 hours'and is_test=false),
   'testUsers',(select count(distinct user_id)from public.play_purchases where active and expires_at>now()and verified_at>now()-interval '24 hours'and is_test=true),
   'unknownPurchaseUsers',(select count(distinct user_id)from public.play_purchases where active and expires_at>now()and verified_at>now()-interval '24 hours'and is_test is null),
   'openTickets',(select count(*) from public.admin_tickets where status in ('open','in_progress')),
   'openIncidents',(select count(*) from public.admin_records where kind='incident' and status in ('open','investigating')),
   'dailyUsers',coalesce((select jsonb_agg(x) from(select d.day::date as day,coalesce(g.value,0)as value from generate_series((v_since at time zone 'Asia/Ho_Chi_Minh')::date,(now()at time zone 'Asia/Ho_Chi_Minh')::date,interval '1 day')d(day)left join(select(u.created_at at time zone 'Asia/Ho_Chi_Minh')::date as day,count(*)as value from auth.users u where u.created_at>=v_since and not exists(select 1 from public.staff_members s where s.user_id=u.id)group by 1)g on g.day=d.day::date order by d.day)x),'[]'::jsonb)) into v_result;
 elsif p_section in ('users','user') then
  if coalesce(p_filters->>'sort','newest')not in('newest','oldest','email')then raise exception 'Invalid sort'using errcode='22023';end if;
  select jsonb_build_object('total',count(*),'rows',coalesce(jsonb_agg(x order by case when p_filters->>'sort'='oldest'then x.created_at end asc,case when p_filters->>'sort'='email'then lower(x.email)end asc,case when coalesce(p_filters->>'sort','newest')='newest'then x.created_at end desc,x.id),'[]'::jsonb)) into v_result
  from (select u.id,u.email,u.created_at,u.email_confirmed_at,u.last_sign_in_at,u.banned_until,s.role,
   (select a.last_seen_at from public.admin_user_activity a where a.user_id=u.id)as last_activity_at,
   (select a.version from public.admin_user_activity a where a.user_id=u.id)as app_version,
   coalesce((select pp.tier from public.play_purchases pp where pp.user_id=u.id and pp.active and pp.expires_at>now()and pp.verified_at>now()-interval '24 hours' order by case pp.tier when 'pro' then 2 else 1 end desc limit 1),'free') as play_tier,
   (select jsonb_build_object('tier',pg.tier,'expires_at',pg.expires_at) from public.plan_grants pg where pg.user_id=u.id and pg.expires_at>now()) as grant
   from auth.users u left join public.staff_members s on s.user_id=u.id
   where (case when p_filters ?| array['tier','version','createdFrom','createdTo']then picket_private.admin_user_filter(u,p_filters)else true end)and (v_search='' or strpos(lower(coalesce(u.email,'')),v_search)>0 or u.id::text=v_search)
    and (p_filters->>'userId' is null or u.id=(p_filters->>'userId')::uuid)
    and (v_status='' or (v_status='suspended' and u.banned_until>now()) or (v_status='active' and (u.banned_until is null or u.banned_until<=now())))
   order by case when p_filters->>'sort'='oldest'then u.created_at end asc,case when p_filters->>'sort'='email'then lower(u.email)end asc,case when coalesce(p_filters->>'sort','newest')='newest'then u.created_at end desc,u.id limit 25 offset v_page*25) x;
  -- Total must describe the full filtered result, not just the current page.
  v_result:=jsonb_set(v_result,'{total}',to_jsonb((select count(*) from auth.users u where (case when p_filters ?| array['tier','version','createdFrom','createdTo']then picket_private.admin_user_filter(u,p_filters)else true end)and
   (v_search='' or strpos(lower(coalesce(u.email,'')),v_search)>0 or u.id::text=v_search)
   and(p_filters->>'userId' is null or u.id=(p_filters->>'userId')::uuid)
   and(v_status='' or(v_status='suspended' and u.banned_until>now())or(v_status='active' and(u.banned_until is null or u.banned_until<=now()))))));
 if p_filters->>'userId'is not null then
   v_result:=v_result||jsonb_build_object(
    'timeline',coalesce((select jsonb_agg(x)from(select action,reason,created_at,details from public.admin_audit where target=p_filters->>'userId'order by created_at desc limit 50)x),'[]'::jsonb),
    'tickets',coalesce((select jsonb_agg(x)from(select id,title,status,priority,updated_at from public.admin_tickets where target_user=(p_filters->>'userId')::uuid order by updated_at desc limit 25)x),'[]'::jsonb),
    'quota',coalesce((select jsonb_agg(x)from(select date_trunc('day',created_at)as day,count(*)as attempts,count(*)filter(where success)as successful from public.ocr_events where user_id=(p_filters->>'userId')::uuid and created_at>=v_since group by 1 order by 1 desc)x),'[]'::jsonb));
 end if;
 elsif p_section in ('acquisition','engagement') then
  select jsonb_build_object('events',coalesce((select jsonb_agg(x) from(select (created_at at time zone 'Asia/Ho_Chi_Minh')::date as day,event,channel,count(*) as events,count(distinct session_id) as sessions,count(distinct user_id) as users from public.app_analytics_events where created_at>=v_since and environment='production'and event in('landing_view','apk_click','app_open','first_open') group by 1,2,3 order by 1)x),'[]'::jsonb),
   'metrics',coalesce((select jsonb_agg(x) from(select source,metric,day,sum(value) as value,source_timezone,max(observed_at) as observed_at from public.admin_daily_metrics where day>=v_since::date and environment='production'and source in('google_play_installs','apk_access') group by source,metric,day,source_timezone order by day)x),'[]'::jsonb),
   'activity',(select jsonb_build_object('dau',count(*) filter(where last_activity>=now()-interval '1 day'),'wau',count(*) filter(where last_activity>=now()-interval '7 days'),'mau',count(*))from(select last_meaningful_at as last_activity from public.admin_user_activity a where last_meaningful_at>=now()-interval '30 days'and not exists(select 1 from public.staff_members s where s.user_id=a.user_id))a),
   'integrations',coalesce((select jsonb_agg(r) from public.admin_integration_runs r),'[]'::jsonb),
   'firstObservedAt',(select min(created_at) from public.app_analytics_events where environment='production')) into v_result;
 elsif p_section='billing' then
  select jsonb_build_object('rows',coalesce((select jsonb_agg(x) from(select user_id,product_id,tier,expires_at,active,verified_at,is_test,subscription_state,acknowledgement_state,metadata_verified_at from public.play_purchases order by verified_at desc,user_id limit 25 offset v_page*25)x),'[]'::jsonb),'total',(select count(*) from public.play_purchases),
   'grants',coalesce((select jsonb_agg(x) from(select user_id,tier,expires_at,granted_by from public.plan_grants order by expires_at desc limit 25 offset v_page*25)x),'[]'::jsonb)) into v_result;
 elsif p_section='ocr' then
  select jsonb_build_object('rows',coalesce(jsonb_agg(x),'[]'::jsonb)) into v_result from(select (created_at at time zone 'Asia/Ho_Chi_Minh')::date as day,count(*) as scans,count(*) filter(where success) as successful,round(avg(duration_ms)) as average_ms,percentile_disc(0.95) within group(order by duration_ms) as p95_ms from public.ocr_events where created_at>=v_since group by 1 order by 1 desc)x;
 elsif p_section='audit' then
  select jsonb_build_object('rows',coalesce((select jsonb_agg(x) from(select id,actor,action,target,reason,created_at,request_id,details from public.admin_audit where created_at>=v_since and(v_search='' or strpos(lower(action),v_search)>0 or target=v_search) order by id desc limit 25 offset v_page*25)x),'[]'::jsonb),'total',(select count(*) from public.admin_audit where created_at>=v_since and(v_search='' or strpos(lower(action),v_search)>0 or target=v_search))) into v_result;
 elsif p_section='tickets' then
  select jsonb_build_object('rows',coalesce((select jsonb_agg(x) from(select * from public.admin_tickets where(v_status='' or status=v_status)and(v_search='' or strpos(lower(title),v_search)>0) order by updated_at desc,id limit 25 offset v_page*25)x),'[]'::jsonb),'total',(select count(*) from public.admin_tickets where(v_status='' or status=v_status)and(v_search='' or strpos(lower(title),v_search)>0))) into v_result;
 elsif p_section in ('incidents','releases','content') then
  v_kind:=case p_section when 'incidents' then 'incident' when 'releases' then 'release' else 'content' end;
  select jsonb_build_object('rows',coalesce((select jsonb_agg(x) from(select * from public.admin_records where kind=v_kind and(v_status='' or status=v_status)and(v_search='' or strpos(lower(title),v_search)>0) order by updated_at desc,id limit 25 offset v_page*25)x),'[]'::jsonb),'total',(select count(*) from public.admin_records where kind=v_kind and(v_status='' or status=v_status)and(v_search='' or strpos(lower(title),v_search)>0))) into v_result;
 elsif p_section='health' then
  select jsonb_build_object('rows',coalesce((select jsonb_agg(x) from(select distinct on(component) component,status,latency_ms,message,checked_at from public.admin_health_samples order by component,checked_at desc)x),'[]'::jsonb),'history',coalesce((select jsonb_agg(x) from(select component,status,latency_ms,checked_at from public.admin_health_samples where checked_at>now()-interval '1 day' order by checked_at desc limit 300)x),'[]'::jsonb)) into v_result;
 elsif p_section='integrations' then select jsonb_build_object('rows',coalesce(jsonb_agg(r),'[]'::jsonb)) into v_result from public.admin_integration_runs r;
 elsif p_section='staff' then select jsonb_build_object('rows',coalesce(jsonb_agg(x),'[]'::jsonb)) into v_result from(select s.user_id,s.role,u.email from public.staff_members s join auth.users u on u.id=s.user_id order by s.role,s.user_id)x;
 elsif p_section='settings' then select jsonb_build_object('settings',to_jsonb(s)) into v_result from public.app_settings s where id;
 elsif p_section='partners' then select jsonb_build_object('rows',coalesce(jsonb_agg(x),'[]'::jsonb)) into v_result from(select id,title,body,url,active,starts_at,ends_at,row_version from public.partner_ads order by created_at desc limit 100)x;
 else raise exception 'Unknown administrative section' using errcode='22023';
 end if;
 if p_section='tickets'then v_result:=v_result||jsonb_build_object('comments',coalesce((select jsonb_agg(c)from(select id,ticket_id,author,body,created_at from public.admin_ticket_comments where ticket_id in(select (value->>'id')::uuid from jsonb_array_elements(v_result->'rows'))order by created_at desc limit 200)c),'[]'::jsonb));end if;
 if p_section='content'then v_result:=v_result||jsonb_build_object('lessons',coalesce((select jsonb_agg(x)from(select lesson_id,content_version,published from public.learning_answer_keys order by lesson_id,content_version)x),'[]'::jsonb));end if;
 if p_section='engagement'then
  v_result:=v_result||jsonb_build_object('versions',coalesce((select jsonb_agg(x)from(select version,count(*)as users from(select version from public.admin_user_activity a where last_seen_at>=v_since and version<>''and not exists(select 1 from public.staff_members s where s.user_id=a.user_id))a group by version)x),'[]'::jsonb),
   'retention',coalesce((select jsonb_agg(x)from(select n as day,count(*)filter(where first_day<=(now()at time zone'Asia/Ho_Chi_Minh')::date-n)as eligible,count(*)filter(where first_day<=(now()at time zone'Asia/Ho_Chi_Minh')::date-n and exists(select 1 from public.app_analytics_events e where e.user_id=c.user_id and e.event='meaningful_action'and e.environment='production'and(e.created_at at time zone'Asia/Ho_Chi_Minh')::date=c.first_day+n))as retained from(values(1),(7),(30))d(n)cross join(select user_id,(first_open_at at time zone'Asia/Ho_Chi_Minh')::date as first_day from public.admin_user_activity a where first_open_at>=v_since and not exists(select 1 from public.staff_members s where s.user_id=a.user_id))c group by n order by n)x),'[]'::jsonb),
   'funnel',jsonb_build_object('registered',(select count(*)from auth.users u where created_at>=v_since and not exists(select 1 from public.staff_members s where s.user_id=u.id)),'verified',(select count(*)from auth.users u where created_at>=v_since and email_confirmed_at is not null and not exists(select 1 from public.staff_members s where s.user_id=u.id)),'observedActive',(select count(*)from public.admin_user_activity a where last_meaningful_at>=v_since and not exists(select 1 from public.staff_members s where s.user_id=a.user_id))));
 end if;
 if p_section in('health','ocr')then v_result:=v_result||jsonb_build_object('diagnostics',coalesce((select jsonb_agg(x)from(select metric,day,value,observed_at from public.admin_daily_metrics where source='backend_diagnostics'and day>=v_since::date order by day desc limit 300)x),'[]'::jsonb));end if;
 if p_section='health'then v_result:=v_result||jsonb_build_object('staleMinutes',(select stale_minutes from public.app_settings where id),
 'vitals',coalesce((select jsonb_agg(m)from(select metric,day,value,source_timezone,observed_at from public.admin_daily_metrics where source='google_play_vitals'and day>=v_since::date order by day desc)m),'[]'::jsonb),
 'queue',coalesce((select jsonb_agg(x)from(select'ocr'as queue,status,count(*)as jobs from public.ocr_fallback_jobs group by status union all select'learning'as queue,status,count(*)as jobs from public.learning_ai_jobs group by status)x),'[]'::jsonb),
 'probeSuccess',coalesce((select jsonb_agg(x)from(select component,count(*)as samples,count(*)filter(where status='ok')as successful from public.admin_health_samples where checked_at>now()-interval '1 day'group by component)x),'[]'::jsonb));end if;
 if p_section='billing'and picket_private.admin_role()in('owner','operations')then v_result:=v_result||jsonb_build_object('financialAccess',true,'sales',coalesce((select jsonb_agg(m)from(select day,metric,dimension as currency,value,observed_at from public.admin_daily_metrics where source='google_play_financial'and day>=v_since::date order by day desc)m),'[]'::jsonb));end if;
 return coalesce(v_result,'{}'::jsonb)||jsonb_build_object('asOf',now(),'days',v_days,'page',v_page,'timezone','Asia/Ho_Chi_Minh');
end $$;
create function public.admin_portal(p_section text,p_filters jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$ select picket_private.admin_portal(p_section,p_filters) $$;

create function picket_private.admin_exports(p_id uuid default null,p_section text default null,p_filters jsonb default '{}'::jsonb,p_reason text default null,p_request_id uuid default null)returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.admin_exports;v_created boolean;begin
 if p_section is not null then
  if p_section not in('users','billing','ocr','audit','tickets','acquisition','engagement')then raise exception 'Export not supported'using errcode='22023';end if;
  perform picket_private.admin_require(p_section,true);
  if p_request_id is null or length(trim(coalesce(p_reason,'')))not between 5 and 500 then raise exception 'Export reason required'using errcode='22023';end if;
  perform picket_private.admin_portal(p_section,p_filters);
  insert into public.admin_exports(actor,section,filters,request_id)values(auth.uid(),p_section,p_filters,p_request_id)on conflict(actor,request_id)do nothing returning true into v_created;
  select * into r from public.admin_exports where actor=auth.uid()and request_id=p_request_id;
  if r.section<>p_section or r.filters<>p_filters then raise exception 'Request key reused'using errcode='22023';end if;
  if v_created then insert into public.admin_audit(actor,action,target,reason,request_id)values(auth.uid(),'export_requested',r.id::text,p_reason,p_request_id);end if;
  return jsonb_build_object('id',r.id,'status',r.status);
 elsif p_id is not null then
  select * into r from public.admin_exports where id=p_id and actor=auth.uid();
  if not found then raise exception 'Export not found'using errcode='42501';end if;
  perform picket_private.admin_require(r.section,true);
  if r.status<>'ready'or r.expires_at<=now()then return jsonb_build_object('id',r.id,'status',case when r.expires_at<=now()then'expired'else r.status end);end if;
  insert into public.admin_audit(actor,action,target)values(auth.uid(),'export_download',r.id::text);
  return jsonb_build_object('id',r.id,'section',r.section,'status','ready','data',r.result,'expiresAt',r.expires_at);
 else
  perform picket_private.admin_require('overview');
  return jsonb_build_object('rows',coalesce((select jsonb_agg(x)from(select id,section,case when expires_at<=now()then'expired'else status end as status,created_at,expires_at from public.admin_exports where actor=auth.uid()order by created_at desc limit 25)x),'[]'::jsonb));
 end if;
end $$;
create function public.admin_exports(p_id uuid default null,p_section text default null,p_filters jsonb default '{}'::jsonb,p_reason text default null,p_request_id uuid default null)returns jsonb language sql security invoker set search_path=''as $$select picket_private.admin_exports(p_id,p_section,p_filters,p_reason,p_request_id)$$;
create function public.admin_process_export()returns jsonb language plpgsql security definer set search_path=''as $$
declare r public.admin_exports;v_export jsonb;v_search text;begin
 select * into r from public.admin_exports where status='queued'order by created_at for update skip locked limit 1;
 if not found then return null;end if;
 begin
  perform set_config('request.jwt.claim.sub',r.actor::text,true);
  perform picket_private.admin_require(r.section);
  v_search:=lower(coalesce(r.filters->>'search',''));
  if r.section='users'then
   select coalesce(jsonb_agg(x),'[]'::jsonb)into v_export from(select id,email,created_at,email_confirmed_at,last_sign_in_at,banned_until from auth.users u where picket_private.admin_user_filter(u,r.filters)and(v_search=''or strpos(lower(coalesce(email,'')),v_search)>0 or id::text=v_search)and(coalesce(r.filters->>'status','')=''or(r.filters->>'status'='suspended'and banned_until>now())or(r.filters->>'status'='active'and(banned_until is null or banned_until<=now())))order by created_at desc,id limit 25000)x;
  elsif r.section='billing'then select coalesce(jsonb_agg(x),'[]'::jsonb)into v_export from(select user_id,product_id,tier,expires_at,active,verified_at,is_test,subscription_state,acknowledgement_state,metadata_verified_at from public.play_purchases order by verified_at desc limit 25000)x;
  elsif r.section='tickets'then select coalesce(jsonb_agg(x),'[]'::jsonb)into v_export from(select id,title,status,priority,target_user,assignee,created_at,updated_at from public.admin_tickets where(coalesce(r.filters->>'status','')=''or status=r.filters->>'status')and(v_search=''or strpos(lower(title),v_search)>0)order by created_at desc limit 25000)x;
  elsif r.section='audit'then select coalesce(jsonb_agg(x),'[]'::jsonb)into v_export from(select id,actor,action,target,reason,created_at from public.admin_audit where created_at>now()-coalesce((r.filters->>'days')::integer,30)*interval '1 day'and(v_search=''or strpos(lower(action),v_search)>0 or target=v_search)order by id desc limit 25000)x;
  else v_export:=picket_private.admin_portal(r.section,r.filters-'page');end if;
  update public.admin_exports set status='ready',result=v_export,expires_at=now()+interval '1 hour'where id=r.id;
 exception when others then update public.admin_exports set status='failed',expires_at=now()+interval '1 hour'where id=r.id;
 end;
 return jsonb_build_object('id',r.id);
end $$;

-- Explicit audit projection: never copy support prose, emails or credentials.
create function picket_private.admin_snapshot(p_action text,p_id uuid)returns jsonb
language sql security definer set search_path='' as $$
 select coalesce(case
 when p_action='ticket'then(select jsonb_build_object('status',status,'priority',priority,'assignee',assignee,'version',row_version)from public.admin_tickets where id=p_id)
 when p_action in('incident','release','content','review_content')then(select jsonb_build_object('status',status,'version',row_version,'reviewedBy',reviewed_by)from public.admin_records where id=p_id)
 when p_action='staff'then(select jsonb_build_object('role',role)from public.staff_members where user_id=p_id)
 when p_action='grant'then(select jsonb_build_object('tier',tier,'expiresAt',expires_at)from public.plan_grants where user_id=p_id)
 when p_action='settings'then(select jsonb_build_object('maintenance',maintenance,'version',row_version,'diskWarningPercent',disk_warning_percent,'staleMinutes',stale_minutes,'probeTimeoutSeconds',probe_timeout_seconds,'analyticsRetentionDays',analytics_retention_days,'aggregateRetentionMonths',aggregate_retention_months)from public.app_settings where id)
 when p_action='partner'then(select jsonb_build_object('active',active,'startsAt',starts_at,'endsAt',ends_at,'version',row_version)from public.partner_ads where id=p_id)
 when p_action='revoke_sessions'then(select jsonb_build_object('revokedSessions',count(*))from public.admin_revoked_sessions where user_id=p_id)
 else '{}'::jsonb end,'{}'::jsonb)
$$;
revoke all on function picket_private.admin_snapshot(text,uuid)from public,anon,authenticated;

create function picket_private.admin_mutate(p_action text,p_body jsonb,p_reason text,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_cap text; v_id uuid; v_fingerprint text; v_saved public.admin_mutation_requests; v_result jsonb;
 v_version integer; v_role text; v_target uuid; v_kind text; v_before jsonb;
begin
 v_cap:=case p_action when'revoke_sessions'then'users'when 'ticket' then 'tickets' when 'comment' then 'tickets'when'review_content'then'content'when 'incident' then 'incidents' when 'release' then 'releases' when 'staff' then 'staff' when 'settings' then 'settings' when 'partner' then 'partners' when 'grant' then 'billing' when 'content' then 'content' else null end;
 if v_cap is null then raise exception 'Invalid action' using errcode='22023'; end if;
 perform picket_private.admin_require(v_cap,true);
 if p_request_id is null or p_reason is null or length(trim(p_reason)) not between 5 and 500 or jsonb_typeof(p_body)<>'object' or octet_length(p_body::text)>20000 then raise exception 'Reason and valid request required' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
 v_fingerprint:=md5(p_action||p_body::text||p_reason);
 select * into v_saved from public.admin_mutation_requests where actor=auth.uid() and request_id=p_request_id;
 if found then
  if v_saved.fingerprint<>v_fingerprint then raise exception 'Idempotency key reused' using errcode='22023'; end if;
  return v_saved.result;
 end if;
 v_id:=coalesce((p_body->>'id')::uuid,(p_body->>'userId')::uuid,gen_random_uuid());
 v_before:=picket_private.admin_snapshot(p_action,v_id);
 if p_action='ticket' then
  if p_body->>'assignee'is not null and not exists(select 1 from public.staff_members where user_id=(p_body->>'assignee')::uuid)then raise exception 'Assignee must be staff'using errcode='22023';end if;
  if p_body->>'id' is null then
   insert into public.admin_tickets(id,title,body,status,priority,category,target_user,assignee) values(v_id,p_body->>'title',coalesce(p_body->>'body',''),coalesce(p_body->>'status','open'),coalesce(p_body->>'priority','normal'),coalesce(p_body->>'category','support'),(p_body->>'targetUser')::uuid,(p_body->>'assignee')::uuid);
  else
   update public.admin_tickets set title=p_body->>'title',body=coalesce(p_body->>'body',''),status=p_body->>'status',priority=p_body->>'priority',category=coalesce(p_body->>'category','support'),target_user=(p_body->>'targetUser')::uuid,assignee=(p_body->>'assignee')::uuid,row_version=row_version+1,updated_at=now() where id=v_id and row_version=(p_body->>'expectedVersion')::integer;
   if not found then raise exception 'Record changed; reload before saving' using errcode='40001'; end if;
  end if;
 elsif p_action='revoke_sessions'then
  v_target:=(p_body->>'userId')::uuid;
  if v_target=auth.uid()then raise exception 'Use local sign out for your own session'using errcode='23514';end if;
  insert into public.admin_revoked_sessions(session_id,user_id)select id,user_id from auth.sessions where user_id=v_target on conflict(session_id)do nothing;
  v_id:=v_target;
 elsif p_action='comment'then
  insert into public.admin_ticket_comments(ticket_id,author,body)values((p_body->>'ticketId')::uuid,auth.uid(),p_body->>'body');
  v_id:=(p_body->>'ticketId')::uuid;
 elsif p_action='review_content'then
  update public.admin_records set reviewed_by=auth.uid(),reviewed_at=now(),reviewed_hash=md5(body||details::text),status='review',row_version=row_version+1 where id=v_id and kind='content'and updated_by<>auth.uid()and row_version=(p_body->>'expectedVersion')::integer;
  if not found then raise exception 'Independent review or current revision required'using errcode='42501';end if;
 elsif p_action in ('incident','release','content') then
  if p_action='release' and (coalesce(p_body->'details'->>'sha256','')!~'^[a-f0-9]{64}$' or coalesce(p_body->'details'->>'url','')!~'^https://picketfinance[.]com/downloads/[^?]+[.]apk$') then raise exception 'Verified release URL and checksum required' using errcode='22023'; end if;
  if p_action='content'and p_body->>'status'='published'then
   if not exists(select 1 from public.admin_records where id=v_id and kind='content'and reviewed_by is not null and reviewed_by<>updated_by and reviewed_hash=md5(coalesce(p_body->>'body','')||coalesce(p_body->'details','{}'::jsonb)::text))then raise exception 'Independent content review required'using errcode='23514';end if;
  end if;
  if p_body->>'id' is null then
   insert into public.admin_records(id,kind,title,body,status,details,updated_by) values(v_id,p_action,p_body->>'title',coalesce(p_body->>'body',''),coalesce(p_body->>'status',case when p_action='incident' then 'open' else 'draft' end),coalesce(p_body->'details','{}'::jsonb),auth.uid());
  else
   update public.admin_records set title=p_body->>'title',body=coalesce(p_body->>'body',''),status=p_body->>'status',details=coalesce(p_body->'details','{}'::jsonb),row_version=row_version+1,updated_at=now(),updated_by=case when p_action='content'and p_body->>'status'='published'then updated_by else auth.uid()end where id=v_id and kind=p_action and row_version=(p_body->>'expectedVersion')::integer;
   if not found then raise exception 'Record changed; reload before saving' using errcode='40001'; end if;
  end if;
  if p_action='content'and coalesce(p_body->'details'->>'lessonId','')<>''and p_body->>'status'in('published','archived')then
   update public.learning_answer_keys set published=(p_body->>'status'='published')where lesson_id=p_body->'details'->>'lessonId'and content_version=(p_body->'details'->>'contentVersion')::integer;
   if not found then raise exception 'Linked lesson version not found'using errcode='22023';end if;
  end if;
 elsif p_action='staff' then
  lock table public.staff_members in share row exclusive mode;
  v_target:=(p_body->>'userId')::uuid; v_role:=p_body->>'role';
  if v_role not in ('owner','operations','support','analyst','content','remove') or v_target is null then raise exception 'Invalid staff role' using errcode='22023'; end if;
  if exists(select 1 from public.staff_members where user_id=v_target and role='owner') and v_role<>'owner' and (select count(*) from public.staff_members where role='owner')<=1 then raise exception 'Cannot remove last owner' using errcode='23514'; end if;
  if v_role='remove' then delete from public.staff_members where user_id=v_target;
  else insert into public.staff_members(user_id,role) values(v_target,v_role) on conflict(user_id)do update set role=excluded.role; end if;
  v_id:=v_target;
 elsif p_action='settings' then
  if picket_private.admin_role()<>'owner'and(p_body ? 'analyticsRetentionDays'or p_body ? 'aggregateRetentionMonths')then raise exception 'Owner required for retention policy'using errcode='42501';end if;
  if length(coalesce(p_body->>'notice',''))>1000 or jsonb_typeof(p_body->'maintenance')<>'boolean' then raise exception 'Invalid settings' using errcode='22023'; end if;
  update public.app_settings set maintenance=(p_body->>'maintenance')::boolean,notice=coalesce(p_body->>'notice',''),disk_warning_percent=coalesce((p_body->>'diskWarningPercent')::integer,85),probe_timeout_seconds=coalesce((p_body->>'probeTimeoutSeconds')::integer,8),stale_minutes=coalesce((p_body->>'staleMinutes')::integer,15),analytics_retention_days=coalesce((p_body->>'analyticsRetentionDays')::integer,analytics_retention_days),aggregate_retention_months=coalesce((p_body->>'aggregateRetentionMonths')::integer,aggregate_retention_months),row_version=row_version+1 where id and row_version=(p_body->>'expectedVersion')::integer;
  if not found then raise exception 'Settings changed; reload before saving'using errcode='40001';end if;
 elsif p_action='partner' then
  if coalesce(p_body->>'url','')!~'^https://[^/@: ]+([/:][^@ ]*)?$' then raise exception 'HTTPS URL required' using errcode='22023'; end if;
  if p_body->>'id'is null then insert into public.partner_ads(id,title,body,url,active,starts_at,ends_at) values(v_id,p_body->>'title',coalesce(p_body->>'body',''),p_body->>'url',coalesce((p_body->>'active')::boolean,false),(p_body->>'startsAt')::timestamptz,(p_body->>'endsAt')::timestamptz);
  else update public.partner_ads set title=p_body->>'title',body=coalesce(p_body->>'body',''),url=p_body->>'url',active=coalesce((p_body->>'active')::boolean,false),starts_at=(p_body->>'startsAt')::timestamptz,ends_at=(p_body->>'endsAt')::timestamptz,row_version=row_version+1 where id=v_id and row_version=(p_body->>'expectedVersion')::integer;
   if not found then raise exception 'Partner record changed; reload'using errcode='40001';end if;
  end if;
 elsif p_action='grant' then
  if picket_private.admin_role() not in ('owner','operations') then raise exception 'Grant permission required' using errcode='42501'; end if;
  v_target:=(p_body->>'userId')::uuid;
  if p_body->>'tier'='free' then delete from public.plan_grants where user_id=v_target;
  elsif p_body->>'tier' in ('plus','pro') then insert into public.plan_grants(user_id,tier,expires_at,granted_by)values(v_target,p_body->>'tier',now()+interval '30 days',auth.uid())on conflict(user_id)do update set tier=excluded.tier,expires_at=excluded.expires_at,granted_by=excluded.granted_by;
  else raise exception 'Invalid grant' using errcode='22023'; end if;
  v_id:=v_target;
 end if;
 v_result:=jsonb_build_object('updated',true,'id',v_id);
 insert into public.admin_audit(actor,action,target,reason,request_id,details)values(auth.uid(),p_action,v_id::text,trim(p_reason),p_request_id,jsonb_build_object('before',v_before,'after',picket_private.admin_snapshot(p_action,v_id)));
 insert into public.admin_mutation_requests(actor,request_id,fingerprint,result)values(auth.uid(),p_request_id,v_fingerprint,v_result);
 return v_result;
end $$;
create function public.admin_mutate(p_action text,p_body jsonb,p_reason text,p_request_id uuid)returns jsonb language sql security invoker set search_path='' as $$ select picket_private.admin_mutate(p_action,p_body,p_reason,p_request_id) $$;

create function picket_private.admin_prepare_auth(p_action text,p_user uuid,p_reason text,p_request_id uuid)returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_email text; v_request public.admin_mutation_requests; v_fingerprint text; begin
 perform picket_private.admin_require('users',true);
 if p_action not in ('suspend','restore','reset_password','revoke_sessions')or length(trim(coalesce(p_reason,'')))not between 5 and 500 or p_request_id is null then raise exception 'Invalid account action' using errcode='22023'; end if;
 if p_action in ('suspend','restore','revoke_sessions') and exists(select 1 from public.staff_members where user_id=p_user)then raise exception 'Staff account requires owner recovery procedure' using errcode='42501';end if;
 select email into v_email from auth.users where id=p_user;
 if not found then raise exception 'User not found' using errcode='P0002';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
 v_fingerprint:=md5(p_action||p_user::text||p_reason);
 select * into v_request from public.admin_mutation_requests where actor=auth.uid()and request_id=p_request_id;
 if found then
  if v_request.fingerprint<>v_fingerprint then raise exception 'Idempotency key reused'using errcode='22023';end if;
  if v_request.result->>'state'='applied'then return jsonb_build_object('state','applied');end if;
  if v_request.result->>'state'='processing'and(v_request.result->>'leaseAt')::timestamptz>now()-interval '5 minutes'then return jsonb_build_object('state','in_progress');end if;
  update public.admin_mutation_requests set result=jsonb_build_object('state','processing','leaseAt',now())where actor=auth.uid()and request_id=p_request_id;
  return jsonb_build_object('state','execute','email',v_email);
 end if;
 insert into public.admin_audit(actor,action,target,reason,request_id,details)values(auth.uid(),p_action,p_user::text,p_reason,p_request_id,'{"state":"requested"}');
 insert into public.admin_mutation_requests(actor,request_id,fingerprint,result)values(auth.uid(),p_request_id,v_fingerprint,jsonb_build_object('state','processing','leaseAt',now()));
 return jsonb_build_object('email',v_email,'state','execute');
end $$;
create function public.admin_prepare_auth(p_action text,p_user uuid,p_reason text,p_request_id uuid)returns jsonb language sql security invoker set search_path='' as $$ select picket_private.admin_prepare_auth(p_action,p_user,p_reason,p_request_id) $$;
create function public.admin_finish_auth(p_actor uuid,p_request_id uuid,p_success boolean)returns void language plpgsql security definer set search_path='' as $$
begin
 update public.admin_audit set details=jsonb_build_object('state',case when p_success then 'applied' else 'failed' end)where actor=p_actor and request_id=p_request_id;
 update public.admin_mutation_requests set result=jsonb_build_object('state',case when p_success then 'applied' else 'failed' end)where actor=p_actor and request_id=p_request_id;
end $$;

create function picket_private.collect_event(p_event jsonb)returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_session uuid:=(p_event->>'sessionId')::uuid; begin
 if v_user is not null and exists(select 1 from public.staff_members where user_id=v_user) then return; end if;
 if (select count(*) from public.app_analytics_events where session_id=v_session and created_at>now()-interval '1 minute')>=30 then raise exception 'Telemetry rate limit' using errcode='54000'; end if;
 insert into public.app_analytics_events(id,event,session_id,user_id,environment,version,channel,campaign)
 values((p_event->>'id')::uuid,p_event->>'event',v_session,v_user,coalesce(p_event->>'environment','production'),coalesce(p_event->>'version',''),coalesce(p_event->>'channel','unknown'),coalesce(p_event->>'campaign',''))on conflict(id)do nothing;
end $$;
create function public.collect_app_event(p_event jsonb)returns void language sql security invoker set search_path='' as $$ select picket_private.collect_event(p_event) $$;

-- Only a trusted worker may import external statistics or health samples.
create function public.admin_ingest(p_source text,p_meta jsonb,p_rows jsonb)returns void
language plpgsql security definer set search_path='' as $$
declare r jsonb; v_old text; v_new text; begin
 if p_source not in ('google_play_installs','google_play_vitals','google_play_financial','apk_access','health','server_metrics')or jsonb_typeof(p_rows)<>'array'or jsonb_array_length(p_rows)>20000 then raise exception 'Invalid import' using errcode='22023'; end if;
 if coalesce(p_meta->>'status','ok')='ok' then
  if p_source='health' then
   for r in select value from jsonb_array_elements(p_rows)loop
    perform pg_advisory_xact_lock(hashtextextended('admin-health:'||(r->>'component'),0));
    select status into v_old from public.admin_health_samples where component=r->>'component' order by checked_at desc,id desc limit 1;
    insert into public.admin_health_samples(component,status,latency_ms,message)values(r->>'component',r->>'status',(r->>'latencyMs')::integer,coalesce(r->>'message',''));
    v_new:=r->>'status';
    if v_new in ('down','degraded') and (v_old is null or v_old not in ('down','degraded'))then
     insert into public.admin_records(kind,title,body,status,details)values('incident','Service: '||(r->>'component'),coalesce(r->>'message',''),'open',jsonb_build_object('component',r->>'component','automatic',true));
    elsif v_new='ok' and v_old in ('down','degraded')then update public.admin_records set status='resolved',updated_at=now(),row_version=row_version+1 where kind='incident' and details->>'component'=r->>'component' and details->>'automatic'='true' and status in ('open','investigating'); end if;
   end loop;
  else
   if p_meta ? 'month' and p_source in('google_play_installs','google_play_financial') then delete from public.admin_daily_metrics where source=p_source and day>= (p_meta->>'month')::date and day< (p_meta->>'month')::date+interval '1 month'; end if;
   for r in select value from jsonb_array_elements(p_rows)loop
    insert into public.admin_daily_metrics(source,metric,day,dimension,value,source_timezone)values(p_source,r->>'metric',(r->>'day')::date,coalesce(r->>'dimension',''),(r->>'value')::numeric,coalesce(r->>'timezone','UTC'))
    on conflict(source,metric,day,dimension,environment)do update set value=excluded.value,source_timezone=excluded.source_timezone,observed_at=now();
   end loop;
  end if;
 end if;
 insert into public.admin_integration_runs(source,status,message,last_success_at,checkpoint)values(p_source,coalesce(p_meta->>'status','ok'),left(coalesce(p_meta->>'message',''),500),case when coalesce(p_meta->>'status','ok')='ok'then now()end,p_meta->>'checkpoint')
 on conflict(source)do update set status=excluded.status,message=excluded.message,updated_at=now(),last_success_at=coalesce(excluded.last_success_at,admin_integration_runs.last_success_at),checkpoint=coalesce(excluded.checkpoint,admin_integration_runs.checkpoint);
end $$;

revoke all on all functions in schema picket_private from public,anon;
grant execute on function picket_private.admin_role(),picket_private.admin_require(text,boolean),picket_private.account_access(),picket_private.admin_portal(text,jsonb),picket_private.admin_mutate(text,jsonb,text,uuid),picket_private.collect_event(jsonb) to authenticated;
revoke all on function picket_private.admin_prepare_auth(text,uuid,text,uuid) from public,anon;
grant execute on function picket_private.admin_prepare_auth(text,uuid,text,uuid) to authenticated;
revoke all on function public.admin_prepare_auth(text,uuid,text,uuid),public.admin_finish_auth(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.admin_prepare_auth(text,uuid,text,uuid) to authenticated;
grant execute on function public.admin_finish_auth(uuid,uuid,boolean) to service_role;
revoke all on function public.account_access(),public.admin_portal(text,jsonb),public.admin_mutate(text,jsonb,text,uuid),public.collect_app_event(jsonb),public.admin_ingest(text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.account_access(),public.admin_portal(text,jsonb),public.admin_mutate(text,jsonb,text,uuid),public.collect_app_event(jsonb) to authenticated;
grant execute on function public.admin_ingest(text,jsonb,jsonb),public.collect_app_event(jsonb) to service_role;
create function public.admin_worker_ping()returns jsonb language sql stable security invoker set search_path='' as $$select jsonb_build_object('status','ok','checkedAt',now())$$;
revoke all on function public.admin_worker_ping()from public,anon,authenticated;
grant execute on function public.admin_worker_ping()to service_role;
create function public.admin_worker_config()returns jsonb language sql stable security definer set search_path=''as $$select jsonb_build_object('diskWarningPercent',disk_warning_percent,'probeTimeoutSeconds',probe_timeout_seconds)from public.app_settings where id$$;
revoke all on function public.admin_worker_config()from public,anon,authenticated;
grant execute on function public.admin_worker_config()to service_role;
create function public.admin_record_diagnostic(p_metric text)returns void language plpgsql security definer set search_path=''as $$begin
 if p_metric not in('ocr_quota_denied','sync_conflict','http_error')then raise exception 'Invalid diagnostic'using errcode='22023';end if;
 insert into public.admin_daily_metrics(source,metric,day,value)values('backend_diagnostics',p_metric,(now()at time zone'UTC')::date,1)
 on conflict(source,metric,day,dimension,environment)do update set value=admin_daily_metrics.value+1,observed_at=now();
end $$;
revoke all on function public.admin_record_diagnostic(text)from public,anon,authenticated;
grant execute on function public.admin_record_diagnostic(text)to service_role;
create function public.admin_retention_cleanup()returns void language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('admin-retention-cleanup',0));
 insert into public.admin_daily_metrics(source,metric,day,dimension,environment,value,source_timezone)
 select 'product','event_count',(created_at at time zone 'Asia/Ho_Chi_Minh')::date,event||':'||channel,environment,count(*),'Asia/Ho_Chi_Minh'
 from public.app_analytics_events where created_at<now()-(select analytics_retention_days from public.app_settings where id)*interval '1 day' group by 3,4,5
 on conflict(source,metric,day,dimension,environment)do update set value=admin_daily_metrics.value+excluded.value,observed_at=now();
 delete from public.admin_user_activity where last_seen_at<now()-(select analytics_retention_days from public.app_settings where id)*interval '1 day';
 update public.admin_user_activity set first_open_at=null where first_open_at<now()-(select analytics_retention_days from public.app_settings where id)*interval '1 day';
 delete from public.app_analytics_events where created_at<now()-(select analytics_retention_days from public.app_settings where id)*interval '1 day';
 delete from public.admin_daily_metrics where day<(now()-(select aggregate_retention_months from public.app_settings where id)*interval '1 month')::date;
 delete from public.admin_health_samples where checked_at<now()-interval '30 days';
 delete from public.admin_mutation_requests where created_at<now()-interval '90 days';
 delete from public.admin_exports where expires_at<now()or created_at<now()-interval '1 day';
end $$;
revoke all on function public.admin_retention_cleanup()from public,anon,authenticated;
grant execute on function public.admin_retention_cleanup()to service_role;
revoke all on function picket_private.admin_exports(uuid,text,jsonb,text,uuid),public.admin_exports(uuid,text,jsonb,text,uuid),public.admin_process_export()from public,anon,authenticated;
grant execute on function picket_private.admin_exports(uuid,text,jsonb,text,uuid),public.admin_exports(uuid,text,jsonb,text,uuid)to authenticated;
grant execute on function public.admin_process_export()to service_role;
grant execute on function picket_private.collect_event(jsonb) to service_role;
-- Retire old unscoped administrative entrypoints. Clients must use Dart API.
revoke execute on function public.admin_overview(integer),public.admin_ledger(uuid),public.admin_save_settings(boolean,text),public.admin_save_ad(uuid,text,text,text,boolean) from authenticated;

notify pgrst, 'reload schema';
