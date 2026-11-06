-- Answer keys are server-owned. Draft content cannot accept cloud attempts.
create table public.learning_answer_keys (
  lesson_id text not null,
  content_version integer not null check (content_version > 0),
  correct_answers integer[] not null,
  choice_counts integer[] not null,
  published boolean not null default false,
  primary key (lesson_id,content_version),
  check (cardinality(correct_answers) between 2 and 10),
  check (cardinality(correct_answers)=cardinality(choice_counts))
);
alter table public.learning_answer_keys enable row level security;
revoke all on public.learning_answer_keys from public,anon,authenticated;

create table public.learning_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  content_version integer not null,
  xp integer not null default 20 check (xp=20),
  completed_at timestamptz not null default now(),
  primary key(user_id,lesson_id,content_version),
  foreign key(lesson_id,content_version) references public.learning_answer_keys
);
create table public.learning_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_key text not null check (length(request_key) between 1 and 200),
  lesson_id text not null,
  content_version integer not null,
  answers integer[] not null,
  correct_count integer not null,
  awarded_xp integer not null check (awarded_xp in (0,20)),
  created_at timestamptz not null default now(),
  primary key(user_id,request_key),
  foreign key(lesson_id,content_version) references public.learning_answer_keys
);
alter table public.learning_progress enable row level security;
alter table public.learning_attempts enable row level security;
revoke all on public.learning_progress,public.learning_attempts from public,anon,authenticated;
grant select on public.learning_progress,public.learning_attempts to authenticated;
create policy learning_progress_owner on public.learning_progress for select to authenticated
  using (user_id=(select auth.uid()) and (select public.is_account_active()));
create policy learning_attempt_owner on public.learning_attempts for select to authenticated
  using (user_id=(select auth.uid()) and (select public.is_account_active()));

create or replace function public.submit_learning_attempt(
  p_request_key text, p_lesson_id text, p_content_version integer, p_answers integer[]
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  owner uuid := auth.uid();
  answer_key public.learning_answer_keys;
  previous public.learning_attempts;
  score integer := 0;
  inserted_count integer;
  awarded integer;
  i integer;
begin
  if owner is null or not public.is_account_active() then
    raise exception 'Unauthorized' using errcode='42501';
  end if;
  if p_request_key is null or p_request_key !~ '^[A-Za-z0-9._:-]{8,128}$' then
    raise exception 'Invalid attempt key' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(owner::text||':'||p_request_key,0));
  select * into previous from public.learning_attempts
    where user_id=owner and request_key=p_request_key;
  if found then
    if previous.lesson_id is distinct from p_lesson_id or
       previous.content_version is distinct from p_content_version or
       previous.answers is distinct from p_answers then
      raise exception 'Attempt key payload mismatch' using errcode='23505';
    end if;
    return jsonb_build_object('correct',previous.correct_count,
      'total',cardinality(previous.answers),'awardedXp',previous.awarded_xp,'replayed',true);
  end if;
  select * into answer_key from public.learning_answer_keys
    where lesson_id=p_lesson_id and content_version=p_content_version and published;
  if not found then raise exception 'Lesson not available' using errcode='22023'; end if;
  if p_answers is null or array_ndims(p_answers) is distinct from 1 or
     array_lower(p_answers,1) is distinct from 1 or
     cardinality(p_answers)<>cardinality(answer_key.correct_answers) then
    raise exception 'Complete every question' using errcode='22023';
  end if;
  for i in 1..cardinality(p_answers) loop
    if p_answers[i] is null or p_answers[i]<0 or p_answers[i]>=answer_key.choice_counts[i] then
      raise exception 'Invalid answer' using errcode='22023';
    end if;
    if p_answers[i]=answer_key.correct_answers[i] then score:=score+1; end if;
  end loop;
  insert into public.learning_progress(user_id,lesson_id,content_version)
    values(owner,p_lesson_id,p_content_version) on conflict do nothing;
  get diagnostics inserted_count=row_count;
  awarded:=inserted_count*20;
  insert into public.learning_attempts(user_id,request_key,lesson_id,content_version,answers,correct_count,awarded_xp)
    values(owner,p_request_key,p_lesson_id,p_content_version,p_answers,score,awarded);
  return jsonb_build_object('correct',score,'total',cardinality(p_answers),
    'awardedXp',awarded,'replayed',false);
end;
$$;
revoke all on function public.submit_learning_attempt(text,text,integer,integer[]) from public,anon;
grant execute on function public.submit_learning_attempt(text,text,integer,integer[]) to authenticated;
insert into public.learning_answer_keys(lesson_id,content_version,correct_answers,choice_counts,published) values
('picket.vi.financial.v1.01',1,ARRAY[1,1,2],ARRAY[3,3,3],false),
('picket.vi.financial.v1.02',1,ARRAY[0,1,2],ARRAY[3,3,3],false),
('picket.vi.financial.v1.03',1,ARRAY[1,0,2],ARRAY[3,3,3],false),
('picket.vi.financial.v1.04',1,ARRAY[1,2,0],ARRAY[3,3,3],false),
('picket.vi.financial.v1.05',1,ARRAY[1,0,2],ARRAY[3,3,3],false),
('picket.vi.financial.v1.06',1,ARRAY[1,2,0],ARRAY[3,3,3],false),
('picket.vi.financial.v1.07',1,ARRAY[1,0,2],ARRAY[3,3,3],false),
('picket.vi.financial.v1.08',1,ARRAY[0,1,2],ARRAY[3,3,3],false),
('picket.vi.financial.v1.09',1,ARRAY[1,0,2],ARRAY[3,3,3],false),
('picket.vi.financial.v1.10',1,ARRAY[1,2,0],ARRAY[3,3,3],false),
('picket.vi.financial.v1.11',1,ARRAY[1,0,2],ARRAY[3,3,3],false),
('picket.vi.financial.v1.12',1,ARRAY[1,1,2],ARRAY[3,3,3],false);

