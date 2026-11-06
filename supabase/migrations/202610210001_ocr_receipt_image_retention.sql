-- The Storage DELETE runs after the RPC transaction commits. A durable claim
-- closes that gap; receipt/job writes and cleanup share the same path lock.
alter table public.ocr_fallback_jobs
  add column storage_deletion_claimed_at timestamptz;
create index receipts_storage_reference_idx on public.receipts(storage_path);
create index ocr_fallback_storage_reference_idx on public.ocr_fallback_jobs(storage_path);

create function public.protect_claimed_ocr_image()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.storage_path !~* '^[^/]+/ocr/' then
    return new;
  end if;
  if split_part(new.storage_path, '/', 1) <> new.user_id::text then
    raise exception 'OCR_IMAGE_OWNER_MISMATCH' using errcode = '23514';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('picket-media/' || new.storage_path, 0)
  );
  -- Separate statement after waiting for the lock: acquire a fresh snapshot.
  if exists (
    select 1 from public.ocr_fallback_jobs job
    where job.storage_path = new.storage_path
      and (job.storage_deletion_claimed_at is not null
        or job.storage_deleted_at is not null)
  ) then
    raise exception 'OCR_IMAGE_DELETION_CLAIMED' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_claimed_ocr_image() from public;

create trigger receipts_protect_claimed_ocr_image
before insert or update of user_id, storage_path on public.receipts
for each row execute function public.protect_claimed_ocr_image();

create trigger jobs_protect_claimed_ocr_image
before insert or update of user_id, storage_path on public.ocr_fallback_jobs
for each row execute function public.protect_claimed_ocr_image();

create or replace function public.expire_ocr_fallback_jobs()
returns table(storage_path text)
language plpgsql
security definer
set search_path = ''
as $$
declare candidate_path text;
begin
  update public.ocr_fallback_jobs job
  set status = 'expired', result = null, updated_at = now(), worker_id = null,
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

create or replace function public.acknowledge_ocr_storage_deletion(p_storage_paths text[])
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
  update public.ocr_fallback_jobs job
  set storage_deleted_at = now(), updated_at = now()
  where job.status = 'expired' and job.storage_deleted_at is null
    and job.storage_deletion_claimed_at is not null
    and job.storage_path = any(p_storage_paths);
  get diagnostics affected = row_count;
  return affected;
end;
$$;
revoke all on function public.acknowledge_ocr_storage_deletion(text[]) from public;
grant execute on function public.acknowledge_ocr_storage_deletion(text[]) to service_role;
