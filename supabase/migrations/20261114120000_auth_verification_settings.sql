-- Sign-up verification channels chosen by admins: email OTP (Supabase Auth) and/or
-- SMS OTP (Firebase Phone Auth, verified by the Dart API). Email stays the default.
-- Both channels deliver a 6-digit code; after the first verification the client asks
-- the user to create a password (tracked in user_metadata.password_setup_required).

create table public.auth_verification_settings(
  id boolean primary key default true check (id),
  email_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  sms_provider text not null default 'firebase' check (sms_provider in ('firebase')),
  sms_daily_limit integer not null default 100 check (sms_daily_limit between 0 and 100000),
  revision integer not null default 1,
  updated_by uuid references auth.users on delete set null,
  updated_at timestamptz not null default now(),
  check (email_enabled or sms_enabled)
);
insert into public.auth_verification_settings default values;
create table public.auth_verification_settings_audit(
  id bigint generated always as identity primary key,
  actor uuid references auth.users on delete set null,
  before_value jsonb not null,
  after_value jsonb not null,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.auth_verification_settings enable row level security;
alter table public.auth_verification_settings_audit enable row level security;
revoke all on public.auth_verification_settings, public.auth_verification_settings_audit from anon, authenticated;

insert into public.permission_catalog values('auth.verification.manage','Cấu hình kênh xác thực đăng ký') on conflict do nothing;

-- Public, non-sensitive view used by sign-up screens (through the API) and the hook.
create function public.auth_verification_public() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((select jsonb_build_object('email', email_enabled, 'sms', sms_enabled, 'smsProvider', sms_provider)
    from public.auth_verification_settings where id), '{"email":true,"sms":false,"smsProvider":"firebase"}'::jsonb)
$$;
revoke all on function public.auth_verification_public() from public;
grant execute on function public.auth_verification_public() to anon, authenticated, service_role;

create function public.auth_verification_settings_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not picket_private.has_permission('auth.verification.manage') then
    raise exception 'Administrative permission required' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'settings', (select jsonb_build_object('emailEnabled', email_enabled, 'smsEnabled', sms_enabled, 'smsProvider', sms_provider,
        'smsDailyLimit', sms_daily_limit, 'revision', revision, 'updatedAt', updated_at)
      from public.auth_verification_settings where id),
    'history', coalesce((select jsonb_agg(h) from (
      select before_value as "before", after_value as "after", reason, created_at as "createdAt"
      from public.auth_verification_settings_audit order by id desc limit 20) h), '[]'::jsonb));
end$$;

create function public.auth_verification_settings_save(p_email boolean, p_sms boolean, p_sms_daily_limit integer, p_revision integer, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare prev public.auth_verification_settings; v public.auth_verification_settings;
begin
  perform picket_private.permission_require('auth.verification.manage', true);
  if p_reason is null or length(trim(p_reason)) not between 5 and 500 then
    raise exception 'Reason required' using errcode = '22023';
  end if;
  if p_email is null or p_sms is null or not (p_email or p_sms) then
    raise exception 'At least one channel required' using errcode = '22023';
  end if;
  if p_sms_daily_limit is null or p_sms_daily_limit not between 0 and 100000 then
    raise exception 'Invalid limit' using errcode = '22023';
  end if;
  select * into prev from public.auth_verification_settings where id for update;
  if prev.revision <> p_revision then raise exception 'Settings changed by someone else' using errcode = 'PT409'; end if;
  update public.auth_verification_settings
    set email_enabled = p_email, sms_enabled = p_sms, sms_daily_limit = p_sms_daily_limit,
        revision = revision + 1, updated_by = auth.uid(), updated_at = now()
    where id returning * into v;
  insert into public.auth_verification_settings_audit(actor, before_value, after_value, reason)
    values (auth.uid(),
      jsonb_build_object('emailEnabled', prev.email_enabled, 'smsEnabled', prev.sms_enabled, 'smsDailyLimit', prev.sms_daily_limit),
      jsonb_build_object('emailEnabled', v.email_enabled, 'smsEnabled', v.sms_enabled, 'smsDailyLimit', v.sms_daily_limit),
      trim(p_reason));
  return jsonb_build_object('emailEnabled', v.email_enabled, 'smsEnabled', v.sms_enabled, 'smsProvider', v.sms_provider,
    'smsDailyLimit', v.sms_daily_limit, 'revision', v.revision, 'updatedAt', v.updated_at);
end$$;
revoke all on function public.auth_verification_settings_get(), public.auth_verification_settings_save(boolean, boolean, integer, integer, text) from public, anon;
grant execute on function public.auth_verification_settings_get(), public.auth_verification_settings_save(boolean, boolean, integer, integer, text) to authenticated;

-- Phone ownership proven by Firebase is a new verification source.
alter table public.user_contact_methods drop constraint user_contact_methods_verified_via_check;
alter table public.user_contact_methods add constraint user_contact_methods_verified_via_check
  check (verified_via in ('none','sms','legacy_auth','firebase'));

-- Security fix: password sign-in by phone only resolves phones whose ownership was verified.
create or replace function public.auth_phone_lookup(p_phone text) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((select jsonb_build_object('userId',u.id,'email',case when u.email_confirmed_at is not null then u.email end,'authPhone',case when u.phone_confirmed_at is not null then u.phone end)
  from auth.users u
  where (u.id=(select user_id from public.user_contact_methods where kind='phone' and value=p_phone and verified_via<>'none')
     or (u.phone=ltrim(p_phone,'+') and u.phone_confirmed_at is not null))
   and(u.banned_until is null or u.banned_until<=now())
  limit 1),'{}'::jsonb)
$$;

-- Service: an account proved ownership of p_phone (SMS or Firebase). Unverified
-- claims on the same number by other accounts are released; a verified owner wins.
create function public.contact_claim_verified_phone(p_user uuid, p_phone text, p_via text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.user_contact_methods;
begin
  if p_via not in ('sms','firebase') then raise exception 'Invalid source' using errcode = '22023'; end if;
  if p_phone is null or p_phone !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'Invalid phone' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_phone, 0));
  if exists(select 1 from public.user_contact_methods where kind='phone' and value=p_phone and user_id<>p_user and verified_via<>'none')
    or exists(select 1 from auth.users where phone=ltrim(p_phone,'+') and phone_confirmed_at is not null and id<>p_user) then
    raise exception 'Phone already used' using errcode = '23505';
  end if;
  delete from public.user_contact_methods where kind='phone' and value=p_phone and user_id<>p_user and verified_via='none';
  insert into public.user_contact_methods as c(user_id, kind, value, verified_via, verified_at)
    values (p_user, 'phone', p_phone, p_via, now())
    on conflict (user_id, kind) do update set value = excluded.value, verified_via = excluded.verified_via,
      verified_at = excluded.verified_at, updated_at = now()
    returning * into v;
  return to_jsonb(v);
end$$;

-- Service: is this phone already owned (verified) by some account? Used before creating
-- an account from an SMS sign-up so a number cannot be registered twice.
create function public.auth_phone_owner(p_phone text) returns uuid
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select user_id from public.user_contact_methods where kind='phone' and value=p_phone and verified_via<>'none'),
    (select id from auth.users where phone=ltrim(p_phone,'+') and phone_confirmed_at is not null limit 1))
$$;

-- Service: count SMS sign-up attempts today (global daily cap, configured above).
create function public.auth_sms_quota_hit() returns boolean
language plpgsql security definer set search_path = '' as $$
declare cap integer;
begin
  select sms_daily_limit into cap from public.auth_verification_settings where id;
  return public.auth_rate_hit('sms-daily:' || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD'), coalesce(cap, 0), 86400);
end$$;

revoke all on function public.contact_claim_verified_phone(uuid, text, text), public.auth_phone_owner(text), public.auth_sms_quota_hit() from public, anon, authenticated;
grant execute on function public.contact_claim_verified_phone(uuid, text, text), public.auth_phone_owner(text), public.auth_sms_quota_hit() to service_role;

-- Auth Hook ("before user created"). Phone accounts are accepted only when created
-- by the API after a verified Firebase SMS (app_metadata.signup_via); when email
-- sign-up is switched off, direct email sign-ups are rejected too. Social sign-ins
-- are always accepted. Enable it in Supabase Auth Hooks together with the Phone provider.
create function public.hook_before_user_created(event jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s jsonb := public.auth_verification_public();
  provider text := coalesce(event->'user'->'app_metadata'->>'provider', 'email');
  via text := event->'user'->'app_metadata'->>'signup_via';
begin
  -- Phone accounts only come from the API after a verified Firebase SMS.
  if provider = 'phone' and via is distinct from 'firebase_sms' then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Phone sign-up is only available in the app'));
  end if;
  if provider = 'email' and not coalesce((s->>'email')::boolean, true) and via is distinct from 'firebase_sms' then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Email sign-up is disabled'));
  end if;
  return '{}'::jsonb;
end$$;
revoke all on function public.hook_before_user_created(jsonb) from public, anon, authenticated;
do $$begin
  if exists(select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant usage on schema public to supabase_auth_admin;
    grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
  end if;
end$$;

-- Accounts created by email OTP must set a password before using the app. The
-- client gate reads user_metadata; this is the server check (metadata is
-- user-editable, the stored password is not).
create or replace function picket_private.account_access() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r text; p jsonb;begin
 if auth.uid() is null or not public.is_account_active() then raise exception 'Active account required' using errcode='42501';end if;
 if not exists(select 1 from auth.users u where u.id=auth.uid() and(u.email_confirmed_at is not null or u.phone_confirmed_at is not null)) then raise exception 'Verified account required' using errcode='42501';end if;
 if exists(select 1 from auth.users u where u.id=auth.uid() and u.raw_app_meta_data->>'provider' in ('email','phone') and coalesce(u.encrypted_password,'')='') then raise exception 'Password setup required' using errcode='42501';end if;
 select role into r from public.staff_members where user_id=auth.uid();
 select coalesce(jsonb_agg(code order by code),'[]') into p from public.permission_catalog where picket_private.has_permission(code);
 return jsonb_build_object('staff',jsonb_array_length(p)>0,'role',r,'permissions',p,'mobileAllowed',true,'mfaVerified',coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'aal','aal1')='aal2');
end$$;

-- SMS sign-up: `start` reserves the number for 15 minutes; `complete` must
-- consume that reservation, so PicKet's own limits cannot be skipped.
create table picket_private.phone_signup_reservations(
  destination_hash text primary key check (destination_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  consumed_at timestamptz
);
-- Each Firebase phone proof (uid + auth_time) is accepted once.
create table picket_private.firebase_phone_proofs(
  firebase_uid text not null check (length(firebase_uid) between 1 and 128),
  auth_time bigint not null,
  phone text not null,
  purpose text not null check (purpose in ('signup','attach','recovery')),
  used_at timestamptz not null default now(),
  primary key (firebase_uid, auth_time)
);
revoke all on picket_private.phone_signup_reservations, picket_private.firebase_phone_proofs from public, anon, authenticated;

create function public.auth_phone_signup_reserve(p_destination_hash text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if p_destination_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid destination' using errcode = '22023'; end if;
  insert into picket_private.phone_signup_reservations as r(destination_hash, expires_at)
    values (p_destination_hash, now() + interval '15 minutes')
    on conflict (destination_hash) do update set expires_at = excluded.expires_at, consumed_at = null;
  delete from picket_private.phone_signup_reservations where expires_at < now() - interval '1 day';
  return true;
end$$;

create function public.auth_phone_signup_consume(p_destination_hash text) returns boolean
language sql security definer set search_path = '' as $$
  with used as (
    update picket_private.phone_signup_reservations set consumed_at = now()
    where destination_hash = p_destination_hash and consumed_at is null and expires_at > now()
    returning 1)
  select exists(select 1 from used)
$$;

create function public.auth_firebase_proof_use(p_uid text, p_auth_time bigint, p_phone text, p_purpose text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  insert into picket_private.firebase_phone_proofs(firebase_uid, auth_time, phone, purpose)
    values (p_uid, p_auth_time, p_phone, p_purpose);
  delete from picket_private.firebase_phone_proofs where used_at < now() - interval '2 days';
  return true;
exception when unique_violation then
  return false;
end$$;

-- Service: an SMS sign-up account that was created but never completed (e.g. the
-- API timed out after Supabase created it). Used only to clean up that account.
create function public.auth_pending_phone_signup(p_phone text) returns uuid
language sql stable security definer set search_path = '' as $$
  select id from auth.users
  where phone = ltrim(p_phone, '+') and raw_app_meta_data->>'signup_via' = 'firebase_sms'
    and last_sign_in_at is null and created_at > now() - interval '10 minutes'
  limit 1
$$;

-- Service: account that owns a verified phone, for password recovery by SMS.
create function public.auth_phone_recovery_target(p_phone text) returns uuid
language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u
  where u.id = public.auth_phone_owner(p_phone) and (u.banned_until is null or u.banned_until <= now())
$$;

revoke all on function public.auth_phone_signup_reserve(text), public.auth_phone_signup_consume(text),
  public.auth_firebase_proof_use(text, bigint, text, text), public.auth_pending_phone_signup(text),
  public.auth_phone_recovery_target(text) from public, anon, authenticated;
grant execute on function public.auth_phone_signup_reserve(text), public.auth_phone_signup_consume(text),
  public.auth_firebase_proof_use(text, bigint, text, text), public.auth_pending_phone_signup(text),
  public.auth_phone_recovery_target(text) to service_role;
