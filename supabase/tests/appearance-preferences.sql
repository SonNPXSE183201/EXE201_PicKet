begin;
insert into auth.users(id,email) values ('11111111-1234-4321-8123-123456789001','appearance-a@example.test'),('11111111-1234-4321-8123-123456789002','appearance-b@example.test');
insert into public.profiles(id) values ('11111111-1234-4321-8123-123456789001'),('11111111-1234-4321-8123-123456789002') on conflict do nothing;
insert into public.user_preferences(user_id) values ('11111111-1234-4321-8123-123456789001'),('11111111-1234-4321-8123-123456789002') on conflict do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1234-4321-8123-123456789001',true);
update public.user_preferences set theme_mode='dark',language_mode='en',color_scheme_id='ocean' where user_id='11111111-1234-4321-8123-123456789001';
do $$ begin
 if (select public.current_profile()->>'themeMode') is distinct from 'dark' then raise exception 'Missing default'; end if;
 if (select count(*) from public.user_preferences) <> 1 then raise exception 'Owner leak'; end if;
end $$;
rollback;
