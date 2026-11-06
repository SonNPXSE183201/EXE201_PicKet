-- Explicit opt-in for synthetic educational AI. No grant is inferred from login.
create table public.learning_ai_consents (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 accepted boolean not null default false,
 generation bigint not null default 0 check (generation >= 0),
 policy_version integer not null default 1 check (policy_version = 1),
 updated_at timestamptz not null default now()
);
alter table public.learning_ai_consents enable row level security;
revoke all on public.learning_ai_consents from anon, authenticated;
grant select on public.learning_ai_consents to authenticated;
create policy learning_ai_consent_owner_read on public.learning_ai_consents
 for select to authenticated
 using (owner_id = (select auth.uid()) and (select public.is_account_active()));

create function public.load_learning_ai_consent() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_owner uuid:=auth.uid(); v_result jsonb;
begin
 if v_owner is null or not public.is_account_active() then
  raise exception 'Active account required' using errcode='42501';
 end if;
 select jsonb_build_object('accepted',accepted,'generation',generation,
  'policyVersion',policy_version) into v_result
 from public.learning_ai_consents where owner_id=v_owner;
 return coalesce(v_result,jsonb_build_object('accepted',false,'generation',0,'policyVersion',1));
end $$;

create function public.set_learning_ai_consent(p_accepted boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_owner uuid:=auth.uid();
begin
 if v_owner is null or not public.is_account_active() then
  raise exception 'Active account required' using errcode='42501';
 end if;
 if p_accepted is null then raise exception 'Explicit consent required' using errcode='22023'; end if;
 -- Queue dispatch/completion must use the same owner lock and generation.
 perform pg_advisory_xact_lock(hashtextextended('learning-ai:'||v_owner::text,0));
 insert into public.learning_ai_consents(owner_id,accepted,generation)
 values(v_owner,p_accepted,case when p_accepted then 1 else 0 end)
 on conflict(owner_id) do update set
  accepted=excluded.accepted,
  generation=public.learning_ai_consents.generation+1,
  updated_at=now()
 where public.learning_ai_consents.accepted is distinct from excluded.accepted;
 return public.load_learning_ai_consent();
end $$;
revoke all on function public.load_learning_ai_consent() from public,anon;
revoke all on function public.set_learning_ai_consent(boolean) from public,anon;
grant execute on function public.load_learning_ai_consent() to authenticated;
grant execute on function public.set_learning_ai_consent(boolean) to authenticated;
