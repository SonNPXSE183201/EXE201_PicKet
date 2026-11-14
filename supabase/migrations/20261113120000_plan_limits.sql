-- Configurable daily cloud-OCR limit per plan (Free / Plus / Pro).
-- Defaults match the previous hard-coded values (3 / 30 / 100). Both the quota check and the
-- entitlements shown to users read the same table, so they cannot disagree.
create table public.plan_limits(
  plan text primary key check (plan in ('free','plus','pro')),
  ocr_fallback_daily_limit integer not null check (ocr_fallback_daily_limit between 0 and 10000),
  revision integer not null default 1,
  updated_by uuid references auth.users on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.plan_limits(plan, ocr_fallback_daily_limit) values ('free',3),('plus',30),('pro',100);
create table public.plan_limits_audit(
  id bigint generated always as identity primary key,
  plan text not null,
  actor uuid references auth.users on delete set null,
  before_limit integer,
  after_limit integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.plan_limits enable row level security;
alter table public.plan_limits_audit enable row level security;
revoke all on public.plan_limits, public.plan_limits_audit from anon, authenticated;

insert into public.permission_catalog values('plans.manage','Quản lý hạn mức theo gói') on conflict do nothing;

create function picket_private.plan_ocr_limit(p_plan text) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select ocr_fallback_daily_limit from public.plan_limits where plan = p_plan),
    case p_plan when 'pro' then 100 when 'plus' then 30 else 3 end);
$$;
revoke all on function picket_private.plan_ocr_limit(text) from public, anon, authenticated;

create function public.plan_limits_list() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (picket_private.has_permission('plans.manage') or picket_private.has_permission('billing.read')) then
    raise exception 'Administrative permission required' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'limits', coalesce((select jsonb_agg(x order by case x.plan when 'free' then 0 when 'plus' then 1 else 2 end) from (
      select plan, ocr_fallback_daily_limit as "ocrFallbackDailyLimit", revision, updated_at as "updatedAt" from public.plan_limits) x), '[]'::jsonb),
    'history', coalesce((select jsonb_agg(h) from (
      select plan, before_limit as "before", after_limit as "after", reason, created_at as "createdAt"
      from public.plan_limits_audit order by id desc limit 20) h), '[]'::jsonb));
end$$;

create function public.plan_limits_save(p_plan text, p_limit integer, p_revision integer, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare prev public.plan_limits; v public.plan_limits;
begin
  perform picket_private.permission_require('plans.manage', true);
  if p_reason is null or length(trim(p_reason)) not between 5 and 500 then
    raise exception 'Reason required' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 0 or p_limit > 10000 then
    raise exception 'Invalid limit' using errcode = '22023';
  end if;
  select * into prev from public.plan_limits where plan = p_plan for update;
  if not found then raise exception 'Unknown plan' using errcode = '22023'; end if;
  if prev.revision <> p_revision then raise exception 'Limit changed by someone else' using errcode = 'PT409'; end if;
  update public.plan_limits set ocr_fallback_daily_limit = p_limit, revision = revision + 1, updated_by = auth.uid(), updated_at = now()
    where plan = p_plan returning * into v;
  insert into public.plan_limits_audit(plan, actor, before_limit, after_limit, reason)
    values (p_plan, auth.uid(), prev.ocr_fallback_daily_limit, p_limit, trim(p_reason));
  return jsonb_build_object('plan', v.plan, 'ocrFallbackDailyLimit', v.ocr_fallback_daily_limit, 'revision', v.revision);
end$$;
revoke all on function public.plan_limits_list(), public.plan_limits_save(text, integer, integer, text) from public, anon;
grant execute on function public.plan_limits_list(), public.plan_limits_save(text, integer, integer, text) to authenticated;

create or replace function public.create_ocr_fallback_job(
  p_storage_path text,
  p_local_confidence numeric,
  p_idempotency_key uuid
) returns public.ocr_fallback_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  plan_name text;
  daily_limit integer;
  existing_job public.ocr_fallback_jobs;
  created_job public.ocr_fallback_jobs;
begin
  if owner_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_idempotency_key is null then
    raise exception 'OCR_INVALID_REQUEST' using errcode = '22023';
  end if;

  select job.* into existing_job
  from public.ocr_fallback_jobs job
  where job.user_id = owner_id and job.idempotency_key = p_idempotency_key;
  if found then return existing_job; end if;

  if p_storage_path is null
    or length(p_storage_path) > 1024
    or p_storage_path like '%..%'
    or p_storage_path !~* ('^' || owner_id::text || '/ocr/.+\.(jpg|jpeg|png|webp)$')
    or p_local_confidence is null
    or p_local_confidence < 0
    or p_local_confidence > 1 then
    raise exception 'OCR_INVALID_REQUEST' using errcode = '22023';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'picket-media' and name = p_storage_path
  ) then
    raise exception 'OCR_IMAGE_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Serialize quota decisions per user so concurrent requests cannot bypass it.
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 0));
  plan_name := public.current_plan();
  daily_limit := picket_private.plan_ocr_limit(plan_name);
  if (
    select count(*) from public.ocr_fallback_jobs
    where user_id = owner_id
      and created_at >= now() - interval '24 hours'
      and status <> 'cancelled'
  ) >= daily_limit then
    raise exception 'OCR_QUOTA_EXCEEDED' using errcode = 'P0001';
  end if;

  insert into public.ocr_fallback_jobs(
    user_id, storage_path, local_confidence, idempotency_key
  ) values (
    owner_id, p_storage_path, p_local_confidence, p_idempotency_key
  ) returning * into created_job;
  return created_job;
end;
$$;


revoke all on function public.create_ocr_fallback_job(text, numeric, uuid) from public;
grant execute on function public.create_ocr_fallback_job(text, numeric, uuid) to authenticated;

-- Expose a single server-authoritative view of plan and metered OCR usage.
create or replace function public.current_entitlements()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  plan_name text;
  daily_limit integer;
  used_count integer;
begin
  if owner_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  plan_name := public.current_plan();
  daily_limit := picket_private.plan_ocr_limit(plan_name);
  select count(*)::integer into used_count
  from public.ocr_fallback_jobs
  where user_id = owner_id
    and created_at >= now() - interval '24 hours'
    and status <> 'cancelled';

  return jsonb_build_object(
    'tier', plan_name,
    'ocr_fallback_daily_limit', daily_limit,
    'ocr_fallback_used', used_count,
    'ocr_fallback_remaining', greatest(daily_limit - used_count, 0)
  );
end;
$$;

revoke all on function public.current_entitlements() from public, anon;
grant execute on function public.current_entitlements() to authenticated;
