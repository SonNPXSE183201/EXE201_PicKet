begin;
-- Triggers exist on the admin tables and never block writes, even when the
-- Realtime schema is missing (PGlite) or unavailable.
do $$declare n int;begin
 select count(*) into n from pg_trigger where tgname='admin_realtime_feed' and not tgisinternal;
 if n < 20 then raise exception 'admin realtime triggers missing: %', n; end if;
end$$;
insert into auth.users(id,email,email_confirmed_at) values ('ec000000-0000-4000-8000-000000000001','rt-owner@example.test',now());
insert into public.staff_members(user_id,role) values('ec000000-0000-4000-8000-000000000001','owner');
do $$begin
 if not exists(select 1 from picket_private.admin_realtime_ticks where section='staff') then raise exception 'staff write did not tick the feed'; end if;
end$$;
-- Busy sections are coalesced: a second write inside the gap does not move the tick.
update picket_private.admin_realtime_ticks set sent_at=now() where section='staff';
do $$declare before timestamptz; after timestamptz;begin
 select sent_at into before from picket_private.admin_realtime_ticks where section='staff';
 update public.staff_members set role='owner' where user_id='ec000000-0000-4000-8000-000000000001';
 select sent_at into after from picket_private.admin_realtime_ticks where section='staff';
 if after<>before then raise exception 'feed not throttled'; end if;
end$$;
-- Clients cannot read or call the feed internals.
do $$begin
 if has_table_privilege('authenticated','picket_private.admin_realtime_ticks','select') then raise exception 'ticks readable by clients'; end if;
 if has_function_privilege('authenticated','picket_private.admin_realtime_notify()','execute') then raise exception 'notify callable by clients'; end if;
end$$;
rollback;
