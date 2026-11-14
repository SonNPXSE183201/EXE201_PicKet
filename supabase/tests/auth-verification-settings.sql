begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('ea000000-0000-4000-8000-000000000001','verify-owner@example.test',now()),
 ('ea000000-0000-4000-8000-000000000002','verify-member@example.test',now()),
 ('ea000000-0000-4000-8000-000000000003','verify-claim@example.test',now());
insert into auth.users(id,phone,phone_confirmed_at) values('ea000000-0000-4000-8000-000000000004','84977777777',now());
insert into public.staff_members(user_id,role) values('ea000000-0000-4000-8000-000000000001','owner');

-- Defaults: email only, readable by anyone.
set local role anon;
do $$declare s jsonb;begin
 s:=public.auth_verification_public();
 if s<>'{"email":true,"sms":false,"smsProvider":"firebase"}'::jsonb then raise exception 'unexpected defaults %',s;end if;
 begin perform public.auth_verification_settings_get(); raise exception 'anon read admin settings'; exception when insufficient_privilege then null; end;
end$$;
reset role;

-- A member without the permission cannot read or change the settings.
select set_config('request.jwt.claim.sub','ea000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
set local role authenticated;
do $$begin
 begin perform public.auth_verification_settings_get(); raise exception 'member read'; exception when insufficient_privilege then null; end;
 begin perform public.auth_verification_settings_save(true,true,100,1,'Enable SMS please'); raise exception 'member write'; exception when insufficient_privilege then null; end;
end$$;
reset role;

-- The owner needs MFA, a reason, at least one channel and the current revision.
select set_config('request.jwt.claim.sub','ea000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"aal":"aal1"}',true);
set local role authenticated;
do $$begin
 begin perform public.auth_verification_settings_save(true,true,100,1,'Enable SMS channel'); raise exception 'saved without MFA'; exception when insufficient_privilege then null; end;
end$$;
reset role;
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
set local role authenticated;
do $$declare v jsonb;begin
 begin perform public.auth_verification_settings_save(false,false,100,1,'Disable everything'); raise exception 'no channel accepted'; exception when invalid_parameter_value then null; end;
 begin perform public.auth_verification_settings_save(true,true,100,1,'no'); raise exception 'short reason accepted'; exception when invalid_parameter_value then null; end;
 begin perform public.auth_verification_settings_save(true,true,-1,1,'Bad limit value'); raise exception 'negative limit'; exception when invalid_parameter_value then null; end;
 v:=public.auth_verification_settings_save(true,true,50,1,'Enable SMS channel');
 if (v->>'smsEnabled')::boolean is not true or (v->>'revision')::int<>2 or (v->>'smsDailyLimit')::int<>50 then raise exception 'save result %',v;end if;
 begin perform public.auth_verification_settings_save(true,false,50,1,'Stale revision'); raise exception 'stale revision'; exception when sqlstate 'PT409' then null; end;
 v:=public.auth_verification_settings_get();
 if jsonb_array_length(v->'history')<>1 or (v->'settings'->>'revision')::int<>2 then raise exception 'history %',v;end if;
end$$;
reset role;

-- Hook: email sign-up blocked only when the email channel is off.
do $$begin
 if public.hook_before_user_created('{"user":{"app_metadata":{"provider":"email"}}}')<>'{}'::jsonb then raise exception 'email blocked while enabled';end if;
 if public.hook_before_user_created('{"user":{"app_metadata":{"provider":"phone"}}}')->'error'->>'http_code'<>'403' then raise exception 'direct phone sign-up allowed';end if;
 if public.hook_before_user_created('{"user":{"app_metadata":{"provider":"phone","signup_via":"firebase_sms"}}}')<>'{}'::jsonb then raise exception 'API phone sign-up blocked';end if;
 update public.auth_verification_settings set email_enabled=false where id;
 if public.hook_before_user_created('{"user":{"app_metadata":{"provider":"email"}}}')->'error'->>'http_code'<>'403' then raise exception 'email allowed while disabled';end if;
 if public.hook_before_user_created('{"user":{"app_metadata":{"provider":"email","signup_via":"firebase_sms"}}}')<>'{}'::jsonb then raise exception 'SMS sign-up blocked';end if;
 if public.hook_before_user_created('{"user":{"app_metadata":{"provider":"google"}}}')<>'{}'::jsonb then raise exception 'google blocked';end if;
 update public.auth_verification_settings set email_enabled=true where id;
end$$;

-- Verified phone claims: unverified holders are released, verified owners win.
insert into public.user_contact_methods(user_id,kind,value) values('ea000000-0000-4000-8000-000000000002','phone','+84912000111');
do $$declare v jsonb;begin
 if public.auth_phone_owner('+84912000111') is not null then raise exception 'unverified owner reported';end if;
 v:=public.contact_claim_verified_phone('ea000000-0000-4000-8000-000000000003','+84912000111','firebase');
 if v->>'verified_via'<>'firebase' then raise exception 'claim %',v;end if;
 if exists(select 1 from public.user_contact_methods where user_id='ea000000-0000-4000-8000-000000000002') then raise exception 'unverified holder kept';end if;
 if public.auth_phone_owner('+84912000111')<>'ea000000-0000-4000-8000-000000000003' then raise exception 'owner not resolved';end if;
 if public.auth_phone_lookup('+84912000111')->>'email'<>'verify-claim@example.test' then raise exception 'claimed phone cannot sign in';end if;
 begin perform public.contact_claim_verified_phone('ea000000-0000-4000-8000-000000000002','+84912000111','firebase'); raise exception 'verified phone stolen'; exception when unique_violation then null; end;
 begin perform public.contact_claim_verified_phone('ea000000-0000-4000-8000-000000000002','+84977777777','firebase'); raise exception 'auth phone stolen'; exception when unique_violation then null; end;
 begin perform public.contact_claim_verified_phone('ea000000-0000-4000-8000-000000000002','+84912000222','legacy_auth'); raise exception 'bad source'; exception when invalid_parameter_value then null; end;
end$$;

-- Daily SMS cap follows the configured limit.
do $$begin
 update public.auth_verification_settings set sms_daily_limit=2 where id;
 if not public.auth_sms_quota_hit() or not public.auth_sms_quota_hit() then raise exception 'early cap';end if;
 if public.auth_sms_quota_hit() then raise exception 'cap not enforced';end if;
end$$;

-- Service-only helpers are not callable by clients.
select set_config('request.jwt.claim.sub','ea000000-0000-4000-8000-000000000003',true);
set local role authenticated;
do $$begin
 begin perform public.contact_claim_verified_phone(auth.uid(),'+84912000333','firebase'); raise exception 'client claimed phone'; exception when insufficient_privilege then null; end;
 begin perform public.auth_sms_quota_hit(); raise exception 'client quota'; exception when insufficient_privilege then null; end;
end$$;
reset role;
-- OTP-created email accounts must set a password before using the app.
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values('ea000000-0000-4000-8000-000000000005','otp-new@example.test',now(),'{"provider":"email"}');
select set_config('request.jwt.claim.sub','ea000000-0000-4000-8000-000000000005',true);
set local role authenticated;
do $$begin
 begin perform picket_private.account_access(); raise exception 'passwordless account allowed'; exception when insufficient_privilege then null; end;
end$$;
reset role;
update auth.users set encrypted_password='$2a$10$hash' where id='ea000000-0000-4000-8000-000000000005';
set local role authenticated;
do $$begin perform picket_private.account_access(); end$$;
reset role;

-- Reservations are single-use and proofs are accepted once.
do $$begin
 if public.auth_phone_signup_consume(repeat('c',64)) then raise exception 'consumed without reservation';end if;
 perform public.auth_phone_signup_reserve(repeat('c',64));
 if not public.auth_phone_signup_consume(repeat('c',64)) then raise exception 'reservation not consumed';end if;
 if public.auth_phone_signup_consume(repeat('c',64)) then raise exception 'reservation reused';end if;
 if not public.auth_firebase_proof_use('uid-1',1000,'+84912000999','signup') then raise exception 'first proof rejected';end if;
 if public.auth_firebase_proof_use('uid-1',1000,'+84912000999','attach') then raise exception 'proof reused';end if;
end$$;
rollback;
