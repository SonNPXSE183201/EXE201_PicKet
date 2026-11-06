-- Optional account defaults; existing device overrides remain authoritative.
alter table public.user_preferences
  add column theme_mode text check (theme_mode in ('system','light','dark')),
  add column language_mode text check (language_mode = 'system' or language_mode ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  add column color_scheme_id text check (color_scheme_id ~ '^[a-z][a-z0-9_-]{0,63}$');

create or replace function public.current_profile() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'displayName', p.display_name, 'avatarUrl', p.avatar_url,
    'onboardingCompleted', p.onboarding_completed, 'locale', p.locale,
    'timezone', p.timezone, 'persona', coalesce(up.persona, ''),
    'goal', coalesce(up.goal, ''), 'currencyCode', coalesce(up.currency_code, 'VND'),
    'hideBalance', coalesce(up.hide_balance, false),
    'themeMode', up.theme_mode, 'languageMode', up.language_mode,
    'colorSchemeId', up.color_scheme_id
  ) from public.profiles p
  left join public.user_preferences up on up.user_id = p.id
  where p.id = auth.uid();
$$;
revoke all on function public.current_profile() from public;
grant execute on function public.current_profile() to authenticated;
