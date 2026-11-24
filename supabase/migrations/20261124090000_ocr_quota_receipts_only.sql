-- Charge server OCR only for scans that read like a receipt. Jobs reserve quota while
-- queued/processing (counts_quota defaults to true); a failed job, a job that expires
-- before it is processed, and a completed job whose text does not look like a receipt
-- release it. The OCR provider returns raw text (amount is parsed on the device), so the
-- receipt check runs on that text here, where the client cannot influence it.
-- The flag is kept when a completed job expires, so receipts stay counted for 24 hours.
alter table public.ocr_fallback_jobs
  add column counts_quota boolean not null default true;

create function picket_private.ocr_result_is_receipt(p_result jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select case
    when jsonb_typeof(p_result->'amount') = 'number' and (p_result->>'amount')::numeric > 0 then true
    else coalesce(
      -- a money-like figure ("45.000", "120,000", "35000") ...
      lower(p_result->>'rawText') ~ '(\d{1,3}([.,]\d{3})+|\d{4,})'
      -- ... and a receipt word: total, payment, invoice, price, quantity, currency.
      and lower(p_result->>'rawText') ~ '(t[ổôo]ng|total|thanh\s*to[áa]n|h[óo]a\s*[đd][ơo]n|bi[êe]n\s*lai|phi[ếe]u|ti[ềe]n|c[ộo]ng|gi[áa]|đ[ơo]n\s*gi[áa]|s[ốo]\s*l[ưu][ợo]ng|vn[dđ]|vat|thu[ếe]|receipt|invoice|bill|cash|qty|amount|subtotal|₫)',
      false)
  end
$$;
revoke all on function picket_private.ocr_result_is_receipt(jsonb) from public, anon, authenticated;

-- Past jobs: release failed and never-processed ones, classify completed ones by their text.
update public.ocr_fallback_jobs
set counts_quota = case
    when status = 'completed' then picket_private.ocr_result_is_receipt(result)
    when status = 'expired' then completed_at is not null and error_code is null
    else false end
where status in ('completed', 'failed', 'expired', 'cancelled');

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
      and counts_quota and status not in ('cancelled', 'failed')
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
    and counts_quota and status not in ('cancelled', 'failed');

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

create or replace function public.claim_ocr_fallback_jobs(
  p_worker_id text,
  p_limit integer default 1
) returns setof public.ocr_fallback_jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_worker_id is null or length(trim(p_worker_id)) not between 1 and 80
      or p_limit is null or p_limit not between 1 and 10 then
    raise exception 'OCR_WORKER_INVALID_REQUEST' using errcode = '22023';
  end if;

  update public.ocr_fallback_jobs
  set status = 'failed', counts_quota = false, error_code = 'LEASE_RETRY_EXHAUSTED',
      completed_at = now(), updated_at = now(), worker_id = null,
      lease_expires_at = null
  where status = 'processing' and lease_expires_at <= now() and attempts >= 3;

  return query
  with candidates as (
    select job.id
    from public.ocr_fallback_jobs job
    where job.expires_at > now()
      and job.attempts < 3
      and (
        job.status = 'queued'
        or (job.status = 'processing' and job.lease_expires_at <= now())
      )
    order by job.created_at, job.id
    for update skip locked
    limit p_limit
  )
  update public.ocr_fallback_jobs job
  set status = 'processing', worker_id = trim(p_worker_id),
      attempts = job.attempts + 1, started_at = coalesce(job.started_at, now()),
      lease_expires_at = now() + interval '5 minutes', updated_at = now(),
      error_code = null
  from candidates
  where job.id = candidates.id
  returning job.*;
end;
$$;
revoke all on function public.claim_ocr_fallback_jobs(text, integer) from public;
grant execute on function public.claim_ocr_fallback_jobs(text, integer)
  to service_role;

create or replace function public.complete_ocr_fallback_job(
  p_job_id uuid,
  p_worker_id text,
  p_result jsonb
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_result is null or jsonb_typeof(p_result) <> 'object'
      or octet_length(p_result::text) > 65536 then
    raise exception 'OCR_RESULT_INVALID' using errcode = '22023';
  end if;
  update public.ocr_fallback_jobs
  set status = 'completed', result = p_result, error_code = null,
      counts_quota = picket_private.ocr_result_is_receipt(p_result),
      completed_at = now(), updated_at = now(), lease_expires_at = null
  where id = p_job_id and status = 'processing'
    and worker_id = p_worker_id and lease_expires_at > now();
  return found;
end;
$$;
revoke all on function public.complete_ocr_fallback_job(uuid, text, jsonb)
  from public;
grant execute on function public.complete_ocr_fallback_job(uuid, text, jsonb)
  to service_role;

create or replace function public.fail_ocr_fallback_job(
  p_job_id uuid,
  p_worker_id text,
  p_error_code text,
  p_retryable boolean default false
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_error_code is null or p_error_code !~ '^[A-Z0-9_]{1,80}$' then
    raise exception 'OCR_ERROR_CODE_INVALID' using errcode = '22023';
  end if;
  update public.ocr_fallback_jobs
  set status = case when p_retryable and attempts < 3 then 'queued' else 'failed' end,
      counts_quota = p_retryable and attempts < 3,
      error_code = p_error_code, updated_at = now(), worker_id = null,
      lease_expires_at = null,
      completed_at = case when p_retryable and attempts < 3 then null else now() end
  where id = p_job_id and status = 'processing' and worker_id = p_worker_id;
  return found;
end;
$$;
revoke all on function public.fail_ocr_fallback_job(uuid, text, text, boolean)
  from public;
grant execute on function public.fail_ocr_fallback_job(uuid, text, text, boolean)
  to service_role;

create or replace function public.expire_ocr_fallback_jobs()
returns table(storage_path text)
language plpgsql
security definer
set search_path = ''
as $$
declare candidate_path text;
begin
  update public.ocr_fallback_jobs job
  set status = 'expired', result = null,
      counts_quota = job.counts_quota and job.status = 'completed', updated_at = now(), worker_id = null,
      lease_expires_at = null
  where job.expires_at <= now() and job.status <> 'expired'
    and job.status <> 'cancelled';

  for candidate_path in
    select distinct job.storage_path from public.ocr_fallback_jobs job
    where job.status = 'expired' and job.storage_deleted_at is null
      and not exists (select 1 from public.receipts receipt
        where receipt.storage_path = job.storage_path)
      and not exists (select 1 from public.ocr_fallback_jobs live_job
        where live_job.storage_path = job.storage_path
          and live_job.status not in ('expired', 'cancelled'))
    order by job.storage_path limit 100
  loop
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('picket-media/' || candidate_path, 0)
    );
    -- Archived receipts remain restorable and must protect their image too.
    if exists (select 1 from public.receipts receipt
      where receipt.storage_path = candidate_path)
      or exists (select 1 from public.ocr_fallback_jobs job
        where job.storage_path = candidate_path
          and job.status not in ('expired', 'cancelled')) then
      continue;
    end if;
    update public.ocr_fallback_jobs job
    set storage_deletion_claimed_at = coalesce(job.storage_deletion_claimed_at, now())
    where job.storage_path = candidate_path and job.status = 'expired'
      and job.storage_deleted_at is null;
    storage_path := candidate_path;
    return next;
  end loop;
end;
$$;
revoke all on function public.expire_ocr_fallback_jobs() from public;
grant execute on function public.expire_ocr_fallback_jobs() to service_role;
