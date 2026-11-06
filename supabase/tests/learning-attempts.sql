begin;
insert into auth.users(id,email) values ('22222222-1234-4321-8123-123456789001','learning-a@example.test'),('22222222-1234-4321-8123-123456789002','learning-b@example.test');
-- Review gate is enabled only inside this rolled-back local test.
update public.learning_answer_keys set published=true where lesson_id='picket.vi.financial.v1.01';
set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-1234-4321-8123-123456789001',true);
do $$ declare result jsonb; begin
 result:=public.submit_learning_attempt('attempt1','picket.vi.financial.v1.01',1,array[1,1,2]);
 if result->>'correct'<>'3' or result->>'awardedXp'<>'20' then raise exception 'Incorrect grade or award'; end if;
 result:=public.submit_learning_attempt('attempt1','picket.vi.financial.v1.01',1,array[1,1,2]);
 if result->>'replayed'<>'true' then raise exception 'Replay failed'; end if;
 result:=public.submit_learning_attempt('attempt2','picket.vi.financial.v1.01',1,array[0,1,2]);
 if result->>'correct'<>'2' or result->>'awardedXp'<>'0' then raise exception 'Duplicate XP'; end if;
 begin
  perform public.submit_learning_attempt('attempt1','picket.vi.financial.v1.01',1,array[0,0,0]);
  raise exception 'Payload mismatch accepted';
 exception when unique_violation then null; end;
 begin
  perform public.submit_learning_attempt('invalid_attempt','picket.vi.financial.v1.01',1,array[1,null,2]);
  raise exception 'Incomplete answers accepted';
 exception when invalid_parameter_value then null; end;
 begin
  perform public.submit_learning_attempt('draft_attempt','picket.vi.financial.v1.02',1,array[0,1,2]);
  raise exception 'Draft content accepted';
 exception when invalid_parameter_value then null; end;
 if (select sum(xp) from public.learning_progress)<>20 then raise exception 'Bad XP total'; end if;
end $$;
select set_config('request.jwt.claim.sub','22222222-1234-4321-8123-123456789002',true);
do $$ begin
 if exists(select 1 from public.learning_progress) or exists(select 1 from public.learning_attempts) then raise exception 'Owner leak'; end if;
end $$;
rollback;
