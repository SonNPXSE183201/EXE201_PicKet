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
  daily_limit := case plan_name when 'pro' then 100 when 'plus' then 30 else 3 end;
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
