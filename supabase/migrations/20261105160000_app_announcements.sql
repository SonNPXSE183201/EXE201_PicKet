-- In-app announcements: promotions, incidents, maintenance and general news.
-- One feed serves Android (Play and APK builds), web and future channels.
-- Targeting (channel, plan, app version, guest/member), schedule, locale and
-- a blocking maintenance mode are data; admins publish with MFA and audit.

insert into public.permission_catalog values('announcements.manage','Quản lý thông báo hệ thống') on conflict do nothing;

create table public.app_announcements(
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in('promotion','incident','maintenance','info','update')),
 severity text not null default 'info' check(severity in('info','warning','critical')),
 title_vi text not null check(length(trim(title_vi)) between 3 and 120),
 body_vi text not null default '' check(length(body_vi)<=1000),
 title_en text check(title_en is null or length(trim(title_en)) between 3 and 120),
 body_en text check(body_en is null or length(body_en)<=1000),
 cta_label_vi text check(cta_label_vi is null or length(cta_label_vi)<=40),
 cta_label_en text check(cta_label_en is null or length(cta_label_en)<=40),
 cta_route text check(cta_route is null or cta_route ~ '^/[a-z0-9/_-]{0,80}$'),
 cta_url text check(cta_url is null or cta_url ~ '^https://(app\.)?picketfinance\.com(/[^\s]*)?$'),
 promotion_id uuid references public.billing_promotions,
 incident_id uuid references public.admin_records,
 channels text[] not null default array['play','apk','web'] check(channels <@ array['play','apk','web']::text[] and cardinality(channels)>=1),
 tiers text[] not null default array['guest','free','plus','pro'] check(tiers <@ array['guest','free','plus','pro']::text[] and cardinality(tiers)>=1),
 min_version_code integer check(min_version_code is null or min_version_code>0),
 max_version_code integer check(max_version_code is null or max_version_code>0),
 starts_at timestamptz not null default now(),
 ends_at timestamptz,
 blocking boolean not null default false,
 dismissible boolean not null default true,
 notify boolean not null default false,
 pinned boolean not null default false,
 status text not null default 'draft' check(status in('draft','published','archived')),
 revision integer not null default 1,
 created_by uuid references auth.users on delete set null,
 updated_by uuid references auth.users on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(ends_at is null or ends_at>starts_at),
 check(not blocking or kind='maintenance'),
 check(not blocking or not dismissible),
 check(min_version_code is null or max_version_code is null or min_version_code<=max_version_code));
create index app_announcements_live on public.app_announcements(status,starts_at,ends_at);

create table public.announcement_audit(
 id bigint generated always as identity primary key,
 announcement_id uuid not null references public.app_announcements,
 actor uuid references auth.users on delete set null,
 before_value jsonb,
 after_value jsonb not null,
 reason text not null,
 created_at timestamptz not null default now());

alter table public.app_announcements enable row level security;
alter table public.announcement_audit enable row level security;
revoke all on public.app_announcements,public.announcement_audit from public,anon,authenticated;
grant all on public.app_announcements,public.announcement_audit to service_role;

-- Public feed (guests included). Tier comes from the caller's session.
create function public.announcements_feed(p_channel text,p_version_code integer default null,p_locale text default 'vi') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_tier text; v_en boolean:=lower(coalesce(p_locale,'vi')) like 'en%';begin
 if p_channel not in('play','apk','web') then raise exception 'Invalid channel' using errcode='22023';end if;
 v_tier:=case when auth.uid() is null then 'guest' else public.current_plan() end;
 return jsonb_build_object(
  'maintenance',coalesce((select jsonb_build_object('active',maintenance,'notice',notice) from public.app_settings where id),jsonb_build_object('active',false,'notice','')),
  'items',coalesce((select jsonb_agg(x order by x.pinned desc,x.severity_rank desc,x.starts_at desc) from(
   select a.id,a.kind,a.severity,case a.severity when 'critical' then 3 when 'warning' then 2 else 1 end as severity_rank,
    case when v_en and a.title_en is not null then a.title_en else a.title_vi end as title,
    case when v_en and a.body_en is not null then a.body_en else a.body_vi end as body,
    case when v_en and a.cta_label_en is not null then a.cta_label_en else a.cta_label_vi end as cta_label,
    a.cta_route,a.cta_url,a.promotion_id,a.starts_at,a.ends_at,a.blocking,a.dismissible,a.notify,a.pinned,a.revision
   from public.app_announcements a
   where a.status='published' and a.starts_at<=now() and(a.ends_at is null or a.ends_at>now())
    and p_channel=any(a.channels) and v_tier=any(a.tiers)
    and(p_version_code is null or ((a.min_version_code is null or p_version_code>=a.min_version_code) and(a.max_version_code is null or p_version_code<=a.max_version_code)))
   limit 20)x),'[]'::jsonb));
end$$;
revoke all on function public.announcements_feed(text,integer,text) from public;
grant execute on function public.announcements_feed(text,integer,text) to anon,authenticated;

create function public.announcement_list() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform picket_private.permission_require('announcements.manage');
 return jsonb_build_object('announcements',coalesce((select jsonb_agg(x order by x.updated_at desc) from(
  select a.*,(select coalesce(jsonb_agg(l order by l.id desc),'[]') from(select id,actor,reason,created_at from public.announcement_audit where announcement_id=a.id order by id desc limit 20)l) as audit
  from public.app_announcements a where a.status<>'archived' or a.updated_at>now()-interval '90 days')x),'[]'),
  'promotions',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name) order by created_at desc) from public.billing_promotions where enabled),'[]'),
  'incidents',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'status',status) order by updated_at desc) from public.admin_records where kind='incident' and status in('open','investigating','monitoring')),'[]'));
end$$;

create function public.announcement_save(p_body jsonb,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare prev public.app_announcements; v public.app_announcements; v_id uuid:=(p_body->>'id')::uuid;
 arr text[];begin
 perform picket_private.permission_require('announcements.manage',true);
 if p_reason is null or length(trim(p_reason)) not between 5 and 500 then raise exception 'Reason required' using errcode='22023';end if;
 if v_id is not null then
  select * into prev from public.app_announcements where id=v_id for update;
  if not found then raise exception 'Announcement not found' using errcode='P0002';end if;
  if prev.revision<>(p_body->>'revision')::int then raise exception 'Announcement changed by someone else' using errcode='PT409';end if;
 end if;
 insert into public.app_announcements as a(id,kind,severity,title_vi,body_vi,title_en,body_en,cta_label_vi,cta_label_en,cta_route,cta_url,promotion_id,incident_id,
  channels,tiers,min_version_code,max_version_code,starts_at,ends_at,blocking,dismissible,notify,pinned,status,created_by,updated_by)
 values(coalesce(v_id,gen_random_uuid()),p_body->>'kind',coalesce(p_body->>'severity','info'),p_body->>'titleVi',coalesce(p_body->>'bodyVi',''),
  nullif(p_body->>'titleEn',''),nullif(p_body->>'bodyEn',''),nullif(p_body->>'ctaLabelVi',''),nullif(p_body->>'ctaLabelEn',''),
  nullif(p_body->>'ctaRoute',''),nullif(p_body->>'ctaUrl',''),(nullif(p_body->>'promotionId',''))::uuid,(nullif(p_body->>'incidentId',''))::uuid,
  coalesce(nullif(array(select jsonb_array_elements_text(p_body->'channels')),'{}'::text[]),array['play','apk','web']),
  coalesce(nullif(array(select jsonb_array_elements_text(p_body->'tiers')),'{}'::text[]),array['guest','free','plus','pro']),
  (p_body->>'minVersionCode')::int,(p_body->>'maxVersionCode')::int,coalesce((p_body->>'startsAt')::timestamptz,now()),(p_body->>'endsAt')::timestamptz,
  coalesce((p_body->>'blocking')::boolean,false),coalesce((p_body->>'dismissible')::boolean,not coalesce((p_body->>'blocking')::boolean,false)),
  coalesce((p_body->>'notify')::boolean,false),coalesce((p_body->>'pinned')::boolean,false),coalesce(p_body->>'status','draft'),auth.uid(),auth.uid())
 on conflict(id) do update set kind=excluded.kind,severity=excluded.severity,title_vi=excluded.title_vi,body_vi=excluded.body_vi,title_en=excluded.title_en,body_en=excluded.body_en,
  cta_label_vi=excluded.cta_label_vi,cta_label_en=excluded.cta_label_en,cta_route=excluded.cta_route,cta_url=excluded.cta_url,promotion_id=excluded.promotion_id,incident_id=excluded.incident_id,
  channels=excluded.channels,tiers=excluded.tiers,min_version_code=excluded.min_version_code,max_version_code=excluded.max_version_code,starts_at=excluded.starts_at,ends_at=excluded.ends_at,
  blocking=excluded.blocking,dismissible=excluded.dismissible,notify=excluded.notify,pinned=excluded.pinned,status=excluded.status,
  revision=a.revision+1,updated_by=auth.uid(),updated_at=now()
 returning * into v;
 insert into public.announcement_audit(announcement_id,actor,before_value,after_value,reason) values(v.id,auth.uid(),case when v_id is null then null else to_jsonb(prev) end,to_jsonb(v),trim(p_reason));
 return to_jsonb(v);
end$$;
revoke all on function public.announcement_list(),public.announcement_save(jsonb,text) from public,anon;
grant execute on function public.announcement_list(),public.announcement_save(jsonb,text) to authenticated;
