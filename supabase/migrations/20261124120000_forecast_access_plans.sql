-- The month-end forecast is a paid benefit: only signed-in callers on an access plan
-- (Plus and Pro by default, editable by admins) get it. The public answer now says
-- whether the caller may see the forecast (`allowed`) and whether they are signed in,
-- so the app can show a sign-in prompt or an upgrade screen instead of numbers.
alter table public.forecast_settings
  add column access_plans text[] not null default array['plus','pro']::text[]
    check (access_plans <@ array['free','plus','pro']::text[]);

create or replace function picket_private.forecast_settings_json(s public.forecast_settings) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('enabled', s.enabled, 'minHistoryDays', s.min_history_days, 'lookbackMonths', s.lookback_months,
    'accessPlans', to_jsonb(s.access_plans), 'scenarioPlans', to_jsonb(s.scenario_plans))
$$;
revoke all on function picket_private.forecast_settings_json(public.forecast_settings) from public, anon, authenticated;

create or replace function public.forecast_settings_public() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.forecast_settings; v_plan text; v_signed_in boolean := auth.uid() is not null; v_allowed boolean;
begin
  select * into s from public.forecast_settings where id;
  if not found then
    return jsonb_build_object('enabled', true, 'minHistoryDays', 14, 'lookbackMonths', 3,
      'signedIn', v_signed_in, 'allowed', false, 'scenario', false, 'revision', 0);
  end if;
  v_plan := case when v_signed_in then coalesce(public.current_plan(), 'free') else null end;
  v_allowed := s.enabled and v_signed_in and v_plan = any(s.access_plans);
  return jsonb_build_object('enabled', s.enabled, 'minHistoryDays', s.min_history_days, 'lookbackMonths', s.lookback_months,
    'signedIn', v_signed_in, 'allowed', v_allowed,
    'scenario', v_allowed and v_plan = any(s.scenario_plans), 'revision', s.revision);
end$$;
revoke all on function public.forecast_settings_public() from public;
grant execute on function public.forecast_settings_public() to anon, authenticated, service_role;

-- Same contract as before plus access plans; null keeps the current access plans so
-- older admin clients that do not send the field keep working.
drop function public.forecast_settings_save(boolean, integer, integer, text[], integer, text);
create function public.forecast_settings_save(
  p_enabled boolean, p_min_history_days integer, p_lookback_months integer, p_scenario_plans text[], p_revision integer, p_reason text,
  p_access_plans text[] default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare prev public.forecast_settings; v public.forecast_settings;
begin
  perform picket_private.permission_require('forecast.manage', true);
  if p_reason is null or length(trim(p_reason)) not between 5 and 500 then
    raise exception 'Reason required' using errcode = '22023';
  end if;
  if p_enabled is null or p_min_history_days is null or p_min_history_days not between 1 and 90
    or p_lookback_months is null or p_lookback_months not between 1 and 6
    or p_scenario_plans is null or not (p_scenario_plans <@ array['free','plus','pro']::text[])
    or (p_access_plans is not null and not (p_access_plans <@ array['free','plus','pro']::text[])) then
    raise exception 'Invalid forecast settings' using errcode = '22023';
  end if;
  select * into prev from public.forecast_settings where id for update;
  if prev.revision <> p_revision then raise exception 'Settings changed by someone else' using errcode = 'PT409'; end if;
  update public.forecast_settings
    set enabled = p_enabled, min_history_days = p_min_history_days, lookback_months = p_lookback_months,
        scenario_plans = (select coalesce(array_agg(distinct p order by p), '{}') from unnest(p_scenario_plans) p),
        access_plans = coalesce((select array_agg(distinct p order by p) from unnest(p_access_plans) p), access_plans),
        revision = revision + 1, updated_by = auth.uid(), updated_at = now()
    where id returning * into v;
  insert into public.forecast_settings_audit(actor, before_value, after_value, reason)
    values (auth.uid(), picket_private.forecast_settings_json(prev), picket_private.forecast_settings_json(v), trim(p_reason));
  return picket_private.forecast_settings_json(v) || jsonb_build_object('revision', v.revision, 'updatedAt', v.updated_at);
end$$;
revoke all on function public.forecast_settings_save(boolean, integer, integer, text[], integer, text, text[]) from public, anon;
grant execute on function public.forecast_settings_save(boolean, integer, integer, text[], integer, text, text[]) to authenticated;

notify pgrst, 'reload schema';
