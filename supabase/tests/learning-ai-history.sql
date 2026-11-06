begin;
do $$ begin
 if to_regprocedure('public.delete_learning_ai_history()') is null then raise exception 'Missing history deletion'; end if;
 if has_function_privilege('authenticated','public.prune_learning_ai_jobs()','EXECUTE') then raise exception 'Public retention privilege'; end if;
end $$;
insert into auth.users(id,email) values
 ('77777777-1234-4321-8123-123456789001','ai-history-a@example.test'),
 ('77777777-1234-4321-8123-123456789002','ai-history-b@example.test');
select set_config('request.jwt.claim.sub','77777777-1234-4321-8123-123456789001',true);
select public.set_learning_ai_consent(true);
select public.enqueue_learning_ai_job('history_1','cash-gap-v1','vi');
do $$ declare j jsonb; begin
 j:=public.claim_learning_ai_job();
 perform public.dispatch_learning_ai_job((j->>'id')::uuid,(j->>'leaseToken')::uuid);
 perform set_config('request.jwt.claim.sub','77777777-1234-4321-8123-123456789002',true);
 if public.load_learning_ai_job((j->>'id')::uuid) is not null then raise exception 'Foreign job leak'; end if;
 perform set_config('request.jwt.claim.sub','77777777-1234-4321-8123-123456789001',true);
 perform public.delete_learning_ai_history();
 if public.load_learning_ai_job((j->>'id')::uuid) is not null then raise exception 'Deleted job visible'; end if;
 if public.finish_learning_ai_job((j->>'id')::uuid,(j->>'leaseToken')::uuid,array['timing']) then raise exception 'Deletion race resurrected result'; end if;
 if public.enqueue_learning_ai_job('history_1','cash-gap-v1','vi')->>'status'<>'cancelled' then raise exception 'Deleted request key retried'; end if;
 perform public.enqueue_learning_ai_job('history_2','cash-gap-v1','vi');
 perform public.enqueue_learning_ai_job('history_3','cash-gap-v1','vi');
 begin perform public.enqueue_learning_ai_job('history_4','cash-gap-v1','vi'); raise exception 'Deletion reset quota'; exception when sqlstate 'PT429' then null; end;
end $$;
-- Age synthetic fixtures to exercise both output and metadata retention.
update public.learning_ai_jobs set status='completed',statement_ids=array['timing'],created_at=now()-interval '2 days',deleted_at=null where request_key='history_2';
update public.learning_ai_jobs set created_at=now()-interval '31 days' where request_key='history_3';
do $$ declare j public.learning_ai_jobs; begin
 select * into j from public.learning_ai_jobs where request_key='history_2';
 if public.load_learning_ai_job(j.id)->'statementIds'<>'[]'::jsonb then raise exception 'Expired output leaked'; end if;
 perform public.prune_learning_ai_jobs();
 if exists(select 1 from public.learning_ai_jobs where request_key='history_2' and statement_ids is not null) then raise exception 'Output not pruned'; end if;
 if exists(select 1 from public.learning_ai_jobs where request_key='history_3') then raise exception 'Metadata not pruned'; end if;
end $$;
rollback;
