begin;
do $$
declare function_name text; role_name text;
begin
 foreach function_name in array array['enforce_maintenance','reject_suspended_snapshot'] loop
  foreach role_name in array array['anon','authenticated'] loop
   if has_function_privilege(role_name,'public.'||function_name||'()','EXECUTE') then
    raise exception 'Internal trigger % is callable by %',function_name,role_name;
   end if;
  end loop;
 end loop;
end $$;
insert into auth.users(id,email) values ('11111111-1234-4321-8123-123456789099','trigger-guard@example.test');
create temporary table guard_probe(user_id uuid);
create trigger probe_maintenance before insert on guard_probe for each row execute function public.enforce_maintenance();
create trigger probe_account before insert on guard_probe for each row execute function public.reject_suspended_snapshot();
grant insert on guard_probe to authenticated;
update public.app_settings set maintenance=true;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1234-4321-8123-123456789099',true);
select set_config('request.jwt.claim.role','authenticated',true);
do $$begin
 begin
  insert into guard_probe values(auth.uid());
  raise exception 'Maintenance trigger did not reject write';
 exception when sqlstate '55000' then null;
 end;
end $$;
reset role;
update public.app_settings set maintenance=false;
set local role authenticated;
insert into guard_probe values(auth.uid());
reset role;
update auth.users set banned_until=now()+interval '1 day' where id='11111111-1234-4321-8123-123456789099';
set local role authenticated;
do $$begin
 begin
  insert into guard_probe values(auth.uid());
  raise exception 'Suspension trigger did not reject write';
 exception when insufficient_privilege then null;
 end;
end $$;
rollback;
