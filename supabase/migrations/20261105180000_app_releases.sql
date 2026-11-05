-- Release registry for every distribution channel: Google Play tracks,
-- APKPure and the landing page. One source of truth for what is live where,
-- with verification evidence. The landing release.json is generated from the
-- live landing row; closed-testing tracks are only ever read, never written.

create table public.app_releases(
 id uuid primary key default gen_random_uuid(),
 channel text not null check(channel in('play_internal','play_alpha','play_beta','play_production','apkpure','landing')),
 version_name text not null check(version_name ~ '^\d+\.\d+\.\d+$'),
 version_code integer not null check(version_code between 1 and 2100000000),
 status text not null default 'draft' check(status in('draft','submitted','in_review','live','halted','superseded')),
 rollout_percent numeric(5,2) check(rollout_percent is null or rollout_percent between 0 and 100),
 sha256 text check(sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
 bytes bigint check(bytes is null or bytes>0),
 filename text check(filename is null or (filename ~ '^[a-z0-9][a-z0-9.-]*\.apk$' and filename !~ '\.\.')),
 abi text check(abi is null or abi in('arm64-v8a','universal')),
 min_sdk integer check(min_sdk is null or min_sdk between 24 and 40),
 min_supported_code integer check(min_supported_code is null or min_supported_code>0),
 notes_vi text check(notes_vi is null or length(notes_vi)<=2000),
 notes_en text check(notes_en is null or length(notes_en)<=2000),
 released_at timestamptz,
 verified_at timestamptz,
 verified_by text check(verified_by is null or verified_by in('play_api','landing_probe','manual')),
 evidence jsonb not null default '{}',
 revision integer not null default 1,
 created_by uuid references auth.users on delete set null,
 updated_by uuid references auth.users on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(channel,version_code),
 check(min_supported_code is null or min_supported_code<=version_code),
 -- A downloadable landing build must be verifiable by size and checksum.
 check(channel<>'landing' or status<>'live' or (sha256 is not null and bytes is not null and filename is not null and abi is not null and min_sdk is not null)));
create index app_releases_channel on public.app_releases(channel,version_code desc);

create table public.release_audit(
 id bigint generated always as identity primary key,
 release_id uuid not null references public.app_releases,
 actor uuid references auth.users on delete set null,
 source text not null,
 before_value jsonb,
 after_value jsonb not null,
 reason text not null,
 created_at timestamptz not null default now());

alter table public.app_releases enable row level security;
alter table public.release_audit enable row level security;
revoke all on public.app_releases,public.release_audit from public,anon,authenticated;
grant all on public.app_releases,public.release_audit to service_role;

-- Only one live release per channel: going live supersedes the previous one.
create function picket_private.release_supersede() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='live' then
  update public.app_releases set status='superseded',updated_at=now() where channel=new.channel and status='live' and id<>new.id and version_code<new.version_code;
 end if;
 return null;
end$$;
revoke all on function picket_private.release_supersede() from public,anon,authenticated;
create trigger release_supersede after insert or update of status on public.app_releases for each row execute function picket_private.release_supersede();

-- Seed with the state read back on 05/11/2026 (Play Publisher API, landing manifest).
insert into public.app_releases(channel,version_name,version_code,status,rollout_percent,released_at,verified_at,verified_by,evidence) values
 ('play_internal','1.0.14',28,'live',100,'2026-11-01','2026-11-05','play_api','{"track":"internal","status":"completed"}'),
 ('play_alpha','1.0.14',28,'live',100,'2026-11-01','2026-11-05','play_api','{"track":"alpha","status":"completed","note":"Closed testing: read-only, never modified by automation"}');
insert into public.app_releases(channel,version_name,version_code,status,sha256,bytes,filename,abi,min_sdk,released_at,verified_at,verified_by,evidence) values
 ('landing','1.0.14',28,'live','1713c3dfbbe220720e5a355442d0de8b4d5cc27b7c89840c1b1f0a2a0120b17b',161644903,'picket-1.0.14-28-20261101-1713c3df.apk','arm64-v8a',24,'2026-11-01','2026-11-01','landing_probe','{"manifest":"https://picketfinance.com/release.json"}');
insert into public.app_releases(channel,version_name,version_code,status,abi,notes_vi,evidence) values
 ('apkpure','1.0.14',28,'submitted','universal','Artifact đã ký và chuẩn bị; chưa có readback trạng thái trên portal APKPure.','{"source":"PROJECT_STATUS 01/11"}');

create function public.release_list() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_live jsonb;begin
 perform picket_private.admin_require('releases');
 select coalesce(jsonb_object_agg(channel,jsonb_build_object('versionName',version_name,'versionCode',version_code,'verifiedAt',verified_at)),'{}') into v_live
 from public.app_releases where status='live';
 return jsonb_build_object('live',v_live,
  'releases',coalesce((select jsonb_agg(x order by x.version_code desc,x.channel) from(
   select r.*,(select coalesce(jsonb_agg(a order by a.id desc),'[]') from(select id,source,reason,created_at from public.release_audit where release_id=r.id order by id desc limit 10)a) as audit
   from public.app_releases r)x),'[]'),
  -- Drift: a sideloaded (landing/APKPure) build older than what Play testers have.
  'warnings',coalesce((select jsonb_agg(w) from(
   select format('Landing %s cũ hơn %s %s',l.version_code,p.channel,p.version_code) as w
   from public.app_releases l join public.app_releases p on p.status='live' and p.channel like 'play_%' and p.version_code>l.version_code
   where l.channel='landing' and l.status='live')x),'[]'));
end$$;

create function public.release_save(p_body jsonb,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare prev public.app_releases; v public.app_releases; v_id uuid:=(p_body->>'id')::uuid;begin
 perform picket_private.admin_require('releases',true);
 if p_reason is null or length(trim(p_reason)) not between 5 and 500 then raise exception 'Reason required' using errcode='22023';end if;
 if v_id is not null then
  select * into prev from public.app_releases where id=v_id for update;
  if not found then raise exception 'Release not found' using errcode='P0002';end if;
  if prev.revision<>(p_body->>'revision')::int then raise exception 'Release changed by someone else' using errcode='PT409';end if;
  -- Play tracks are owned by Google; admins only annotate them here.
  if prev.channel like 'play_%' and coalesce(p_body->>'status',prev.status)<>prev.status then raise exception 'Play track status comes from Play readback' using errcode='22023';end if;
 elsif (p_body->>'channel') like 'play_%' then raise exception 'Play tracks are recorded by readback' using errcode='22023';
 end if;
 insert into public.app_releases as r(id,channel,version_name,version_code,status,rollout_percent,sha256,bytes,filename,abi,min_sdk,min_supported_code,notes_vi,notes_en,released_at,verified_at,verified_by,evidence,created_by,updated_by)
 values(coalesce(v_id,gen_random_uuid()),coalesce(prev.channel,p_body->>'channel'),p_body->>'versionName',(p_body->>'versionCode')::int,coalesce(p_body->>'status','draft'),
  (p_body->>'rolloutPercent')::numeric,nullif(p_body->>'sha256',''),(p_body->>'bytes')::bigint,nullif(p_body->>'filename',''),nullif(p_body->>'abi',''),(p_body->>'minSdk')::int,
  (p_body->>'minSupportedCode')::int,nullif(p_body->>'notesVi',''),nullif(p_body->>'notesEn',''),(p_body->>'releasedAt')::timestamptz,
  case when p_body->>'status'='live' then now() end,case when p_body->>'status'='live' then 'manual' end,coalesce(p_body->'evidence','{}'),auth.uid(),auth.uid())
 on conflict(id) do update set version_name=excluded.version_name,version_code=excluded.version_code,status=excluded.status,rollout_percent=excluded.rollout_percent,
  sha256=excluded.sha256,bytes=excluded.bytes,filename=excluded.filename,abi=excluded.abi,min_sdk=excluded.min_sdk,min_supported_code=excluded.min_supported_code,
  notes_vi=excluded.notes_vi,notes_en=excluded.notes_en,released_at=excluded.released_at,
  verified_at=case when excluded.status='live' and r.status<>'live' then now() else r.verified_at end,
  verified_by=case when excluded.status='live' and r.status<>'live' then 'manual' else r.verified_by end,
  evidence=r.evidence||excluded.evidence,revision=r.revision+1,updated_by=auth.uid(),updated_at=now()
 returning * into v;
 insert into public.release_audit(release_id,actor,source,before_value,after_value,reason) values(v.id,auth.uid(),'admin',case when v_id is null then null else to_jsonb(prev) end,to_jsonb(v),trim(p_reason));
 return to_jsonb(v);
end$$;

-- Worker readback. Play rows mirror the track state; landing rows confirm the
-- public manifest matches the registry (a mismatch is recorded, not trusted).
create function public.release_readback(p_rows jsonb,p_source text) returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb; v public.app_releases; n int:=0; mismatches jsonb:='[]';begin
 if p_source not in('play_api','landing_probe') or jsonb_typeof(p_rows)<>'array' then raise exception 'Invalid readback' using errcode='22023';end if;
 for r in select * from jsonb_array_elements(p_rows) loop
  if p_source='play_api' then
   if (r->>'channel') not in('play_internal','play_alpha','play_beta','play_production') then raise exception 'Invalid track' using errcode='22023';end if;
   insert into public.app_releases as a(channel,version_name,version_code,status,rollout_percent,released_at,verified_at,verified_by,evidence)
   values(r->>'channel',coalesce(substring(r->>'name' from '^(\d+\.\d+\.\d+)'),'0.0.0'),(r->>'versionCode')::int,
    case r->>'status' when 'completed' then 'live' when 'inProgress' then 'live' when 'halted' then 'halted' else 'draft' end,
    case when r->>'userFraction' is null then 100 else round((r->>'userFraction')::numeric*100,2) end,now(),now(),'play_api',
    jsonb_build_object('playStatus',r->>'status','name',r->>'name'))
   on conflict(channel,version_code) do update set status=excluded.status,rollout_percent=excluded.rollout_percent,verified_at=now(),verified_by='play_api',
    evidence=a.evidence||excluded.evidence,updated_at=now()
   where a.status is distinct from excluded.status or a.rollout_percent is distinct from excluded.rollout_percent or a.verified_at<now()-interval '1 hour'
   returning * into v;
   if v.id is not null then
    insert into public.release_audit(release_id,source,after_value,reason) values(v.id,p_source,to_jsonb(v),'Play readback');
    n:=n+1; v:=null;
   end if;
  else
   select * into v from public.app_releases where channel='landing' and status='live';
   if v.id is null or v.version_code<>(r->>'versionCode')::int or v.sha256 is distinct from r->>'sha256' or v.bytes is distinct from (r->>'bytes')::bigint then
    mismatches:=mismatches||jsonb_build_array(jsonb_build_object('expected',jsonb_build_object('versionCode',v.version_code,'sha256',v.sha256),'observed',r));
   else
    update public.app_releases set verified_at=now(),verified_by='landing_probe' where id=v.id; n:=n+1;
   end if;
  end if;
 end loop;
 return jsonb_build_object('updated',n,'mismatches',mismatches);
end$$;

-- Public landing manifest (release.json shape) built from the live landing row.
create function public.release_landing_manifest() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('version',version_name,'versionCode',version_code,'publishedAt',to_char(coalesce(released_at,created_at) at time zone 'Asia/Ho_Chi_Minh','YYYY-MM-DD'),
  'filename',filename,'abi',abi,'minSdk',min_sdk,'packageName','com.picket.mobile','bytes',bytes,'sha256',sha256,
  'minSupportedVersionCode',coalesce(min_supported_code,1))
 from public.app_releases where channel='landing' and status='live' order by version_code desc limit 1
$$;

revoke all on function public.release_list(),public.release_save(jsonb,text),public.release_readback(jsonb,text),public.release_landing_manifest() from public,anon,authenticated;
grant execute on function public.release_list(),public.release_save(jsonb,text) to authenticated;
grant execute on function public.release_readback(jsonb,text) to service_role;
grant execute on function public.release_landing_manifest() to anon,authenticated,service_role;
