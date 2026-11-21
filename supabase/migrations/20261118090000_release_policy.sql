-- Public, read-only update policy for the in-app updater.
-- play -> live play_production row; apk -> live landing row. Never falls back to
-- internal/closed/open testing: those tracks must not force production users.
create function public.public_release_policy(p_channel text) returns jsonb language sql stable security definer set search_path='' as $$
 select case when p_channel in('play','apk') then
  -- The floor is the highest one ever set on a live or superseded row of the channel:
  -- readback inserts new Play rows without a floor, which must not silently lift it.
  coalesce((select jsonb_build_object('channel',p_channel,'latestVersionCode',r.version_code,'minSupportedVersionCode',
     (select max(f.min_supported_code) from public.app_releases f where f.channel=r.channel and f.status in('live','superseded')))
   from public.app_releases r
   where r.channel=case p_channel when 'play' then 'play_production' else 'landing' end and r.status='live'
   order by r.version_code desc limit 1),
   jsonb_build_object('channel',p_channel,'latestVersionCode',null,'minSupportedVersionCode',null))
 end
$$;
revoke all on function public.public_release_policy(text) from public,anon,authenticated;
grant execute on function public.public_release_policy(text) to anon,authenticated,service_role;

-- Explicit guard (the table CHECK already enforces it, this gives a clear error):
-- a forced-update floor above the build's own version code would lock everyone out.
create or replace function public.release_save(p_body jsonb,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare prev public.app_releases; v public.app_releases; v_id uuid:=(p_body->>'id')::uuid;begin
 perform picket_private.admin_require('releases',true);
 if p_reason is null or length(trim(p_reason)) not between 5 and 500 then raise exception 'Reason required' using errcode='22023';end if;
 if nullif(p_body->>'minSupportedCode','') is not null and (p_body->>'minSupportedCode')::int>(p_body->>'versionCode')::int then
  raise exception 'minSupportedCode must not exceed versionCode' using errcode='22023';end if;
 if v_id is not null then
  select * into prev from public.app_releases where id=v_id for update;
  if not found then raise exception 'Release not found' using errcode='P0002';end if;
  if prev.revision<>(p_body->>'revision')::int then raise exception 'Release changed by someone else' using errcode='PT409';end if;
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
revoke all on function public.release_save(jsonb,text) from public,anon,authenticated;
grant execute on function public.release_save(jsonb,text) to authenticated;
