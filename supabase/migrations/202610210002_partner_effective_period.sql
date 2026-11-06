-- Optional UTC instants: existing notices retain their active/inactive behavior.
-- Display interval is [starts_at, ends_at); NULL leaves that bound open.
alter table public.partner_ads
  add column starts_at timestamptz,
  add column ends_at timestamptz,
  add constraint partner_ads_effective_period
    check (starts_at is null or ends_at is null or starts_at < ends_at);

drop policy ads_visible on public.partner_ads;
create policy ads_visible on public.partner_ads for select to authenticated
  using (
    public.is_staff() or (
      active
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or now() < ends_at)
    )
  );

comment on column public.partner_ads.starts_at is
  'Optional inclusive UTC instant. NULL preserves legacy unrestricted start.';
comment on column public.partner_ads.ends_at is
  'Optional exclusive UTC instant. NULL preserves legacy unrestricted end.';
