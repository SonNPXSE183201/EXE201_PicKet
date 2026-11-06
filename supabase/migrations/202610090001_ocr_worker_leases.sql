-- Trusted OCR workers claim jobs through short leases. All worker functions
-- are service-role only; mobile and the public Dart API can only read jobs.
alter table public.ocr_fallback_jobs
  add column attempts integer not null default 0 check (attempts between 0 and 3),
  add column worker_id text check (worker_id is null or length(worker_id) between 1 and 80),
  add column lease_expires_at timestamptz,
  add column storage_deleted_at timestamptz;

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
  set status = 'failed', error_code = 'LEASE_RETRY_EXHAUSTED',
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

create function public.complete_ocr_fallback_job(
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

create function public.fail_ocr_fallback_job(
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

drop function public.expire_ocr_fallback_jobs();
create function public.expire_ocr_fallback_jobs()
returns table(storage_path text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.ocr_fallback_jobs job
  set status = 'expired', result = null, updated_at = now(), worker_id = null,
      lease_expires_at = null
  where job.expires_at <= now() and job.status <> 'expired'
    and job.status <> 'cancelled';
  return query
  select job.storage_path
  from public.ocr_fallback_jobs job
  where job.status = 'expired' and job.storage_deleted_at is null
  order by job.expires_at, job.id
  limit 100;
end;
$$;
revoke all on function public.expire_ocr_fallback_jobs() from public;
grant execute on function public.expire_ocr_fallback_jobs() to service_role;

create function public.acknowledge_ocr_storage_deletion(p_storage_paths text[])
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare affected bigint;
begin
  if p_storage_paths is null or cardinality(p_storage_paths) not between 1 and 100 then
    raise exception 'OCR_STORAGE_PATHS_INVALID' using errcode = '22023';
  end if;
  update public.ocr_fallback_jobs
  set storage_deleted_at = now(), updated_at = now()
  where status = 'expired' and storage_deleted_at is null
    and storage_path = any(p_storage_paths);
  get diagnostics affected = row_count;
  return affected;
end;
$$;
revoke all on function public.acknowledge_ocr_storage_deletion(text[])
  from public;
grant execute on function public.acknowledge_ocr_storage_deletion(text[])
  to service_role;
