begin;
do $$ begin
 if to_regprocedure('public.enqueue_learning_ai_job(text,text,text)') is null then raise exception 'Missing AI queue'; end if;
 if has_function_privilege('authenticated','public.claim_learning_ai_job()','EXECUTE') then raise exception 'Public worker claim'; end if;
end $$;
insert into auth.users(id,email) values('66666666-1234-4321-8123-123456789001','ai-queue@example.test');
set local role authenticated;
select set_config('request.jwt.claim.sub','66666666-1234-4321-8123-123456789001',true);
do $$ declare j jsonb; begin
 begin perform public.enqueue_learning_ai_job('request_1','cash-gap-v1','vi'); raise exception 'Missing consent allowed'; exception when insufficient_privilege then null; end;
 perform public.set_learning_ai_consent(true);
 j:=public.enqueue_learning_ai_job('request_1','cash-gap-v1','vi');
 if j->>'status'<>'queued' then raise exception 'Not queued'; end if;
 if public.enqueue_learning_ai_job('request_1','cash-gap-v1','vi')->>'id'<>j->>'id' then raise exception 'Replay duplicated'; end if;
 begin perform public.enqueue_learning_ai_job('request_1','cash-gap-v1','en'); raise exception 'Mismatch accepted'; exception when sqlstate 'PT409' then null; end;
end $$;
reset role;
do $$ declare j jsonb; begin
 j:=public.claim_learning_ai_job();
 if j is null then raise exception 'Nothing claimed'; end if;
 if not public.dispatch_learning_ai_job((j->>'id')::uuid,(j->>'leaseToken')::uuid) then raise exception 'Dispatch failed'; end if;
 if public.dispatch_learning_ai_job((j->>'id')::uuid,(j->>'leaseToken')::uuid) then raise exception 'Duplicate dispatch'; end if;
 perform set_config('request.jwt.claim.sub','66666666-1234-4321-8123-123456789001',true);
 perform public.set_learning_ai_consent(false);
 if public.finish_learning_ai_job((j->>'id')::uuid,(j->>'leaseToken')::uuid,array['timing']) then raise exception 'Revoked result resurrected'; end if;
 if exists(select 1 from public.learning_ai_jobs where statement_ids is not null) then raise exception 'Revoked output retained'; end if;
end $$;
set local role authenticated;
do $$ begin
 perform public.set_learning_ai_consent(true);
 perform public.enqueue_learning_ai_job('request_2','cash-gap-v1','vi');
 perform public.enqueue_learning_ai_job('request_3','cash-gap-v1','vi');
 begin perform public.enqueue_learning_ai_job('request_4','cash-gap-v1','vi'); raise exception 'Daily quota bypass'; exception when sqlstate 'PT429' then null; end;
end $$;
reset role;
do $$ declare j jsonb; begin
 j:=public.claim_learning_ai_job();
 if public.dispatch_learning_ai_job((j->>'id')::uuid,gen_random_uuid()) then raise exception 'Wrong lease accepted'; end if;
 if public.finish_learning_ai_job((j->>'id')::uuid,(j->>'leaseToken')::uuid,array['timing']) then raise exception 'Completion before dispatch'; end if;
 if not public.dispatch_learning_ai_job((j->>'id')::uuid,(j->>'leaseToken')::uuid) then raise exception 'Valid dispatch failed'; end if;
 begin perform public.finish_learning_ai_job((j->>'id')::uuid,(j->>'leaseToken')::uuid,array['raw prose']); raise exception 'Unapproved output'; exception when invalid_parameter_value then null; end;
 if not public.finish_learning_ai_job((j->>'id')::uuid,(j->>'leaseToken')::uuid,array['timing','buffer']) then raise exception 'Valid completion failed'; end if;
 if public.finish_learning_ai_job((j->>'id')::uuid,(j->>'leaseToken')::uuid,null) then raise exception 'Completed job overwritten'; end if;
 j:=public.claim_learning_ai_job();
 perform public.dispatch_learning_ai_job((j->>'id')::uuid,(j->>'leaseToken')::uuid);
 update public.learning_ai_jobs set expires_at=now()-interval '1 second' where id=(j->>'id')::uuid;
 if public.claim_learning_ai_job() is not null then raise exception 'Expired dispatched job retried'; end if;
 if public.finish_learning_ai_job((j->>'id')::uuid,(j->>'leaseToken')::uuid,array['timing']) then raise exception 'Stale result accepted'; end if;
end $$;
rollback;
