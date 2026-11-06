begin;
do $$ begin
 if to_regprocedure('public.load_cashflow_schedules()') is null then raise exception 'Missing schedule synchronization contract'; end if;
 if has_table_privilege('authenticated','public.cashflow_schedules','INSERT') then raise exception 'Direct schedule writes bypass RPC'; end if;
 if has_function_privilege('anon','public.mutate_cashflow_schedule(text,bigint,text,jsonb)','EXECUTE') then raise exception 'Anonymous mutation privilege'; end if;
end $$;
insert into auth.users(id,email) values('44444444-1234-4321-8123-123456789001','schedule-a@example.test'),('44444444-1234-4321-8123-123456789002','schedule-b@example.test');
insert into public.profiles(id) values('44444444-1234-4321-8123-123456789001'),('44444444-1234-4321-8123-123456789002') on conflict do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub','44444444-1234-4321-8123-123456789001',true);
do $$
declare result jsonb; original jsonb; schedule jsonb:='{"id":"44444444-1234-4321-8123-123456789011","startDay":"2026-10-24","frequency":"monthly","amount":-19000,"currency":"VND","active":true}';
begin
 if (public.load_cashflow_schedules()->>'revision')::bigint<>0 then raise exception 'Unexpected initial revision'; end if;
 original:=public.mutate_cashflow_schedule('schedule-create-1',0,'save',schedule);
 if (original->>'revision')::bigint<>1 then raise exception 'Revision did not advance'; end if;
 result:=public.mutate_cashflow_schedule('schedule-create-1',0,'save',schedule);
 if result<>original then raise exception 'Retry was not idempotent'; end if;
 begin
  perform public.mutate_cashflow_schedule('schedule-create-1',0,'save',jsonb_set(schedule,'{amount}','-49000'));
  raise exception 'Mismatched key accepted';
 exception when unique_violation then null;
 end;
 begin
  perform public.mutate_cashflow_schedule('schedule-stale-1',0,'save',schedule);
  raise exception 'Stale revision accepted';
 exception when check_violation then null;
 end;
 if jsonb_array_length(public.load_cashflow_schedules()->'schedules')<>1 then raise exception 'Duplicate schedule'; end if;
 result:=public.mutate_cashflow_schedule('schedule-delete-1',1,'remove',jsonb_build_object('id',schedule->>'id'));
 if (result->>'revision')::bigint<>2 or jsonb_array_length(result->'schedules')<>0 then raise exception 'Delete failed'; end if;
 result:=public.mutate_cashflow_schedule('schedule-create-1',0,'save',schedule);
 if (result->>'appliedRevision')::bigint<>1 or (result->>'revision')::bigint<>2 or jsonb_array_length(result->'schedules')<>0 then raise exception 'Old retry resurrected deleted data'; end if;
end $$;
select set_config('request.jwt.claim.sub','44444444-1234-4321-8123-123456789002',true);
do $$ begin
 if (public.load_cashflow_schedules()->>'revision')::bigint<>0 or jsonb_array_length(public.load_cashflow_schedules()->'schedules')<>0 then raise exception 'Owner leak'; end if;
 if (select count(*) from public.cashflow_schedule_attempts)<>0 then raise exception 'Attempt owner leak'; end if;
end $$;
rollback;
