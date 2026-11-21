begin;
insert into auth.users(id,email,email_confirmed_at) values('eb000000-0000-4000-8000-000000000001','policy-owner@example.test',now());
insert into public.staff_members(user_id,role) values('eb000000-0000-4000-8000-000000000001','owner');

-- No live production row yet: play policy is empty, never borrowed from testing tracks.
set local role anon;
do $$declare p jsonb;begin
 p:=public.public_release_policy('play');
 if p->>'channel'<>'play' or p->'latestVersionCode'<>'null'::jsonb or p->'minSupportedVersionCode'<>'null'::jsonb then raise exception 'play policy should be empty: %',p;end if;
 p:=public.public_release_policy('apk');
 if p->>'channel'<>'apk' or (p->>'latestVersionCode')::int is null then raise exception 'apk policy wrong: %',p;end if;
 if public.public_release_policy('internal') is not null then raise exception 'unknown channel accepted';end if;
end$$;
reset role;

insert into public.app_releases(channel,version_name,version_code,status,min_supported_code) values('play_production','1.2.0',34,'live',30);
set local role anon;
do $$declare p jsonb;begin
 p:=public.public_release_policy('play');
 if (p->>'latestVersionCode')::int<>34 or (p->>'minSupportedVersionCode')::int<>30 then raise exception 'play policy wrong: %',p;end if;
end$$;
reset role;

-- Admin guard: a floor above the build's own code is refused; a valid one saves on a Play row.
select set_config('request.jwt.claim.sub','eb000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
set local role authenticated;
do $$declare r jsonb; prod jsonb;begin
 select x into prod from jsonb_array_elements(public.release_list()->'releases') x where x->>'channel'='play_production';
 begin perform public.release_save(jsonb_build_object('id',prod->>'id','revision',(prod->>'revision')::int,'versionName','1.2.0','versionCode',34,'minSupportedCode',40),'Lock everyone out'); raise exception 'floor above code accepted'; exception when invalid_parameter_value then null; end;
 r:=public.release_save(jsonb_build_object('id',prod->>'id','revision',(prod->>'revision')::int,'versionName','1.2.0','versionCode',34,'minSupportedCode',33),'Raise floor to 33');
 if (r->>'min_supported_code')::int<>33 then raise exception 'floor not saved';end if;
end$$;
reset role;
do $$begin if (public.public_release_policy('play')->>'minSupportedVersionCode')::int<>33 then raise exception 'policy not updated';end if;end$$;
-- A newer live row from readback carries no floor; the floor set earlier must still apply.
update public.app_releases set status='superseded' where channel='play_production' and version_code=34;
insert into public.app_releases(channel,version_name,version_code,status) values('play_production','1.3.0',35,'live');
do $$declare p jsonb;begin p:=public.public_release_policy('play');
 if (p->>'latestVersionCode')::int<>35 or (p->>'minSupportedVersionCode')::int<>33 then raise exception 'floor lost after readback: %',p;end if;end$$;
rollback;
