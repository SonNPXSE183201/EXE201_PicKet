-- SMS sign-up hardening (follows 20261118120000_phone_signup_fast_paths).
-- 1. The API now verifies the Firebase ID token before touching the database, and these
--    gates take the proof (uid + auth_time): the reservation is consumed and the proof
--    burned in one transaction, so a request without a valid token for the phone can no
--    longer burn someone else's reservation, and a replayed proof leaves it intact.
-- 2. start ignores a pending half-created account (created by a timed-out complete), so
--    the user can ask for a new code and the next complete removes that account.
-- The older gates stay for the API version still deployed; drop them in a later migration.

-- start: unchanged except that a pending account is not an owner.
create or replace function public.auth_phone_signup_start(
  p_phone text, p_phone_key text, p_client_key text, p_reservation text, p_purpose text
) returns text
language plpgsql security definer set search_path = '' as $$
declare v_owner uuid;
begin
  if p_purpose not in ('signup', 'reset') then raise exception 'Invalid purpose' using errcode = '22023'; end if;
  if p_purpose = 'signup' and (public.auth_verification_public()->>'sms')::boolean is not true then
    return 'sms_disabled';
  end if;
  if not public.auth_rate_hit('phone-signup:start-phone:' || p_phone_key, 3, 3600) then return 'rate_limited'; end if;
  if not public.auth_rate_hit('phone-signup:start-client:' || p_client_key, 10, 3600) then return 'rate_limited'; end if;
  if p_purpose = 'signup' then
    v_owner := public.auth_phone_owner(p_phone);
    if v_owner is not null and v_owner is distinct from public.auth_pending_phone_signup(p_phone) then
      return 'phone_taken';
    end if;
  end if;
  if not public.auth_sms_quota_hit() then return 'quota_reached'; end if;
  perform public.auth_phone_signup_reserve(p_reservation);
  return 'ok';
end$$;

-- Consumes the reservation and burns the proof together. Returns null on success,
-- otherwise the rejection status; a replayed proof rolls the consumption back.
create function picket_private.phone_reservation_with_proof(
  p_phone text, p_reservation text, p_uid text, p_auth_time bigint, p_purpose text
) returns text
language plpgsql security definer set search_path = '' as $$
begin
  begin
    if not public.auth_phone_signup_consume(p_reservation) then return 'no_reservation'; end if;
    insert into picket_private.firebase_phone_proofs(firebase_uid, auth_time, phone, purpose)
      values (p_uid, p_auth_time, p_phone, p_purpose);
  exception when unique_violation then
    -- Leaving the block through the handler undoes the consumption above.
    return 'proof_used';
  end;
  delete from picket_private.firebase_phone_proofs where used_at < now() - interval '2 days';
  return null;
end$$;
revoke all on function picket_private.phone_reservation_with_proof(text, text, text, bigint, text)
  from public, anon, authenticated;

-- complete: settings -> per-client 20/h -> password rule -> reservation + proof ->
-- pending half-created account (returned for the API to delete) -> phone free.
create function public.auth_phone_signup_verified_gate(
  p_phone text, p_client_key text, p_reservation text, p_password_ok boolean,
  p_uid text, p_auth_time bigint
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_pending uuid; v_owner uuid; v_rejected text;
begin
  if (public.auth_verification_public()->>'sms')::boolean is not true then
    return jsonb_build_object('status', 'sms_disabled');
  end if;
  if not public.auth_rate_hit('phone-signup:complete-client:' || p_client_key, 20, 3600) then
    return jsonb_build_object('status', 'rate_limited');
  end if;
  if not p_password_ok then return jsonb_build_object('status', 'weak_password'); end if;
  v_rejected := picket_private.phone_reservation_with_proof(p_phone, p_reservation, p_uid, p_auth_time, 'signup');
  if v_rejected is not null then return jsonb_build_object('status', v_rejected); end if;
  v_pending := public.auth_pending_phone_signup(p_phone);
  v_owner := public.auth_phone_owner(p_phone);
  -- The pending account is removed by the API, so it does not count as an owner.
  if v_owner is not null and v_owner is distinct from v_pending then
    return jsonb_build_object('status', 'phone_taken');
  end if;
  return jsonb_build_object('status', 'ok', 'pending', v_pending);
end$$;

-- reset: per-client 10/h -> password rule -> reservation + proof -> account to update.
create function public.auth_phone_reset_verified_gate(
  p_phone text, p_client_key text, p_reservation text, p_password_ok boolean,
  p_uid text, p_auth_time bigint
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_rejected text; v_target uuid;
begin
  if not public.auth_rate_hit('phone-signup:reset-client:' || p_client_key, 10, 3600) then
    return jsonb_build_object('status', 'rate_limited');
  end if;
  if not p_password_ok then return jsonb_build_object('status', 'weak_password'); end if;
  v_rejected := picket_private.phone_reservation_with_proof(p_phone, p_reservation, p_uid, p_auth_time, 'recovery');
  if v_rejected is not null then return jsonb_build_object('status', v_rejected); end if;
  v_target := public.auth_phone_recovery_target(p_phone);
  if v_target is null then return jsonb_build_object('status', 'no_account'); end if;
  return jsonb_build_object('status', 'ok', 'target', v_target);
end$$;

revoke all on function public.auth_phone_signup_verified_gate(text, text, text, boolean, text, bigint),
  public.auth_phone_reset_verified_gate(text, text, text, boolean, text, bigint) from public, anon, authenticated;
grant execute on function public.auth_phone_signup_verified_gate(text, text, text, boolean, text, bigint),
  public.auth_phone_reset_verified_gate(text, text, text, boolean, text, bigint) to service_role;
