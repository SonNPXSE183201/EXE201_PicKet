-- End-of-month forecast settings chosen by admins. The forecast itself is computed on the
-- device from the user's own records; these settings only switch it on/off, set how much
-- history it needs and which plans get the "what if I buy this" scenario.
create table public.forecast_settings(
  id boolean primary key default true check (id),
  enabled boolean not null default true,
  min_history_days integer not null default 14 check (min_history_days between 1 and 90),
  lookback_months integer not null default 3 check (lookback_months between 1 and 6),
  scenario_plans text[] not null default array['pro']::text[] check (scenario_plans <@ array['free','plus','pro']::text[]),
  revision integer not null default 1,
  updated_by uuid references auth.users on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.forecast_settings default values;
create table public.forecast_settings_audit(
  id bigint generated always as identity primary key,
  actor uuid references auth.users on delete set null,
  before_value jsonb not null,
  after_value jsonb not null,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.forecast_settings enable row level security;
alter table public.forecast_settings_audit enable row level security;
revoke all on public.forecast_settings, public.forecast_settings_audit from anon, authenticated;
insert into public.permission_catalog values('forecast.manage','Cấu hình dự báo tài chính') on conflict do nothing;

create function picket_private.forecast_settings_json(s public.forecast_settings) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('enabled', s.enabled, 'minHistoryDays', s.min_history_days, 'lookbackMonths', s.lookback_months,
    'scenarioPlans', to_jsonb(s.scenario_plans))
$$;
revoke all on function picket_private.forecast_settings_json(public.forecast_settings) from public, anon, authenticated;

-- What the app needs: the settings plus whether this caller's plan has the scenario.
-- Signed-out callers (local mode) get the settings with scenario = false.
create function public.forecast_settings_public() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.forecast_settings; v_plan text := 'free';
begin
  select * into s from public.forecast_settings where id;
  if not found then
    return '{"enabled":true,"minHistoryDays":14,"lookbackMonths":3,"scenario":false,"revision":0}'::jsonb;
  end if;
  if auth.uid() is not null then v_plan := coalesce(public.current_plan(), 'free'); end if;
  return jsonb_build_object('enabled', s.enabled, 'minHistoryDays', s.min_history_days, 'lookbackMonths', s.lookback_months,
    'scenario', v_plan = any(s.scenario_plans), 'revision', s.revision);
end$$;
revoke all on function public.forecast_settings_public() from public;
grant execute on function public.forecast_settings_public() to anon, authenticated, service_role;

create function public.forecast_settings_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not picket_private.has_permission('forecast.manage') then
    raise exception 'Administrative permission required' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'settings', (select picket_private.forecast_settings_json(s) || jsonb_build_object('revision', s.revision, 'updatedAt', s.updated_at)
      from public.forecast_settings s where id),
    'history', coalesce((select jsonb_agg(h) from (
      select before_value as "before", after_value as "after", reason, created_at as "createdAt"
      from public.forecast_settings_audit order by id desc limit 20) h), '[]'::jsonb));
end$$;

create function public.forecast_settings_save(
  p_enabled boolean, p_min_history_days integer, p_lookback_months integer, p_scenario_plans text[], p_revision integer, p_reason text
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
    or p_scenario_plans is null or not (p_scenario_plans <@ array['free','plus','pro']::text[]) then
    raise exception 'Invalid forecast settings' using errcode = '22023';
  end if;
  select * into prev from public.forecast_settings where id for update;
  if prev.revision <> p_revision then raise exception 'Settings changed by someone else' using errcode = 'PT409'; end if;
  update public.forecast_settings
    set enabled = p_enabled, min_history_days = p_min_history_days, lookback_months = p_lookback_months,
        scenario_plans = (select coalesce(array_agg(distinct p order by p), '{}') from unnest(p_scenario_plans) p),
        revision = revision + 1, updated_by = auth.uid(), updated_at = now()
    where id returning * into v;
  insert into public.forecast_settings_audit(actor, before_value, after_value, reason)
    values (auth.uid(), picket_private.forecast_settings_json(prev), picket_private.forecast_settings_json(v), trim(p_reason));
  return picket_private.forecast_settings_json(v) || jsonb_build_object('revision', v.revision, 'updatedAt', v.updated_at);
end$$;
revoke all on function public.forecast_settings_get(), public.forecast_settings_save(boolean, integer, integer, text[], integer, text) from public, anon;
grant execute on function public.forecast_settings_get(), public.forecast_settings_save(boolean, integer, integer, text[], integer, text) to authenticated;

notify pgrst, 'reload schema';
