create function public.is_account_active() returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from auth.users where id=auth.uid() and (banned_until is null or banned_until<=now()));
$$;
revoke all on function public.is_account_active() from public;
grant execute on function public.is_account_active() to authenticated;
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path='' as $$ select public.is_account_active() and exists(select 1 from public.staff_members where user_id=auth.uid()); $$;
alter policy owner_read on public.finance_snapshots using(user_id=(select auth.uid()) and (select public.is_account_active()));
alter policy media_owner_select on storage.objects using(bucket_id='picket-media' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.is_account_active()));
alter policy media_owner_insert on storage.objects with check(bucket_id='picket-media' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.is_account_active()));
alter policy media_owner_update on storage.objects using(bucket_id='picket-media' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.is_account_active())) with check(bucket_id='picket-media' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.is_account_active()));
alter policy media_owner_delete on storage.objects using(bucket_id='picket-media' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.is_account_active()));
create function public.reject_suspended_snapshot() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and not public.is_account_active() then raise exception 'Account suspended' using errcode='42501'; end if;
 return new;
end $$;
create trigger snapshot_account_active before insert or update on public.finance_snapshots for each row execute function public.reject_suspended_snapshot();
create table public.plan_grants(user_id uuid primary key references auth.users(id) on delete cascade,tier text not null check(tier in ('plus','pro')),expires_at timestamptz not null,granted_by uuid references auth.users(id) on delete set null);
alter table public.plan_grants enable row level security;
revoke all on public.plan_grants from anon,authenticated;
grant select on public.plan_grants to authenticated;
create policy grant_owner_read on public.plan_grants for select to authenticated using(user_id=(select auth.uid()));
create or replace function public.current_plan() returns text language sql stable security definer set search_path='' as $$
select coalesce((select tier from (
 select tier from public.play_purchases where user_id=auth.uid() and active and expires_at>now() and verified_at>now()-interval '24 hours'
 union all select tier from public.plan_grants where user_id=auth.uid() and expires_at>now()
) plans where public.is_account_active() order by case tier when 'pro' then 2 else 1 end desc limit 1),'free');
$$;
grant all on public.staff_members,public.admin_audit,public.plan_grants to service_role;
grant usage on sequence public.admin_audit_id_seq to service_role;
