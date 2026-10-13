-- Server OCR is a paid, asynchronous fallback for receipts that local ML Kit
-- cannot parse confidently. Images stay private in picket-media and expire.
create table public.ocr_fallback_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  local_confidence numeric(4,3) not null check (
    local_confidence >= 0 and local_confidence <= 1
  ),
  status text not null default 'queued' check (
    status in ('queued', 'processing', 'completed', 'failed', 'cancelled', 'expired')
  ),
  result jsonb,
  error_code text,
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  constraint ocr_fallback_storage_path_length check (
    length(storage_path) between 1 and 1024
  ),
  constraint ocr_fallback_result_size check (
    result is null or octet_length(result::text) <= 65536
  ),
  constraint ocr_fallback_user_idempotency unique (user_id, idempotency_key)
);

create index ocr_fallback_jobs_owner_created_idx
  on public.ocr_fallback_jobs(user_id, created_at desc);
create index ocr_fallback_jobs_worker_queue_idx
  on public.ocr_fallback_jobs(created_at, id)
  where status = 'queued';
create index ocr_fallback_jobs_expiry_idx
  on public.ocr_fallback_jobs(expires_at)
  where status not in ('expired', 'cancelled');

alter table public.ocr_fallback_jobs enable row level security;
revoke all on public.ocr_fallback_jobs from anon, authenticated;
grant select on public.ocr_fallback_jobs to authenticated;
create policy ocr_fallback_owner_read
  on public.ocr_fallback_jobs for select to authenticated
  using (user_id = (select auth.uid()));

create function public.create_ocr_fallback_job(
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
  daily_limit := case plan_name when 'pro' then 100 when 'plus' then 30 else 3 end;
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
grant execute on function public.create_ocr_fallback_job(text, numeric, uuid)
  to authenticated;

-- Called only by a trusted worker/scheduled task. It marks stale rows; that
-- worker must also delete the corresponding private Storage object.
create function public.expire_ocr_fallback_jobs()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare affected bigint;
begin
  update public.ocr_fallback_jobs
  set status = 'expired', result = null, updated_at = now()
  where expires_at <= now() and status not in ('expired', 'cancelled');
  get diagnostics affected = row_count;
  return affected;
end;
$$;
revoke all on function public.expire_ocr_fallback_jobs() from public;
