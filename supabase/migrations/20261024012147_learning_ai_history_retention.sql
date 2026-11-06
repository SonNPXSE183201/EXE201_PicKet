alter table public.learning_ai_jobs add column deleted_at timestamptz;
create index learning_ai_jobs_retention on public.learning_ai_jobs(created_at);
drop policy learning_ai_jobs_owner_read on public.learning_ai_jobs;
create policy learning_ai_jobs_owner_read on public.learning_ai_jobs
 for select to authenticated using (
 owner_id=(select auth.uid()) and (select public.is_account_active())
 and deleted_at is null and created_at>now()-interval '24 hours'
);

create function public.load_learning_ai_job(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o uuid:=auth.uid(); j public.learning_ai_jobs; c public.learning_ai_consents;
 visible_status text;
begin
 if o is null or not public.is_account_active() then raise exception 'Active account required' using errcode='42501'; end if;
 select * into j from public.learning_ai_jobs where id=p_id and owner_id=o and deleted_at is null;
 if not found then return null; end if;
 select * into c from public.learning_ai_consents where owner_id=o;
 visible_status:=j.status;
 if c.accepted is distinct from true or c.generation is distinct from j.generation then visible_status:='cancelled';
 elsif j.created_at<now()-interval '24 hours' or (j.status in ('queued','claimed','dispatched') and j.expires_at<now()) then visible_status:='expired';
 end if;
 return jsonb_build_object('id',j.id,'status',visible_status,'statementIds',
  case when visible_status='completed' then coalesce(to_jsonb(j.statement_ids),'[]'::jsonb) else '[]'::jsonb end);
end $$;

create function public.delete_learning_ai_history() returns jsonb
language plpgsql security definer set search_path='' as $$
declare o uuid:=auth.uid();
begin
 if o is null or not public.is_account_active() then raise exception 'Active account required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('learning-ai:'||o::text,0));
 update public.learning_ai_jobs set status='cancelled',statement_ids=null,deleted_at=now()
 where owner_id=o and deleted_at is null;
 -- Keep quota/idempotency tombstones for 30 days; account deletion cascades.
 return jsonb_build_object('deleted',true);
end $$;

create function public.prune_learning_ai_jobs() returns void
language plpgsql security definer set search_path='' as $$
begin
 update public.learning_ai_jobs set statement_ids=null,status='expired'
 where created_at<now()-interval '24 hours' and statement_ids is not null;
 delete from public.learning_ai_jobs where created_at<now()-interval '30 days';
 delete from public.learning_ai_daily_usage where usage_day<(now() at time zone 'UTC')::date-30;
end $$;
revoke all on function public.load_learning_ai_job(uuid) from public,anon;
revoke all on function public.delete_learning_ai_history() from public,anon;
revoke all on function public.prune_learning_ai_jobs() from public,anon,authenticated;
grant execute on function public.load_learning_ai_job(uuid) to authenticated;
grant execute on function public.delete_learning_ai_history() to authenticated;
grant execute on function public.prune_learning_ai_jobs() to service_role;
