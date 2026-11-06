begin;
insert into auth.users(id,email) values
 ('22222222-1234-4321-8123-123456789001','appearance-backup-a@example.test'),
 ('22222222-1234-4321-8123-123456789002','appearance-backup-b@example.test');
insert into public.profiles(id) values
 ('22222222-1234-4321-8123-123456789001'),('22222222-1234-4321-8123-123456789002') on conflict do nothing;
insert into public.user_preferences(user_id,theme_mode,language_mode,color_scheme_id) values
 ('22222222-1234-4321-8123-123456789001','dark','en','ocean'),
 ('22222222-1234-4321-8123-123456789002','light','vi','rose')
 on conflict(user_id) do update set theme_mode=excluded.theme_mode,language_mode=excluded.language_mode,color_scheme_id=excluded.color_scheme_id;
set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-1234-4321-8123-123456789001',true);
do $$
declare snapshot jsonb; payload jsonb; revision bigint;
begin
 snapshot:=public.load_normalized_finance();
 payload:=snapshot->'payload';
 if payload#>>'{preferences,themeMode}' is distinct from 'dark' then raise exception 'Backup lost theme'; end if;
 if payload#>>'{preferences,languageMode}' is distinct from 'en' then raise exception 'Backup lost language'; end if;
 if payload#>>'{preferences,colorSchemeId}' is distinct from 'ocean' then raise exception 'Backup lost scheme'; end if;
 update public.user_preferences set theme_mode='light',language_mode='vi',color_scheme_id='rose' where user_id=auth.uid();
 revision:=public.save_normalized_finance((snapshot->>'revision')::bigint,payload);
 if public.current_profile()->>'themeMode' is distinct from 'dark' then raise exception 'Restore lost theme'; end if;
 if public.current_profile()->>'languageMode' is distinct from 'en' then raise exception 'Restore lost language'; end if;
 if public.current_profile()->>'colorSchemeId' is distinct from 'ocean' then raise exception 'Restore lost scheme'; end if;
 -- Old backups omit the new fields and preserve the current choices.
 payload:=jsonb_set(payload,'{preferences}',(payload->'preferences')-'themeMode'-'languageMode'-'colorSchemeId');
 revision:=public.save_normalized_finance(revision,payload);
 if public.current_profile()->>'themeMode' is distinct from 'dark' then raise exception 'Legacy restore erased theme'; end if;
 -- Constraints fail atomically; no partial preference changes survive.
 begin
  perform public.save_normalized_finance(revision,jsonb_set(payload,'{preferences,themeMode}','"neon"'));
  raise exception 'Invalid theme was accepted';
 exception when check_violation then null;
 end;
 if public.current_profile()->>'themeMode' is distinct from 'dark' then raise exception 'Invalid restore mutated preferences'; end if;
 begin
  perform public.save_normalized_finance(revision,jsonb_set(payload,'{preferences,colorSchemeId}','true'));
  raise exception 'Invalid scheme type was accepted';
 exception when invalid_parameter_value then null;
 end;
 revision:=public.save_normalized_finance(revision,jsonb_set(payload,'{preferences,themeMode}','null'));
 if public.current_profile()->>'themeMode' is not null then raise exception 'Explicit null did not clear theme'; end if;
 if public.current_profile()->>'languageMode' is distinct from 'en' then raise exception 'Partial restore erased language'; end if;
 if (select count(*) from public.user_preferences)<>1 then raise exception 'Owner leak'; end if;
end $$;
reset role;
do $$ begin
 if (select theme_mode from public.user_preferences where user_id='22222222-1234-4321-8123-123456789002') is distinct from 'light' then raise exception 'Other owner changed'; end if;
end $$;
rollback;
