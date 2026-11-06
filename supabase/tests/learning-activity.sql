begin;
do $$ begin
 if to_regprocedure('public.sync_learning_activity(jsonb)') is null then raise exception 'Missing review/practice sync'; end if;
 if has_table_privilege('authenticated','public.learning_activity','INSERT') then raise exception 'Client may award activity XP'; end if;
end $$;
insert into auth.users(id,email) values('88888888-1234-4321-8123-123456789001','activity-a@example.test'),('88888888-1234-4321-8123-123456789002','activity-b@example.test');
update public.learning_answer_keys set published=true where lesson_id in ('picket.vi.financial.v1.01','picket.vi.financial.v1.02');
insert into public.learning_progress(user_id,lesson_id,content_version,completed_at) values
 ('88888888-1234-4321-8123-123456789001','picket.vi.financial.v1.01',1,now()-interval '31 days'),
 ('88888888-1234-4321-8123-123456789001','picket.vi.financial.v1.02',1,now());
set local role authenticated;
select set_config('request.jwt.claim.sub','88888888-1234-4321-8123-123456789001',true);
do $$ declare events jsonb; result jsonb; week text:=to_char(date_trunc('week',now() at time zone 'UTC'),'YYYY-MM-DD'); begin
 events:=jsonb_build_array(jsonb_build_object('kind','review','lessonId','picket.vi.financial.v1.01','contentVersion',1,'offset',7),jsonb_build_object('kind','practice','weekStart',week,'skipped',true));
 perform public.sync_learning_activity(events);
 perform public.sync_learning_activity(events);
 perform public.sync_learning_activity(jsonb_build_array(jsonb_build_object('kind','practice','weekStart',week,'skipped',false)));
 perform public.sync_learning_activity(events);
 result:=public.load_learning_activity();
 if jsonb_array_length(result->'reviews')<>1 or jsonb_array_length(result->'practice')<>1 or (result->'practice'->0->>'skipped')::boolean then raise exception 'Replay/skip reset completion'; end if;
 if (select sum(xp) from public.learning_activity)<>10 then raise exception 'Duplicate activity XP'; end if;
 begin perform public.sync_learning_activity('[{"kind":"review","lessonId":"picket.vi.financial.v1.02","contentVersion":1,"offset":7}]'); raise exception 'Early review accepted'; exception when invalid_parameter_value then null; end;
 begin perform public.sync_learning_activity('[{"kind":"practice","weekStart":"2026-10-19","skipped":false,"xp":999}]'); raise exception 'Client XP accepted'; exception when invalid_parameter_value then null; end;
end $$;
select set_config('request.jwt.claim.sub','88888888-1234-4321-8123-123456789002',true);
do $$ begin
 if (select count(*) from public.learning_activity)<>0 then raise exception 'Activity owner leak'; end if;
 if public.load_learning_activity()<>'{"reviews":[],"practice":[]}'::jsonb then raise exception 'Cloud activity leak'; end if;
end $$;
rollback;
