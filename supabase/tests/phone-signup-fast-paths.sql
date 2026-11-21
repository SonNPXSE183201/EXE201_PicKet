begin;
insert into auth.users(id,phone,phone_confirmed_at) values('eb000000-0000-4000-8000-000000000001','84966666666',now());
update public.auth_verification_settings set sms_enabled=true, sms_daily_limit=2 where id;

-- Only the service role may call the fast paths.
set local role anon;
do $$begin
 begin perform public.auth_phone_signup_start('+84911000001',repeat('a',32),repeat('b',32),repeat('d',64),'signup'); raise exception 'anon start'; exception when insufficient_privilege then null; end;
 begin perform public.auth_phone_signup_complete_gate('+84911000001','c',repeat('d',64),true); raise exception 'anon gate'; exception when insufficient_privilege then null; end;
 begin perform public.auth_phone_reset_gate('c',repeat('d',64),true); raise exception 'anon reset gate'; exception when insufficient_privilege then null; end;
end$$;
reset role;
do $$begin
 if not has_function_privilege('service_role','public.auth_phone_signup_start(text,text,text,text,text)','execute') or not has_function_privilege('service_role','public.auth_phone_signup_complete_gate(text,text,text,boolean)','execute') or not has_function_privilege('service_role','public.auth_phone_reset_gate(text,text,boolean)','execute') then raise exception 'service_role grant missing';end if;
end$$;

do $$declare r jsonb;
begin
 -- start: taken phone is rejected before the daily quota is spent.
 if public.auth_phone_signup_start('+84966666666',repeat('1',32),repeat('2',32),repeat('e',64),'signup')<>'phone_taken' then raise exception 'taken phone';end if;
 -- reset does not reveal ownership.
 if public.auth_phone_signup_start('+84966666666',repeat('3',32),repeat('2',32),repeat('e',64),'reset')<>'ok' then raise exception 'reset start';end if;
 -- ok path reserves the number: complete can consume it exactly once.
 if public.auth_phone_signup_start('+84911000001',repeat('4',32),repeat('5',32),repeat('f',64),'signup')<>'ok' then raise exception 'start ok';end if;
 r:=public.auth_phone_signup_complete_gate('+84911000001',repeat('5',32),repeat('f',64),false);
 if r->>'status'<>'weak_password' then raise exception 'weak %',r;end if;
 r:=public.auth_phone_signup_complete_gate('+84911000001',repeat('5',32),repeat('f',64),true);
 if r->>'status'<>'ok' or r->'pending' is distinct from 'null'::jsonb then raise exception 'gate ok %',r;end if;
 r:=public.auth_phone_signup_complete_gate('+84911000001',repeat('5',32),repeat('f',64),true);
 if r->>'status'<>'no_reservation' then raise exception 'reservation reused %',r;end if;
 -- daily quota (cap 2): reset and signup starts above used both.
 if public.auth_phone_signup_start('+84911000002',repeat('6',32),repeat('7',32),repeat('9',64),'signup')<>'quota_reached' then raise exception 'quota';end if;
 -- per-phone limit 3/h.
 update public.auth_verification_settings set sms_daily_limit=100 where id;
 perform public.auth_phone_signup_start('+84911000003',repeat('8',32),repeat('7',32),repeat('9',64),'signup');
 perform public.auth_phone_signup_start('+84911000003',repeat('8',32),repeat('7',32),repeat('9',64),'signup');
 perform public.auth_phone_signup_start('+84911000003',repeat('8',32),repeat('7',32),repeat('9',64),'signup');
 if public.auth_phone_signup_start('+84911000003',repeat('8',32),repeat('7',32),repeat('9',64),'signup')<>'rate_limited' then raise exception 'phone rate';end if;
 -- SMS off blocks signup start and the gate.
 update public.auth_verification_settings set sms_enabled=false where id;
 if public.auth_phone_signup_start('+84911000004',repeat('a',32),repeat('b',32),repeat('c',64),'signup')<>'sms_disabled' then raise exception 'sms off';end if;
 if public.auth_phone_signup_complete_gate('+84911000004','x',repeat('c',64),true)->>'status'<>'sms_disabled' then raise exception 'gate sms off';end if;
 -- A pending half-created account is returned, not counted as an owner.
 update public.auth_verification_settings set sms_enabled=true where id;
 insert into auth.users(id,phone,phone_confirmed_at,raw_app_meta_data) values('eb000000-0000-4000-8000-000000000002','84911000005',now(),'{"signup_via":"firebase_sms"}');
 perform public.auth_phone_signup_reserve(repeat('0',64));
 r:=public.auth_phone_signup_complete_gate('+84911000005','y',repeat('0',64),true);
 if r->>'status'<>'ok' or r->>'pending'<>'eb000000-0000-4000-8000-000000000002' then raise exception 'pending %',r;end if;
 -- A confirmed owner that is not pending blocks the gate.
 perform public.auth_phone_signup_reserve(repeat('0',64));
 if public.auth_phone_signup_complete_gate('+84966666666','y',repeat('0',64),true)->>'status'<>'phone_taken' then raise exception 'gate owner';end if;
 -- reset gate.
 perform public.auth_phone_signup_reserve(repeat('1',64));
 if public.auth_phone_reset_gate('z',repeat('1',64),false)<>'weak_password' then raise exception 'reset weak';end if;
 if public.auth_phone_reset_gate('z',repeat('1',64),true)<>'ok' then raise exception 'reset ok';end if;
 if public.auth_phone_reset_gate('z',repeat('1',64),true)<>'no_reservation' then raise exception 'reset reuse';end if;
end$$;
rollback;
