begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('eb000000-0000-4000-8000-000000000001','notice-owner@example.test',now()),
 ('eb000000-0000-4000-8000-000000000002','notice-member@example.test',now());
insert into public.staff_members(user_id,role) values('eb000000-0000-4000-8000-000000000001','owner');

select set_config('request.jwt.claim.sub','eb000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
set local role authenticated;
do $$declare a jsonb;begin
 begin perform public.announcement_save('{"kind":"maintenance","titleVi":"Bảo trì","blocking":true,"dismissible":true}','Invalid blocking'); raise exception 'dismissible blocking accepted'; exception when check_violation then null; end;
 begin perform public.announcement_save('{"kind":"info","titleVi":"Lừa đảo","ctaUrl":"https://evil.example/x"}','External link'); raise exception 'external CTA accepted'; exception when check_violation then null; end;
 perform public.announcement_save('{"kind":"promotion","severity":"info","titleVi":"Ưu đãi sáng lập","titleEn":"Founder offer","bodyVi":"Giảm 40%","channels":["apk","web"],"tiers":["free"],"status":"published","ctaRoute":"/billing"}','Publish promo');
 perform public.announcement_save('{"kind":"incident","severity":"warning","titleVi":"Đồng bộ chậm","status":"published","maxVersionCode":28}','Publish incident');
 perform public.announcement_save('{"kind":"info","titleVi":"Bản nháp","status":"draft"}','Draft only');
 a:=public.announcement_save(jsonb_build_object('kind','maintenance','severity','critical','titleVi','Bảo trì hệ thống','blocking',true,'status','published','startsAt',(now()+interval '1 hour')::text),'Scheduled maintenance');
 if (a->>'dismissible')::boolean then raise exception 'blocking defaulted to dismissible';end if;
 begin perform public.announcement_save(jsonb_build_object('id',a->>'id','revision',9,'kind','maintenance','titleVi','Bảo trì','blocking',true),'Stale edit'); raise exception 'stale revision accepted'; exception when sqlstate 'PT409' then null; end;
 a:=public.announcement_save(jsonb_build_object('id',a->>'id','revision',1,'kind','maintenance','severity','critical','titleVi','Bảo trì hệ thống','blocking',true,'status','published','startsAt',(now()-interval '1 minute')::text),'Start maintenance now');
 if (a->>'revision')::int<>2 then raise exception 'revision not bumped';end if;
 if jsonb_array_length(public.announcement_list()->'announcements')<>4 then raise exception 'admin list wrong';end if;
end$$;
reset role;

-- Guest on the Play build: no APK/web promotion, no draft; maintenance first.
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$declare f jsonb;begin
 f:=public.announcements_feed('play',30,'vi');
 if jsonb_array_length(f->'items')<>1 or f->'items'->0->>'kind'<>'maintenance' then raise exception 'guest play feed wrong: %',f;end if;
 if (f->'items'->0->>'blocking')::boolean is not true then raise exception 'blocking lost';end if;
 if f->'maintenance'->>'active' is null then raise exception 'maintenance flag missing';end if;
 -- Old app versions see the incident targeted at them.
 if jsonb_array_length(public.announcements_feed('play',28,'vi')->'items')<>2 then raise exception 'version targeting wrong';end if;
 begin perform public.announcements_feed('ios',1,'vi'); raise exception 'unknown channel accepted'; exception when invalid_parameter_value then null; end;
 begin perform public.announcement_list(); raise exception 'anon admin list'; exception when insufficient_privilege then null; end;
end$$;
reset role;

-- Free member on the APK build sees the promotion, in English when asked.
select set_config('request.jwt.claim.sub','eb000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$declare f jsonb;begin
 f:=public.announcements_feed('apk',30,'en');
 if not exists(select 1 from jsonb_array_elements(f->'items') x where x->>'title'='Founder offer' and x->>'cta_route'='/billing') then raise exception 'member promo missing: %',f;end if;
 if exists(select 1 from jsonb_array_elements(f->'items') x where x->>'title'='Bản nháp') then raise exception 'draft leaked';end if;
 begin perform public.announcement_save('{"kind":"info","titleVi":"Hack"}','Member attempt'); raise exception 'member saved notice'; exception when insufficient_privilege then null; end;
end$$;
reset role;
rollback;
