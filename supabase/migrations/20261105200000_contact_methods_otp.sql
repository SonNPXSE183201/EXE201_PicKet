-- Phone + email accounts with pluggable OTP channels.
-- Today email OTP is delivered by Supabase Auth (Gmail SMTP). A phone number
-- can be attached to an email-verified account and used to sign in with the
-- account password; it is marked unverified until an SMS provider confirms
-- ownership. The SMS path (challenges, rate limits) is ready here so adding a
-- provider is configuration, not a schema change.

create table public.user_contact_methods(
 user_id uuid not null references auth.users on delete cascade,
 kind text not null check(kind in('phone')),
 value text not null check(value ~ '^\+[1-9][0-9]{7,14}$'),
 verified_via text not null default 'none' check(verified_via in('none','sms','legacy_auth')),
 verified_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(user_id,kind),
 check((verified_via='none')=(verified_at is null)));
create unique index user_contact_methods_phone on public.user_contact_methods(value) where kind='phone';
alter table public.user_contact_methods enable row level security;
revoke all on public.user_contact_methods from public,anon,authenticated;
grant select on public.user_contact_methods to authenticated;
grant all on public.user_contact_methods to service_role;
create policy contact_owner_read on public.user_contact_methods for select to authenticated using(user_id=(select auth.uid()));

create table picket_private.otp_challenges(
 id uuid primary key default gen_random_uuid(),
 channel text not null check(channel in('sms','email')),
 destination_hash text not null check(destination_hash ~ '^[a-f0-9]{64}$'),
 user_id uuid references auth.users on delete cascade,
 purpose text not null check(purpose in('verify_phone','login','recovery')),
 code_hash text not null check(code_hash ~ '^[a-f0-9]{64}$'),
 attempts integer not null default 0,
 expires_at timestamptz not null,
 consumed_at timestamptz,
 created_at timestamptz not null default now());
create index otp_challenges_destination on picket_private.otp_challenges(destination_hash,created_at desc);
create table picket_private.auth_rate_limits(
 key text primary key check(length(key) between 8 and 200),
 window_start timestamptz not null,
 hits integer not null);
revoke all on picket_private.otp_challenges,picket_private.auth_rate_limits from public,anon,authenticated;

-- Owner attaches or replaces their phone. Uniqueness is global.
create function public.contact_set_phone(p_phone text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.user_contact_methods;begin
 perform picket_private.account_access();
 if p_phone is null or p_phone !~ '^\+[1-9][0-9]{7,14}$' or (p_phone like '+84%' and p_phone !~ '^\+84[35789][0-9]{8}$') then raise exception 'Invalid phone' using errcode='22023';end if;
 if exists(select 1 from public.user_contact_methods where kind='phone' and value=p_phone and user_id<>auth.uid())
  or exists(select 1 from auth.users where phone=ltrim(p_phone,'+') and id<>auth.uid()) then raise exception 'Phone already used' using errcode='23505';end if;
 insert into public.user_contact_methods as c(user_id,kind,value) values(auth.uid(),'phone',p_phone)
 on conflict(user_id,kind) do update set value=excluded.value,
  verified_via=case when c.value=excluded.value then c.verified_via else 'none' end,
  verified_at=case when c.value=excluded.value then c.verified_at else null end,updated_at=now()
 returning * into v;
 return to_jsonb(v);
end$$;
revoke all on function public.contact_set_phone(text) from public,anon;
grant execute on function public.contact_set_phone(text) to authenticated;

-- Service: resolve a phone to an account for password sign-in. Suspended or
-- deleted accounts resolve to nothing (same answer as an unknown phone).
create function public.auth_phone_lookup(p_phone text) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((select jsonb_build_object('userId',u.id,'email',case when u.email_confirmed_at is not null then u.email end,'authPhone',case when u.phone_confirmed_at is not null then u.phone end)
  from auth.users u
  where (u.id=(select user_id from public.user_contact_methods where kind='phone' and value=p_phone)
     or (u.phone=ltrim(p_phone,'+') and u.phone_confirmed_at is not null))
   and(u.banned_until is null or u.banned_until<=now())
  limit 1),'{}'::jsonb)
$$;

-- Service: fixed-window limiter shared by login and OTP endpoints.
create function public.auth_rate_hit(p_key text,p_limit integer,p_window_seconds integer) returns boolean language plpgsql security definer set search_path='' as $$
declare r picket_private.auth_rate_limits;begin
 insert into picket_private.auth_rate_limits as l(key,window_start,hits) values(p_key,now(),1)
 on conflict(key) do update set window_start=case when l.window_start<now()-make_interval(secs=>p_window_seconds) then now() else l.window_start end,
  hits=case when l.window_start<now()-make_interval(secs=>p_window_seconds) then 1 else l.hits+1 end
 returning * into r;
 delete from picket_private.auth_rate_limits where window_start<now()-interval '1 day';
 return r.hits<=p_limit;
end$$;

-- Service: one active challenge per destination, 60 s resend cooldown.
create function public.otp_create(p_channel text,p_destination_hash text,p_user uuid,p_purpose text,p_code_hash text,p_ttl_seconds integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid;begin
 if p_ttl_seconds not between 60 and 900 then raise exception 'Invalid TTL' using errcode='22023';end if;
 if exists(select 1 from picket_private.otp_challenges where destination_hash=p_destination_hash and created_at>now()-interval '60 seconds') then
  raise exception 'Resend cooldown' using errcode='P0429';end if;
 update picket_private.otp_challenges set consumed_at=now() where destination_hash=p_destination_hash and consumed_at is null;
 insert into picket_private.otp_challenges(channel,destination_hash,user_id,purpose,code_hash,expires_at)
 values(p_channel,p_destination_hash,p_user,p_purpose,p_code_hash,now()+make_interval(secs=>p_ttl_seconds)) returning id into v_id;
 return jsonb_build_object('id',v_id,'expiresInSeconds',p_ttl_seconds);
end$$;

-- Service: at most 5 attempts; a challenge is single-use.
create function public.otp_verify(p_id uuid,p_code_hash text,p_user uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare c picket_private.otp_challenges;begin
 select * into c from picket_private.otp_challenges where id=p_id for update;
 if not found or c.consumed_at is not null or c.expires_at<=now() or c.attempts>=5 or c.user_id is distinct from p_user then return jsonb_build_object('ok',false,'reason','expired');end if;
 update picket_private.otp_challenges set attempts=attempts+1 where id=p_id;
 if c.code_hash<>p_code_hash then return jsonb_build_object('ok',false,'reason','mismatch','attemptsLeft',4-c.attempts);end if;
 update picket_private.otp_challenges set consumed_at=now() where id=p_id;
 return jsonb_build_object('ok',true,'purpose',c.purpose,'destinationHash',c.destination_hash);
end$$;

create function public.contact_mark_phone_verified(p_user uuid,p_phone text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.user_contact_methods;begin
 update public.user_contact_methods set verified_via='sms',verified_at=now(),updated_at=now() where user_id=p_user and kind='phone' and value=p_phone returning * into v;
 if not found then raise exception 'Phone not attached' using errcode='22023';end if;
 return to_jsonb(v);
end$$;

revoke all on function public.auth_phone_lookup(text),public.auth_rate_hit(text,integer,integer),public.otp_create(text,text,uuid,text,text,integer),public.otp_verify(uuid,text,uuid),public.contact_mark_phone_verified(uuid,text) from public,anon,authenticated;
grant execute on function public.auth_phone_lookup(text),public.auth_rate_hit(text,integer,integer),public.otp_create(text,text,uuid,text,text,integer),public.otp_verify(uuid,text,uuid),public.contact_mark_phone_verified(uuid,text) to service_role;
