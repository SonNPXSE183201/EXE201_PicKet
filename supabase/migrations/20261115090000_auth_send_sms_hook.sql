-- Auth Hook ("send SMS"). PicKet sends sign-up and recovery SMS through Firebase on
-- the device; Supabase only needs the Phone provider for the phone + password
-- sign-in of accounts created by the API. With this hook enabled Supabase uses no
-- SMS provider (no Twilio account) and refuses every SMS it would have sent, so
-- phone OTP through Supabase cannot be used to bypass PicKet's limits.
create function public.hook_send_sms(event jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'SMS codes are sent by the PicKet app'));
end$$;
revoke all on function public.hook_send_sms(jsonb) from public, anon, authenticated;
do $$begin
  if exists(select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.hook_send_sms(jsonb) to supabase_auth_admin;
  end if;
end$$;
