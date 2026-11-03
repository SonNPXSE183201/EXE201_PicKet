begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('d1000000-0000-4000-8000-000000000001','owner-admin@example.test',now()),
 ('d1000000-0000-4000-8000-000000000002','analyst-admin@example.test',now()),
 ('d1000000-0000-4000-8000-000000000003','member-admin@example.test',now());
insert into public.staff_members(user_id,role) values
 ('d1000000-0000-4000-8000-000000000001','owner'),
 ('d1000000-0000-4000-8000-000000000002','analyst');
select set_config('request.jwt.claim.sub','d1000000-0000-4000-8000-000000000003',true);
set local role authenticated;
do $$ begin
 if (public.account_access()->>'mobileAllowed')::boolean is not true then raise exception 'ordinary user mobile denied'; end if;
 begin perform public.admin_portal('overview','{}'); raise exception 'non staff dashboard allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','d1000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$ begin
 if not (public.account_access()->>'mobileAllowed')::boolean then raise exception 'staff personal mobile denied'; end if;
 perform public.admin_portal('overview','{}');
 begin perform public.admin_portal('users','{}'); raise exception 'analyst PII allowed'; exception when insufficient_privilege then null; end;
 begin perform public.admin_mutate('ticket','{}','investigate support','11111111-1111-4111-8111-111111111100'); raise exception 'analyst mutation allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','d1000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"aal":"aal1"}',true);
set local role authenticated;
do $$ begin
 begin perform public.admin_mutate('ticket','{"title":"Test"}','investigate support','11111111-1111-4111-8111-111111111100'); raise exception 'aal1 mutation allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
set local role authenticated;
do $$ declare a jsonb; b jsonb; begin
 a:=public.admin_mutate('ticket','{"title":"Test support","status":"open","priority":"normal"}','investigate support','11111111-1111-4111-8111-111111111100');
 b:=public.admin_mutate('ticket','{"title":"Test support","status":"open","priority":"normal"}','investigate support','11111111-1111-4111-8111-111111111100');
 if a<>b then raise exception 'mutation not idempotent'; end if;
 if (public.admin_portal('tickets','{}')->>'total')::int<>1 then raise exception 'ticket duplicated'; end if;
 if (public.admin_portal('users','{"search":"owner-admin@example.test"}')->>'total')::int<>1 then raise exception 'user filter failed'; end if;
 begin perform public.admin_mutate('staff','{"userId":"d1000000-0000-4000-8000-000000000001","role":"analyst"}','change role','11111111-1111-4111-8111-111111111101'); raise exception 'last owner removed'; exception when check_violation then null; end;
 begin perform public.admin_mutate('ticket','{"title":"Bad"}','','11111111-1111-4111-8111-111111111102'); raise exception 'reason omitted'; exception when invalid_parameter_value then null; end;
 begin perform public.admin_portal('users','{"page":-1}'); raise exception 'negative page'; exception when invalid_parameter_value then null; end;
end $$;
reset role;
-- Read audits record the fact of lookup, never its email search string.
do $$begin
 if not exists(select 1 from public.admin_audit where action='view_users'and details->>'searchApplied'='true')then raise exception 'User lookup not audited';end if;
 if exists(select 1 from public.admin_audit where action='view_users'and(details::text like '%owner-admin@example.test%'or target like '%@%'))then raise exception 'Search leaked to audit';end if;
end $$;
-- Raw tables and telemetry ingestion must not be writable by clients.
set local role anon;
do $$ begin
 begin insert into public.admin_tickets(title) values('bad'); raise exception 'anon ticket insert'; exception when insufficient_privilege then null; end;
 begin perform public.admin_ingest('health','{}','{}'); raise exception 'anon ingest'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','d1000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select public.admin_exports(null,'users','{"search":"owner-admin@example.test"}','support export acceptance','11111111-1111-4111-8111-111111111110');
reset role;
set local role service_role;
select public.admin_process_export();
reset role;
set local role authenticated;
do $$declare r jsonb;begin
 r:=public.admin_exports();
 r:=public.admin_exports((r->'rows'->0->>'id')::uuid);
 if r->>'status'<>'ready'or jsonb_array_length(r->'data')<>1 then raise exception 'Export generation/filter failed';end if;
end $$;
reset role;
-- Replayed health failures produce one incident; recovery resolves it.
set local role service_role;
select public.admin_ingest('health','{}','[{"component":"qa_api","status":"down","message":"QA failure"}]');
select public.admin_ingest('health','{}','[{"component":"qa_api","status":"down","message":"Repeated failure"}]');
reset role;
do $$begin if(select count(*)from public.admin_records where details->>'component'='qa_api')<>1 then raise exception 'Duplicate incident';end if;end $$;
set local role service_role;
select public.admin_ingest('health','{}','[{"component":"qa_api","status":"ok","message":"Recovered"}]');
reset role;
do $$begin if not exists(select 1 from public.admin_records where details->>'component'='qa_api'and status='resolved')then raise exception 'Recovery not applied';end if;end $$;
-- Activity projection is ordered by source timestamp, and test data stays out.
insert into public.app_analytics_events(id,event,session_id,user_id,environment,version,created_at)values
 ('d3000000-0000-4000-8000-000000000001','meaningful_action','d4000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000003','production','1.0.9',now()),
 ('d3000000-0000-4000-8000-000000000002','first_open','d4000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000003','production','1.0.7',now()-interval '2 days');
insert into public.app_analytics_events(id,event,session_id,user_id,environment,version,created_at)values
 ('d3000000-0000-4000-8000-000000000003','app_open','d4000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000003','production','1.0.8',now()-interval '1 day'),
 ('d3000000-0000-4000-8000-000000000004','app_open','d4000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000003','test','9.9.9',now()+interval '1 day');
do $$begin
 if not exists(select 1 from public.admin_user_activity where user_id='d1000000-0000-4000-8000-000000000003'and version='1.0.9'and first_open_at=now()-interval '2 days'and last_meaningful_at=now())then raise exception 'Activity projection incorrect';end if;
end $$;
set local role authenticated;
do $$begin
 if(public.admin_portal('users','{"tier":"free","version":"1.0.9","sort":"email"}')->>'total')::int<>1 then raise exception 'User tier/version filter incorrect';end if;
 begin perform public.admin_portal('users','{"sort":"raw_sql"}');raise exception 'Invalid sort accepted';exception when invalid_parameter_value then null;end;
end $$;
reset role;
-- Mutations preserve a redacted before/after audit and reject stale writes.
select set_config('request.jwt.claim.sub','d1000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
set local role authenticated;
do $$ declare t uuid; a jsonb; begin
 select (public.admin_portal('tickets','{}')->'rows'->0->>'id')::uuid into t;
 perform public.admin_mutate('ticket',jsonb_build_object('id',t,'title','Updated support','body','private note must stay out of audit','status','resolved','priority','normal','expectedVersion',1),'resolve support request','11111111-1111-4111-8111-111111111120');
 begin
  perform public.admin_mutate('ticket',jsonb_build_object('id',t,'title','Stale','status','open','priority','normal','expectedVersion',1),'stale support request','11111111-1111-4111-8111-111111111121');
  raise exception 'stale update accepted';
 exception when sqlstate 'PT409' then null;end;
end $$;
reset role;
do $$ declare a jsonb;begin
 select details into a from public.admin_audit where request_id='11111111-1111-4111-8111-111111111120';
 if a->'before'->>'status'<>'open' or a->'after'->>'status'<>'resolved' or a::text like '%private note%'then raise exception 'Audit snapshot incorrect';end if;
end $$;
-- Independent review cannot be self-approved or reused after body edits.
insert into auth.users(id,email,email_confirmed_at)values('d1000000-0000-4000-8000-000000000004','editor-admin@example.test',now());
insert into public.staff_members(user_id,role)values('d1000000-0000-4000-8000-000000000004','content');
set local role authenticated;
do $$declare r jsonb;begin
 r:=public.admin_mutate('content','{"title":"QA lesson draft","body":"Reviewed content","details":{},"status":"draft"}','create content for review','11111111-1111-4111-8111-111111111130');
 begin perform public.admin_mutate('review_content',jsonb_build_object('id',r->>'id','expectedVersion',1),'self review not permitted','11111111-1111-4111-8111-111111111131');raise exception 'self review accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','d1000000-0000-4000-8000-000000000004',true);
set local role authenticated;
do $$declare r jsonb;begin
 r:=public.admin_portal('content','{}')->'rows'->0;
 perform public.admin_mutate('review_content',jsonb_build_object('id',r->>'id','expectedVersion',1),'independent editor review','11111111-1111-4111-8111-111111111132');
end $$;
reset role;
select set_config('request.jwt.claim.sub','d1000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$declare r jsonb;begin
 r:=public.admin_portal('content','{}')->'rows'->0;
 begin perform public.admin_mutate('content',jsonb_build_object('id',r->>'id','title','QA lesson draft','body','Modified after review','details','{}'::jsonb,'status','published','expectedVersion',2),'publish modified content','11111111-1111-4111-8111-111111111133');raise exception 'modified content published';exception when check_violation then null;end;
 perform public.admin_mutate('content',jsonb_build_object('id',r->>'id','title','QA lesson draft','body','Reviewed content','details','{}'::jsonb,'status','published','expectedVersion',2),'publish reviewed content','11111111-1111-4111-8111-111111111134');
end $$;
reset role;
-- A revoked JWT session remains denied even when its token is refreshed.
insert into auth.sessions(id,user_id)values('d2000000-0000-4000-8000-000000000003','d1000000-0000-4000-8000-000000000003');
set local role authenticated;
select public.admin_mutate('revoke_sessions','{"userId":"d1000000-0000-4000-8000-000000000003"}','revoke compromised session','11111111-1111-4111-8111-111111111122');
reset role;
select set_config('request.jwt.claim.sub','d1000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"d2000000-0000-4000-8000-000000000003"}',true);
set local role authenticated;
do $$begin
 if public.is_account_active()then raise exception 'Revoked session accepted';end if;
end $$;
reset role;
rollback;
