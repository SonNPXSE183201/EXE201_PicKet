-- Active plans across every source (Google Play, PayOS, manual grants), using the same
-- rules as current_entitlements, so admin screens match what users actually have.
create or replace function public.billing_plan_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
begin
 if not (picket_private.has_permission('billing.read') or picket_private.has_permission('revenue.read')) then
  raise exception 'Administrative permission required' using errcode='42501';
 end if;
 return (
  with active as (
   select user_id,tier,'google_play'::text as source from public.play_purchases
    where active and expires_at>now() and verified_at>now()-interval '24 hours'
   union all select user_id,tier,'manual' from public.plan_grants where expires_at>now()
   union all select user_id,tier,'payos' from public.payment_entitlement_grants
    where starts_at<=now() and expires_at>now() and revoked_at is null
  ), best as (
   select user_id,case when bool_or(tier='pro') then 'pro' else 'plus' end as tier from active where user_id is not null group by user_id
  )
  select jsonb_build_object(
   'plus',coalesce((select count(*) from best where tier='plus'),0),
   'pro',coalesce((select count(*) from best where tier='pro'),0),
   'bySource',coalesce((select jsonb_agg(x order by x.source,x.tier) from(
     select source,tier,count(distinct user_id) as users from active group by source,tier)x),'[]'::jsonb)
  )
 );
end$$;
revoke all on function public.billing_plan_summary() from public,anon;
grant execute on function public.billing_plan_summary() to authenticated;
