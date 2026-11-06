create table public.learning_activity (
 owner_id uuid not null references auth.users(id) on delete cascade,
 event_key text not null,
 kind text not null check(kind in ('review','practice')),
 payload jsonb not null,
 skipped boolean not null default false,
 xp integer not null check(xp in(0,10)),
 created_at timestamptz not null default now(),
 primary key(owner_id,event_key),
 check(kind<>'review' or (xp=0 and not skipped)),
 check(kind<>'practice' or xp=case when skipped then 0 else 10 end)
);
alter table public.learning_activity enable row level security;
revoke all on public.learning_activity from public,anon,authenticated;
grant select on public.learning_activity to authenticated;
create policy learning_activity_owner_read on public.learning_activity
 for select to authenticated using(owner_id=(select auth.uid()) and (select public.is_account_active()));

create function public.load_learning_activity() returns jsonb
language plpgsql security definer set search_path='' as $$
declare o uuid:=auth.uid(); result jsonb;
begin
 if o is null or not public.is_account_active() then raise exception 'Active account required' using errcode='42501'; end if;
 select jsonb_build_object(
  'reviews',coalesce(jsonb_agg(payload-'kind' order by event_key) filter(where kind='review'),'[]'::jsonb),
  'practice',coalesce(jsonb_agg(jsonb_build_object('weekStart',payload->>'weekStart','skipped',skipped) order by event_key) filter(where kind='practice'),'[]'::jsonb))
 into result from public.learning_activity where owner_id=o;
 return result;
end $$;

create function public.sync_learning_activity(p_events jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o uuid:=auth.uid(); e jsonb; k text; offset_days integer;
 lesson text; content integer; completed timestamptz; week date; is_skipped boolean;
begin
 if o is null or not public.is_account_active() then raise exception 'Active account required' using errcode='42501'; end if;
 if p_events is null or jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)>100 then raise exception 'Invalid learning activity' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('learning-activity:'||o::text,0));
 for e in select value from jsonb_array_elements(p_events) loop
  if jsonb_typeof(e)<>'object' then raise exception 'Invalid activity' using errcode='22023'; end if;
  if e->>'kind'='review' then
   if (select count(*) from jsonb_object_keys(e))<>4 or jsonb_typeof(e->'contentVersion') is distinct from 'number' or jsonb_typeof(e->'offset') is distinct from 'number'
    or e->>'contentVersion' !~ '^[1-9][0-9]{0,8}$' or e->>'offset' not in ('7','30') then raise exception 'Invalid review' using errcode='22023'; end if;
   lesson:=e->>'lessonId'; content:=(e->>'contentVersion')::integer; offset_days:=(e->>'offset')::integer;
   select p.completed_at into completed from public.learning_progress p join public.learning_answer_keys a using(lesson_id,content_version)
    where p.user_id=o and p.lesson_id=lesson and p.content_version=content and a.published;
   if not found or (completed at time zone 'UTC')::date+offset_days>(now() at time zone 'UTC')::date then raise exception 'Review is not due' using errcode='22023'; end if;
   k:='review:'||lesson||':'||content::text||':'||offset_days::text;
   insert into public.learning_activity(owner_id,event_key,kind,payload,skipped,xp)
    values(o,k,'review',e,false,0) on conflict do nothing;
  elsif e->>'kind'='practice' then
   if (select count(*) from jsonb_object_keys(e))<>3 or jsonb_typeof(e->'weekStart') is distinct from 'string' or jsonb_typeof(e->'skipped') is distinct from 'boolean'
    or e->>'weekStart' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Invalid practice' using errcode='22023'; end if;
   begin week:=(e->>'weekStart')::date; exception when others then raise exception 'Invalid practice date' using errcode='22023'; end;
   if extract(isodow from week)<>1 or week>date_trunc('week',now() at time zone 'UTC')::date then raise exception 'Practice week is not available' using errcode='22023'; end if;
   is_skipped:=(e->>'skipped')::boolean;
   insert into public.learning_activity(owner_id,event_key,kind,payload,skipped,xp)
    values(o,'practice:'||week::text,'practice',e,is_skipped,case when is_skipped then 0 else 10 end)
    on conflict(owner_id,event_key) do update set skipped=false,xp=10
    where public.learning_activity.skipped and not excluded.skipped;
  else raise exception 'Unknown activity' using errcode='22023';
  end if;
 end loop;
 return public.load_learning_activity();
end $$;
revoke all on function public.load_learning_activity() from public,anon;
revoke all on function public.sync_learning_activity(jsonb) from public,anon;
grant execute on function public.load_learning_activity() to authenticated;
grant execute on function public.sync_learning_activity(jsonb) to authenticated;
