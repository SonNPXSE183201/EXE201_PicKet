-- Admin users directory: show the phone number of every account and find accounts by phone.
--
-- Before: rows only carried auth.users.phone (accounts created by SMS sign-up, stored
-- without "+"), so a phone verified and attached later (public.user_contact_methods)
-- never appeared, and a search typed as "0912 345 678" never matched "84912345678".
--
-- The private directory function is unchanged; the public wrapper now
--   1. turns a phone-looking search into the stored digits (0xxxxxxxxx -> 84xxxxxxxxx)
--      and, when a verified contact phone matches, narrows the page to its owner;
--   2. adds contact_phone / contact_phone_verified to each returned row.
-- Both helpers check the users.read permission themselves.

create function picket_private.admin_contact_phones(p_ids uuid[]) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform picket_private.admin_require('users');
  return coalesce((
    select jsonb_object_agg(c.user_id::text, jsonb_build_object('phone', c.value, 'verified', c.verified_via <> 'none'))
    from public.user_contact_methods c
    where c.kind = 'phone' and c.user_id = any(p_ids)
  ), '{}'::jsonb);
end$$;

create function picket_private.admin_phone_owner(p_digits text) returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  perform picket_private.admin_require('users');
  return (select c.user_id from public.user_contact_methods c where c.kind = 'phone' and c.value = '+' || p_digits);
end$$;

revoke all on function picket_private.admin_contact_phones(uuid[]), picket_private.admin_phone_owner(text)
  from public, anon;
grant execute on function picket_private.admin_contact_phones(uuid[]), picket_private.admin_phone_owner(text)
  to authenticated;

create or replace function public.admin_portal(p_section text, p_filters jsonb default '{}'::jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  result jsonb;
  v_filters jsonb := coalesce(p_filters, '{}'::jsonb);
  v_search text;
  v_digits text;
  v_owner uuid;
  v_phones jsonb;
begin
  if p_section in ('users', 'user') and jsonb_typeof(v_filters) = 'object' then
    v_search := btrim(coalesce(v_filters->>'search', ''));
    if v_search ~ '^\+?[0-9][0-9 .-]{7,18}$' then
      v_digits := regexp_replace(v_search, '[^0-9]', '', 'g');
      if v_digits ~ '^0[0-9]{9}$' then v_digits := '84' || substr(v_digits, 2); end if;
      v_owner := picket_private.admin_phone_owner(v_digits);
      if v_owner is not null and v_filters->>'userId' is null then
        v_filters := (v_filters - 'search') || jsonb_build_object('userId', v_owner::text);
      else
        v_filters := jsonb_set(v_filters, '{search}', to_jsonb(v_digits));
      end if;
    end if;
  end if;

  result := picket_private.admin_portal(p_section, v_filters);

  if p_section in ('users', 'user') and jsonb_typeof(result->'rows') = 'array' and jsonb_array_length(result->'rows') > 0 then
    v_phones := picket_private.admin_contact_phones(
      array(select (r->>'id')::uuid from jsonb_array_elements(result->'rows') r where r->>'id' is not null));
    result := jsonb_set(result, '{rows}', (
      select jsonb_agg(
        case when v_phones ? (r->>'id')
          then r || jsonb_build_object(
            'contact_phone', v_phones->(r->>'id')->>'phone',
            'contact_phone_verified', v_phones->(r->>'id')->'verified')
          else r end
        order by o)
      from jsonb_array_elements(result->'rows') with ordinality t(r, o)));
  end if;

  if p_section in ('users', 'user', 'staff') then perform picket_private.admin_log_lookup(p_section, p_filters); end if;
  return result;
end $$;

notify pgrst, 'reload schema';
