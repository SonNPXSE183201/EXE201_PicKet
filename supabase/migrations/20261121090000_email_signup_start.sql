-- Email sign-up start: the apps call this (through the API) before Supabase sends the
-- 6-digit code, so an address that already belongs to a finished account is refused
-- instead of receiving a sign-in code through the sign-up screen.
--
-- An address does not count as taken while its account is still being created:
-- never confirmed (the code was never entered), or confirmed but the password step
-- was never finished (user_metadata.password_setup_required = true). Those people
-- can request a new code and finish signing up.
--
-- Order: settings -> per-email 10/h -> per-client 30/h -> address free. Limiter hits
-- before a rejection stay counted because rejections are returned as a status.

create function public.auth_email_owner(p_email text) returns uuid
language sql stable security definer set search_path = '' as $$
  select u.id
  from auth.users u
  where lower(u.email) = lower(p_email)
    and u.deleted_at is null
    and u.email_confirmed_at is not null
    and coalesce(u.raw_user_meta_data->>'password_setup_required', 'false') <> 'true'
  limit 1
$$;

create function public.auth_email_signup_start(p_email text, p_email_key text, p_client_key text)
returns text
language plpgsql security definer set search_path = '' as $$
begin
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(p_email) > 254 then
    raise exception 'Invalid email' using errcode = '22023';
  end if;
  if (public.auth_verification_public()->>'email')::boolean is not true then
    return 'email_disabled';
  end if;
  if not public.auth_rate_hit('email-signup:start-email:' || p_email_key, 10, 3600) then return 'rate_limited'; end if;
  if not public.auth_rate_hit('email-signup:start-client:' || p_client_key, 30, 3600) then return 'rate_limited'; end if;
  if public.auth_email_owner(p_email) is not null then return 'email_taken'; end if;
  return 'ok';
end$$;

revoke all on function public.auth_email_owner(text), public.auth_email_signup_start(text, text, text)
  from public, anon, authenticated;
grant execute on function public.auth_email_owner(text), public.auth_email_signup_start(text, text, text)
  to service_role;
