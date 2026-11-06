begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('e9000000-0000-4000-8000-000000000001','phone-a@example.test',now()),
 ('e9000000-0000-4000-8000-000000000002','phone-b@example.test',now());
insert into auth.users(id,phone,phone_confirmed_at) values('e9000000-0000-4000-8000-000000000003','84987654321',now());
insert into auth.users(id,email,email_confirmed_at,banned_until) values('e9000000-0000-4000-8000-000000000004','banned@example.test',now(),now()+interval '1 day');

select set_config('request.jwt.claim.sub','e9000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$declare v jsonb;begin
 begin perform public.contact_set_phone('+8412'); raise exception 'bad phone accepted'; exception when invalid_parameter_value then null; end;
 v:=public.contact_set_phone('+84912345678');
 if v->>'verified_via'<>'none' then raise exception 'phone verified without SMS';end if;
 -- A legacy phone-auth account keeps its number.
 begin perform public.contact_set_phone('+84987654321'); raise exception 'legacy phone stolen'; exception when unique_violation then null; end;
 if (select count(*) from public.user_contact_methods)<>1 then raise exception 'owner cannot read own phone';end if;
 begin perform public.auth_phone_lookup('+84912345678'); raise exception 'client phone lookup'; exception when insufficient_privilege then null; end;
end$$;
reset role;
select set_config('request.jwt.claim.sub','e9000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$begin
 begin perform public.contact_set_phone('+84912345678'); raise exception 'duplicate phone'; exception when unique_violation then null; end;
 if exists(select 1 from public.user_contact_methods) then raise exception 'foreign phone visible';end if;
end$$;
reset role;

do $$declare l jsonb; c jsonb; v jsonb;begin
 l:=public.auth_phone_lookup('+84912345678');
 if l->>'email'<>'phone-a@example.test' then raise exception 'attached phone not resolved: %',l;end if;
 l:=public.auth_phone_lookup('+84987654321');
 if l->>'authPhone'<>'84987654321' or l->>'email' is not null then raise exception 'legacy phone not resolved: %',l;end if;
 if public.auth_phone_lookup('+84900000000')<>'{}'::jsonb then raise exception 'unknown phone resolved';end if;
 -- Rate limit: 3 per window.
 for i in 1..3 loop if not public.auth_rate_hit('login:phone:abcdefgh',3,900) then raise exception 'early limit';end if; end loop;
 if public.auth_rate_hit('login:phone:abcdefgh',3,900) then raise exception 'limit not enforced';end if;
 -- OTP: cooldown, wrong code, single use.
 c:=public.otp_create('sms',repeat('a',64),'e9000000-0000-4000-8000-000000000001','verify_phone',repeat('1',64),300);
 begin perform public.otp_create('sms',repeat('a',64),'e9000000-0000-4000-8000-000000000001','verify_phone',repeat('2',64),300); raise exception 'cooldown ignored'; exception when sqlstate 'P0429' then null; end;
 v:=public.otp_verify((c->>'id')::uuid,repeat('9',64),'e9000000-0000-4000-8000-000000000001');
 if (v->>'ok')::boolean then raise exception 'wrong code accepted';end if;
 if (public.otp_verify((c->>'id')::uuid,repeat('1',64),'e9000000-0000-4000-8000-000000000002')->>'ok')::boolean then raise exception 'other user used challenge';end if;
 v:=public.otp_verify((c->>'id')::uuid,repeat('1',64),'e9000000-0000-4000-8000-000000000001');
 if not (v->>'ok')::boolean then raise exception 'right code rejected: %',v;end if;
 if (public.otp_verify((c->>'id')::uuid,repeat('1',64),'e9000000-0000-4000-8000-000000000001')->>'ok')::boolean then raise exception 'challenge reused';end if;
 if (public.contact_mark_phone_verified('e9000000-0000-4000-8000-000000000001','+84912345678')->>'verified_via')<>'sms' then raise exception 'not marked verified';end if;
end$$;
-- Banned accounts cannot be resolved.
do $$begin
 insert into public.user_contact_methods(user_id,kind,value) values('e9000000-0000-4000-8000-000000000004','phone','+84311111111');
 if public.auth_phone_lookup('+84311111111')<>'{}'::jsonb then raise exception 'banned account resolved';end if;
end$$;
rollback;
