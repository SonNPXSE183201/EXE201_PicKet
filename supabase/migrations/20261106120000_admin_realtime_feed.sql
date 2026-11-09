-- Admin realtime feed: database writes push a tiny "something changed in
-- <section>" event to the private Realtime topic `admin:feed`; the admin web
-- refreshes only the affected screens. Payloads carry no row data, only the
-- section name and operation. Only staff may receive the topic (RLS below).
-- Writes never fail because of Realtime: errors are swallowed.

create table if not exists picket_private.admin_realtime_ticks (
  section text primary key,
  sent_at timestamptz not null default 'epoch'
);
revoke all on picket_private.admin_realtime_ticks from public, anon, authenticated;

-- TG_ARGV[0] = section, TG_ARGV[1] = minimum seconds between two events for
-- that section (coalesces bursts from busy tables such as analytics).
create or replace function picket_private.admin_realtime_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_section text := tg_argv[0];
  v_gap interval := make_interval(secs => coalesce(nullif(tg_argv[1], '')::numeric, 1));
  v_due boolean;
begin
  insert into picket_private.admin_realtime_ticks as t (section, sent_at)
  values (v_section, now())
  on conflict (section) do update set sent_at = now()
    where t.sent_at < now() - v_gap
  returning true into v_due;

  if coalesce(v_due, false) then
    begin
      perform realtime.send(
        jsonb_build_object('section', v_section, 'op', lower(tg_op), 'table', tg_table_name, 'at', now()),
        'change',
        'admin:feed',
        true
      );
    exception when others then
      null; -- Realtime unavailable (or local PGlite): never block the write.
    end;
  end if;
  return null;
exception when others then
  return null;
end;
$$;
revoke all on function picket_private.admin_realtime_notify() from public, anon, authenticated;

do $$
declare
  spec text[];
  specs text[][] := array[
    array['profiles', 'users', '1'],
    array['staff_members', 'staff', '1'],
    array['admin_tickets', 'tickets', '1'],
    array['admin_ticket_comments', 'tickets', '1'],
    array['admin_records', 'records', '1'],
    array['partner_ads', 'partners', '1'],
    array['admin_audit', 'audit', '1'],
    array['admin_health_samples', 'health', '10'],
    array['admin_integration_runs', 'integrations', '2'],
    array['admin_exports', 'exports', '1'],
    array['app_settings', 'settings', '1'],
    array['billing_orders', 'payments', '1'],
    array['payment_transactions', 'payments', '1'],
    array['revenue_ledger', 'revenue', '1'],
    array['play_purchases', 'billing', '1'],
    array['plan_grants', 'billing', '1'],
    array['payment_entitlement_grants', 'billing', '1'],
    array['billing_promotions', 'promotions', '1'],
    array['promotion_redemptions', 'promotions', '2'],
    array['app_announcements', 'announcements', '1'],
    array['app_releases', 'releases', '1'],
    array['permission_groups', 'permissions', '1'],
    array['permission_group_rules', 'permissions', '1'],
    array['permission_group_members', 'permissions', '1'],
    array['user_permissions', 'permissions', '1'],
    array['app_analytics_events', 'analytics', '10'],
    array['admin_daily_metrics', 'analytics', '10'],
    array['ocr_events', 'ocr', '5']
  ];
begin
  foreach spec slice 1 in array specs loop
    if to_regclass('public.' || spec[1]) is null then
      continue;
    end if;
    execute format('drop trigger if exists admin_realtime_feed on public.%I', spec[1]);
    execute format(
      'create trigger admin_realtime_feed after insert or update or delete on public.%I '
      'for each statement execute function picket_private.admin_realtime_notify(%L, %L)',
      spec[1], spec[2], spec[3]
    );
  end loop;
end;
$$;

-- Only active staff can join the private topic. Realtime evaluates this policy
-- with the subscriber's JWT when the channel is joined.
do $$
begin
  if to_regclass('realtime.messages') is null then
    return; -- Local PGlite has no Realtime schema.
  end if;
  execute 'drop policy if exists "staff receive admin feed" on realtime.messages';
  execute $p$
    create policy "staff receive admin feed" on realtime.messages
    for select to authenticated
    using (realtime.topic() = 'admin:feed' and (select public.is_staff()))
  $p$;
end;
$$;
