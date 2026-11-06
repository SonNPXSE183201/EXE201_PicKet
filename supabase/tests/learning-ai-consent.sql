begin;
do $$ begin
 if to_regprocedure('public.set_learning_ai_consent(boolean)') is null then raise exception 'Missing explicit AI consent'; end if;
 if has_function_privilege('anon','public.set_learning_ai_consent(boolean)','EXECUTE') then raise exception 'Anonymous consent grant'; end if;
 if has_table_privilege('authenticated','public.learning_ai_consents','UPDATE') then raise exception 'Direct consent update bypass'; end if;
end $$;
insert into auth.users(id,email) values
 ('55555555-1234-4321-8123-123456789001','ai-consent-a@example.test'),
 ('55555555-1234-4321-8123-123456789002','ai-consent-b@example.test');
set local role authenticated;
select set_config('request.jwt.claim.sub','55555555-1234-4321-8123-123456789001',true);
do $$ declare v jsonb; begin
 v:=public.load_learning_ai_consent();
 if (v->>'accepted')::boolean or (v->>'generation')::bigint<>0 then raise exception 'Consent must default off'; end if;
 v:=public.set_learning_ai_consent(true);
 if not (v->>'accepted')::boolean or (v->>'generation')::bigint<>1 then raise exception 'Accept failed'; end if;
 v:=public.set_learning_ai_consent(true);
 if (v->>'generation')::bigint<>1 then raise exception 'Repeated acceptance changed generation'; end if;
 v:=public.set_learning_ai_consent(false);
 if (v->>'accepted')::boolean or (v->>'generation')::bigint<>2 then raise exception 'Revoke failed'; end if;
 v:=public.set_learning_ai_consent(true);
 if (v->>'generation')::bigint<>3 then raise exception 'Reaccept resurrects old generation'; end if;
 begin perform public.set_learning_ai_consent(null); raise exception 'Null accepted'; exception when invalid_parameter_value then null; end;
end $$;
select set_config('request.jwt.claim.sub','55555555-1234-4321-8123-123456789002',true);
do $$ begin
 if (select count(*) from public.learning_ai_consents)<>0 then raise exception 'Consent owner leak'; end if;
 if (public.load_learning_ai_consent()->>'accepted')::boolean then raise exception 'Owner default leak'; end if;
end $$;
reset role;
update auth.users set banned_until=now()+interval '1 day' where id='55555555-1234-4321-8123-123456789002';
set local role authenticated;
do $$ begin
 begin perform public.set_learning_ai_consent(true); raise exception 'Banned account consent accepted'; exception when insufficient_privilege then null; end;
end $$;
rollback;
