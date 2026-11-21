begin;
insert into auth.users(id,phone,phone_confirmed_at) values('ec000000-0000-4000-8000-000000000001','84977777777',now());
update public.auth_verification_settings set sms_enabled=true, sms_daily_limit=100 where id;

-- Only the service role may call the verified gates; the helper is private.
set local role anon;
do $$begin
 begin perform public.auth_phone_signup_verified_gate('+84922000001','c',repeat('d',64),true,'u',1); raise exception 'anon gate'; exception when insufficient_privilege then null; end;
 begin perform public.auth_phone_reset_verified_gate('+84922000001','c',repeat('d',64),true,'u',1); raise exception 'anon reset gate'; exception when insufficient_privilege then null; end;
end$$;
reset role;
do $$begin
 if not has_function_privilege('service_role','public.auth_phone_signup_verified_gate(text,text,text,boolean,text,bigint)','execute')
   or not has_function_privilege('service_role','public.auth_phone_reset_verified_gate(text,text,text,boolean,text,bigint)','execute') then
   raise exception 'service_role grant missing';
 end if;
 if has_function_privilege('authenticated','picket_private.phone_reservation_with_proof(text,text,text,bigint,text)','execute') then
   raise exception 'private helper exposed';
 end if;
end$$;

do $$declare r jsonb;
begin
 -- A start, then a replayed proof: rejected and the reservation survives for the real one.
 if public.auth_phone_signup_start('+84922000001',repeat('1',32),repeat('2',32),repeat('a',64),'signup')<>'ok' then raise exception 'start';end if;
 insert into picket_private.firebase_phone_proofs(firebase_uid,auth_time,phone,purpose) values('used-uid',100,'+84922000001','signup');
 r:=public.auth_phone_signup_verified_gate('+84922000001',repeat('3',32),repeat('a',64),true,'used-uid',100);
 if r->>'status'<>'proof_used' then raise exception 'replay %',r;end if;
 r:=public.auth_phone_signup_verified_gate('+84922000001',repeat('3',32),repeat('a',64),true,'fresh-uid',200);
 if r->>'status'<>'ok' or r->'pending' is distinct from 'null'::jsonb then raise exception 'fresh %',r;end if;
 if not exists(select 1 from picket_private.firebase_phone_proofs where firebase_uid='fresh-uid' and auth_time=200 and purpose='signup') then raise exception 'proof not burned';end if;
 -- Single use: the reservation is gone, and that does not burn the next proof.
 r:=public.auth_phone_signup_verified_gate('+84922000001',repeat('3',32),repeat('a',64),true,'other-uid',300);
 if r->>'status'<>'no_reservation' then raise exception 'reservation reused %',r;end if;
 if exists(select 1 from picket_private.firebase_phone_proofs where firebase_uid='other-uid') then raise exception 'proof burned without reservation';end if;
 -- Weak password consumes nothing.
 perform public.auth_phone_signup_reserve(repeat('b',64));
 if public.auth_phone_signup_verified_gate('+84922000002','x',repeat('b',64),false,'weak-uid',1)->>'status'<>'weak_password' then raise exception 'weak';end if;
 if public.auth_phone_signup_verified_gate('+84922000002','x',repeat('b',64),true,'weak-uid',1)->>'status'<>'ok' then raise exception 'weak consumed';end if;

 -- A pending half-created account does not block start; the gate returns it for deletion.
 insert into auth.users(id,phone,phone_confirmed_at,raw_app_meta_data) values('ec000000-0000-4000-8000-000000000002','84922000003',now(),'{"signup_via":"firebase_sms"}');
 if public.auth_phone_signup_start('+84922000003',repeat('4',32),repeat('5',32),repeat('c',64),'signup')<>'ok' then raise exception 'pending blocks start';end if;
 r:=public.auth_phone_signup_verified_gate('+84922000003','y',repeat('c',64),true,'pending-uid',1);
 if r->>'status'<>'ok' or r->>'pending'<>'ec000000-0000-4000-8000-000000000002' then raise exception 'pending %',r;end if;
 -- A real owner (signed in, or not a fresh firebase_sms account) still blocks start.
 if public.auth_phone_signup_start('+84977777777',repeat('6',32),repeat('5',32),repeat('d',64),'signup')<>'phone_taken' then raise exception 'owner start';end if;
 update auth.users set last_sign_in_at=now() where id='ec000000-0000-4000-8000-000000000002';
 if public.auth_phone_signup_start('+84922000003',repeat('7',32),repeat('5',32),repeat('c',64),'signup')<>'phone_taken' then raise exception 'signed-in owner start';end if;
 perform public.auth_phone_signup_reserve(repeat('e',64));
 if public.auth_phone_signup_verified_gate('+84977777777','y',repeat('e',64),true,'owner-uid',1)->>'status'<>'phone_taken' then raise exception 'gate owner';end if;

 -- reset: replay keeps the reservation; success returns the account; unknown phone is no_account.
 perform public.auth_phone_signup_reserve(repeat('f',64));
 if public.auth_phone_reset_verified_gate('+84977777777','z',repeat('f',64),true,'used-uid',100)->>'status'<>'proof_used' then raise exception 'reset replay';end if;
 if public.auth_phone_reset_verified_gate('+84977777777','z',repeat('f',64),false,'r-uid',1)->>'status'<>'weak_password' then raise exception 'reset weak';end if;
 r:=public.auth_phone_reset_verified_gate('+84977777777','z',repeat('f',64),true,'r-uid',1);
 if r->>'status'<>'ok' or r->>'target'<>'ec000000-0000-4000-8000-000000000001' then raise exception 'reset ok %',r;end if;
 if public.auth_phone_reset_verified_gate('+84977777777','z',repeat('f',64),true,'r-uid',2)->>'status'<>'no_reservation' then raise exception 'reset reuse';end if;
 perform public.auth_phone_signup_reserve(repeat('9',64));
 if public.auth_phone_reset_verified_gate('+84922000099','z',repeat('9',64),true,'n-uid',1)->>'status'<>'no_account' then raise exception 'reset no account';end if;
end$$;
rollback;
