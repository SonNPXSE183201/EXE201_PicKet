begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('ea000000-0000-4000-8000-000000000001','release-owner@example.test',now()),
 ('ea000000-0000-4000-8000-000000000002','release-member@example.test',now());
insert into public.staff_members(user_id,role) values('ea000000-0000-4000-8000-000000000001','owner');

-- Seeded state matches the verified readback.
do $$begin
 if (select version_code from public.app_releases where channel='play_alpha' and status='live')<>28 then raise exception 'alpha seed wrong';end if;
 if (public.release_landing_manifest()->>'versionCode')::int<>28 or public.release_landing_manifest()->>'sha256' !~ '^1713c3df' then raise exception 'landing manifest wrong';end if;
end$$;

select set_config('request.jwt.claim.sub','ea000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
set local role authenticated;
do $$declare r jsonb; alpha jsonb;begin
 -- Play tracks are read-only for admins (closed testing must never be changed here).
 begin perform public.release_save('{"channel":"play_alpha","versionName":"1.0.15","versionCode":30,"status":"live"}','Try to push alpha'); raise exception 'admin wrote play track'; exception when invalid_parameter_value then null; end;
 select x into alpha from jsonb_array_elements(public.release_list()->'releases') x where x->>'channel'='play_alpha';
 begin perform public.release_save(jsonb_build_object('id',alpha->>'id','revision',1,'versionName','1.0.14','versionCode',28,'status','halted'),'Halt alpha'); raise exception 'alpha status changed'; exception when invalid_parameter_value then null; end;
 -- A live landing build needs checksum metadata.
 begin perform public.release_save('{"channel":"landing","versionName":"1.0.15","versionCode":30,"status":"live"}','Unverified landing'); raise exception 'unverifiable landing went live'; exception when check_violation then null; end;
 r:=public.release_save('{"channel":"landing","versionName":"1.0.15","versionCode":30,"status":"live","sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","bytes":120,"filename":"picket-1.0.15-30.apk","abi":"arm64-v8a","minSdk":24,"minSupportedCode":28}','Publish landing 1.0.15');
 if (select count(*) from jsonb_array_elements(public.release_list()->'releases') x where x->>'channel'='landing' and x->>'status'='live')<>1 then raise exception 'two live landing builds';end if;
 if (public.release_list()->'live'->'landing'->>'versionCode')::int<>30 then raise exception 'live landing not updated';end if;
end$$;
reset role;
do $$declare m jsonb;begin
 m:=public.release_landing_manifest();
 if (m->>'versionCode')::int<>30 or (m->>'minSupportedVersionCode')::int<>28 or m->>'filename'<>'picket-1.0.15-30.apk' then raise exception 'manifest not generated from registry: %',m;end if;
 -- Play readback mirrors Google, landing probe flags a mismatch instead of trusting it.
 m:=public.release_readback('[{"channel":"play_internal","versionCode":31,"status":"completed","name":"1.0.16"}]','play_api');
 if (m->>'updated')::int<>1 or (select status from public.app_releases where channel='play_internal' and version_code=28)<>'superseded' then raise exception 'play readback not applied';end if;
 m:=public.release_readback('[{"versionCode":30,"sha256":"bbbb","bytes":120}]','landing_probe');
 if jsonb_array_length(m->'mismatches')<>1 then raise exception 'landing mismatch not reported';end if;
end$$;
-- Drift warning: Play internal 31 is newer than landing 30.
select set_config('request.jwt.claim.sub','ea000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$begin if jsonb_array_length(public.release_list()->'warnings')<1 then raise exception 'drift warning missing';end if;end$$;
reset role;
select set_config('request.jwt.claim.sub','ea000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$begin
 begin perform public.release_list(); raise exception 'member release leak'; exception when insufficient_privilege then null; end;
 if public.release_landing_manifest() is null then raise exception 'public manifest unavailable';end if;
end$$;
reset role;
rollback;
