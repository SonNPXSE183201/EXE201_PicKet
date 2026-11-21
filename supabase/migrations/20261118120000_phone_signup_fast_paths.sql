-- One round trip per SMS sign-up step. These wrap the existing auth_* RPCs and keep
-- their order and semantics; every limiter hit made before a rejection stays counted
-- because rejections are returned as a status, never raised.

-- start: settings -> per-phone 3/h -> per-client 10/h -> phone free -> daily quota -> reserve.
create function public.auth_phone_signup_start(
  p_phone text, p_phone_key text, p_client_key text, p_reservation text, p_purpose text
) returns text
language plpgsql security definer set search_path = '' as $$
begin
  if p_purpose not in ('signup', 'reset') then raise exception 'Invalid purpose' using errcode = '22023'; end if;
  if p_purpose = 'signup' and (public.auth_verification_public()->>'sms')::boolean is not true then
    return 'sms_disabled';
  end if;
  if not public.auth_rate_hit('phone-signup:start-phone:' || p_phone_key, 3, 3600) then return 'rate_limited'; end if;
  if not public.auth_rate_hit('phone-signup:start-client:' || p_client_key, 10, 3600) then return 'rate_limited'; end if;
  if p_purpose = 'signup' and public.auth_phone_owner(p_phone) is not null then return 'phone_taken'; end if;
  if not public.auth_sms_quota_hit() then return 'quota_reached'; end if;
  perform public.auth_phone_signup_reserve(p_reservation);
  return 'ok';
end$$;

-- complete: settings -> per-client 20/h -> password rule -> consume reservation ->
-- pending half-created account (returned for the API to delete) -> phone free.
create function public.auth_phone_signup_complete_gate(
  p_phone text, p_client_key text, p_reservation text, p_password_ok boolean
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_pending uuid; v_owner uuid;
begin
  if (public.auth_verification_public()->>'sms')::boolean is not true then
    return jsonb_build_object('status', 'sms_disabled');
  end if;
  if not public.auth_rate_hit('phone-signup:complete-client:' || p_client_key, 20, 3600) then
    return jsonb_build_object('status', 'rate_limited');
  end if;
  if not p_password_ok then return jsonb_build_object('status', 'weak_password'); end if;
  if not public.auth_phone_signup_consume(p_reservation) then
    return jsonb_build_object('status', 'no_reservation');
  end if;
  v_pending := public.auth_pending_phone_signup(p_phone);
  v_owner := public.auth_phone_owner(p_phone);
  -- The pending account is removed by the API, so it does not count as an owner.
  if v_owner is not null and v_owner is distinct from v_pending then
    return jsonb_build_object('status', 'phone_taken');
  end if;
  return jsonb_build_object('status', 'ok', 'pending', v_pending);
end$$;

-- reset: per-client 10/h -> password rule -> consume reservation.
create function public.auth_phone_reset_gate(
  p_client_key text, p_reservation text, p_password_ok boolean
) returns text
language plpgsql security definer set search_path = '' as $$
begin
  if not public.auth_rate_hit('phone-signup:reset-client:' || p_client_key, 10, 3600) then return 'rate_limited'; end if;
  if not p_password_ok then return 'weak_password'; end if;
  if not public.auth_phone_signup_consume(p_reservation) then return 'no_reservation'; end if;
  return 'ok';
end$$;

revoke all on function public.auth_phone_signup_start(text, text, text, text, text),
  public.auth_phone_signup_complete_gate(text, text, text, boolean),
  public.auth_phone_reset_gate(text, text, boolean) from public, anon, authenticated;
grant execute on function public.auth_phone_signup_start(text, text, text, text, text),
  public.auth_phone_signup_complete_gate(text, text, text, boolean),
  public.auth_phone_reset_gate(text, text, boolean) to service_role;
