create table public.staff_members (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.staff_members enable row level security;
revoke all on public.staff_members from public,anon,authenticated;
create function public.is_staff() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.staff_members where user_id=auth.uid()); $$;
revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;
create table public.app_settings(id boolean primary key default true check(id),maintenance boolean not null default false,notice text not null default '' check(length(notice)<=1000));
insert into public.app_settings(id) values(true);
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon,authenticated;
grant select on public.app_settings to authenticated;
create policy settings_read on public.app_settings for select to authenticated using(true);
create table public.admin_audit(id bigint generated always as identity primary key,actor uuid references auth.users(id) on delete set null,action text not null,target text,created_at timestamptz not null default now());
alter table public.admin_audit enable row level security;
revoke all on public.admin_audit from anon,authenticated;
create table public.ocr_events(id bigint generated always as identity primary key,user_id uuid not null references auth.users(id) on delete cascade,success boolean not null,duration_ms integer not null check(duration_ms between 0 and 3600000),created_at timestamptz not null default now());
alter table public.ocr_events enable row level security;
revoke all on public.ocr_events from anon,authenticated;
grant insert(user_id,success,duration_ms) on public.ocr_events to authenticated;
grant usage on sequence public.ocr_events_id_seq to authenticated;
create policy ocr_owner_insert on public.ocr_events for insert to authenticated with check(user_id=(select auth.uid()));
create table public.partner_ads(id uuid primary key default gen_random_uuid(),title text not null check(length(title) between 1 and 120),body text not null default '' check(length(body)<=500),url text not null check(url ~ '^https://'),active boolean not null default false,created_at timestamptz not null default now());
alter table public.partner_ads enable row level security;
revoke all on public.partner_ads from anon,authenticated;
grant select on public.partner_ads to authenticated;
create policy ads_visible on public.partner_ads for select to authenticated using(active or public.is_staff());

create function public.admin_overview(page_number integer default 0) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_staff() then raise exception 'Staff required' using errcode='42501'; end if;
 if page_number<0 or page_number>100000 then raise exception 'Invalid page'; end if;
 select jsonb_build_object(
 'total_users',(select count(*) from auth.users),
 'total_ledgers',(select count(*) from public.finance_snapshots),
 'users',coalesce((select jsonb_agg(x) from (select u.id,u.email,u.created_at,u.banned_until,s.revision,jsonb_array_length(coalesce(s.payload->'entries','[]'::jsonb)) as entry_count from auth.users u left join public.finance_snapshots s on s.user_id=u.id order by u.created_at desc,u.id limit 25 offset page_number*25)x),'[]'::jsonb),
 'ocr',coalesce((select jsonb_agg(x) from (select date_trunc('day',created_at) as day,count(*) as scans,count(*) filter(where success) as successful,round(avg(duration_ms)) as average_ms from public.ocr_events where created_at>now()-interval '30 days' group by 1 order by 1 desc)x),'[]'::jsonb),
 'ads',coalesce((select jsonb_agg(a order by created_at desc) from public.partner_ads a),'[]'::jsonb),
 'settings',(select to_jsonb(s) from public.app_settings s where id),
 'audit',coalesce((select jsonb_agg(x) from (select action,target,created_at from public.admin_audit order by id desc limit 50)x),'[]'::jsonb)
 ) into result;
 insert into public.admin_audit(actor,action,target) values(auth.uid(),'view_overview',page_number::text);
 return result;
end $$;
revoke all on function public.admin_overview(integer) from public;
grant execute on function public.admin_overview(integer) to authenticated;
create function public.admin_ledger(target_user uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_staff() then raise exception 'Staff required' using errcode='42501'; end if;
 select jsonb_build_object('entries',payload->'entries','wallets',payload->'wallets','revision',revision) into result from public.finance_snapshots where user_id=target_user;
 insert into public.admin_audit(actor,action,target) values(auth.uid(),'view_ledger',target_user::text);
 return coalesce(result,'{}'::jsonb);
end $$;
revoke all on function public.admin_ledger(uuid) from public;
grant execute on function public.admin_ledger(uuid) to authenticated;
create function public.admin_save_settings(p_maintenance boolean,p_notice text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_staff() then raise exception 'Staff required' using errcode='42501'; end if;
 update public.app_settings set maintenance=p_maintenance,notice=p_notice where id;
 insert into public.admin_audit(actor,action) values(auth.uid(),'update_settings');
end $$;
revoke all on function public.admin_save_settings(boolean,text) from public;
grant execute on function public.admin_save_settings(boolean,text) to authenticated;
create function public.admin_save_ad(p_id uuid,p_title text,p_body text,p_url text,p_active boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_staff() then raise exception 'Staff required' using errcode='42501'; end if;
 insert into public.partner_ads(id,title,body,url,active) values(coalesce(p_id,gen_random_uuid()),p_title,p_body,p_url,p_active)
 on conflict(id) do update set title=excluded.title,body=excluded.body,url=excluded.url,active=excluded.active;
 insert into public.admin_audit(actor,action,target) values(auth.uid(),'save_ad',p_id::text);
end $$;
revoke all on function public.admin_save_ad(uuid,text,text,text,boolean) from public;
grant execute on function public.admin_save_ad(uuid,text,text,text,boolean) to authenticated;
create function public.enforce_maintenance() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.app_settings where maintenance) and not public.is_staff() and current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then raise exception 'Cloud is under maintenance' using errcode='55000'; end if;
 return new;
end $$;
create trigger snapshot_maintenance before insert or update on public.finance_snapshots for each row execute function public.enforce_maintenance();
