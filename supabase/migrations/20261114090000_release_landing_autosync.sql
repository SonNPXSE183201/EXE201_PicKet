-- The landing probe used to only *verify* the live landing row. After a landing deploy the public
-- release.json is newer than the registry, so the probe only reported a mismatch and the admin
-- "Phiên bản" page and the in-app update manifest stayed on the old build. Now a strictly newer,
-- complete landing manifest is recorded as the live landing release (the previous one is superseded by
-- the existing trigger). Anything else (older, same code with different bytes, incomplete) is still
-- reported as a mismatch and never overwrites the registry. Play rows are unchanged.
create or replace function public.release_readback(p_rows jsonb,p_source text) returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb; v public.app_releases; n int:=0; mismatches jsonb:='[]'; v_code int;begin
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
   v_code:=case when (r->>'versionCode') ~ '^\d{1,10}$' then (r->>'versionCode')::int end;
   if v.id is not null and v.version_code=v_code and v.sha256 is not distinct from r->>'sha256' and v.bytes is not distinct from (r->>'bytes')::bigint then
    update public.app_releases set verified_at=now(),verified_by='landing_probe' where id=v.id; n:=n+1;
   elsif v_code is not null and (v.id is null or v_code>v.version_code)
     and coalesce(r->>'version','') ~ '^\d+\.\d+\.\d+$'
     and coalesce(r->>'sha256','') ~ '^[a-f0-9]{64}$'
     and coalesce(r->>'bytes','') ~ '^\d{1,12}$'
     and coalesce(r->>'filename','') ~ '^[a-z0-9][a-z0-9.-]*\.apk$' and r->>'filename' !~ '\.\.'
     and coalesce(r->>'abi','') in('arm64-v8a','universal')
     and coalesce(r->>'minSdk','') ~ '^\d{2}$'
     and coalesce(r->>'packageName','com.picket.mobile')='com.picket.mobile' then
    insert into public.app_releases as a(channel,version_name,version_code,status,rollout_percent,sha256,bytes,filename,abi,min_sdk,
      min_supported_code,released_at,verified_at,verified_by,evidence)
    values('landing',r->>'version',v_code,'live',100,r->>'sha256',(r->>'bytes')::bigint,r->>'filename',r->>'abi',(r->>'minSdk')::int,
      case when (r->>'minSupportedVersionCode') ~ '^\d{1,10}$' and (r->>'minSupportedVersionCode')::int<=v_code then (r->>'minSupportedVersionCode')::int end,
      coalesce((r->>'publishedAt')::date::timestamptz,now()),now(),'landing_probe',jsonb_build_object('source','release.json'))
    on conflict(channel,version_code) do update set status='live',version_name=excluded.version_name,sha256=excluded.sha256,bytes=excluded.bytes,
      filename=excluded.filename,abi=excluded.abi,min_sdk=excluded.min_sdk,verified_at=now(),verified_by='landing_probe',
      evidence=a.evidence||excluded.evidence,revision=a.revision+1,updated_at=now()
    returning * into v;
    insert into public.release_audit(release_id,source,after_value,reason) values(v.id,p_source,to_jsonb(v),'Landing readback: new build published');
    n:=n+1;
   else
    mismatches:=mismatches||jsonb_build_array(jsonb_build_object('expected',jsonb_build_object('versionCode',v.version_code,'sha256',v.sha256),'observed',r));
   end if;
  end if;
 end loop;
 return jsonb_build_object('updated',n,'mismatches',mismatches);
end$$;
revoke all on function public.release_readback(jsonb,text) from public,anon,authenticated;
grant execute on function public.release_readback(jsonb,text) to service_role;
