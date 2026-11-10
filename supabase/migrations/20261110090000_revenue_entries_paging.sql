create or replace function public.revenue_entries(p_filters jsonb default '{}')
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
 v_page integer:=coalesce(nullif(p_filters->>'page','')::integer,0);
 v_limit integer:=least(coalesce(nullif(p_filters->>'limit','')::integer,50),1000);
 v_page_mode boolean:=p_filters ? 'page';
begin
 perform picket_private.permission_require('revenue.read');
 if p_filters is null or jsonb_typeof(p_filters)<>'object' or v_page<0 or v_page>10000 or v_limit<1 then
  raise exception 'Invalid revenue page' using errcode='22023';
 end if;
 return jsonb_build_object(
  'entries',coalesce((select jsonb_agg(x order by x.id desc) from(
   select l.id,l.source,l.kind,l.status,l.external_ref,l.user_id,l.sku,l.tier,l.currency,l.amount_original,l.amount_vnd,l.is_test,l.occurred_at,l.recorded_at,l.payment_order_id,l.evidence,l.note,
    o.order_code,(select count(*) from public.revenue_ledger_history h where h.ledger_id=l.id) as revisions
   from public.revenue_ledger l left join public.billing_orders o on o.id=l.payment_order_id
   where(p_filters->>'source' is null or l.source=p_filters->>'source')
    and(p_filters->>'status' is null or l.status=p_filters->>'status')
    and(p_filters->>'kind' is null or l.kind=p_filters->>'kind')
    and(p_filters->>'ref' is null or l.external_ref=p_filters->>'ref' or o.order_code::text=p_filters->>'ref')
    and(p_filters->>'userId' is null or l.user_id=(p_filters->>'userId')::uuid)
    and(p_filters->>'from' is null or l.occurred_at>=(p_filters->>'from')::timestamptz)
    and(p_filters->>'to' is null or l.occurred_at<(p_filters->>'to')::timestamptz)
    and(v_page_mode or p_filters->>'beforeId' is null or l.id<(p_filters->>'beforeId')::bigint)
   order by l.id desc
   limit case when v_page_mode then 25 else v_limit end
   offset case when v_page_mode then v_page*25 else 0 end
  )x),'[]'::jsonb),
  'total',(select count(*) from public.revenue_ledger l left join public.billing_orders o on o.id=l.payment_order_id
   where(p_filters->>'source' is null or l.source=p_filters->>'source')
    and(p_filters->>'status' is null or l.status=p_filters->>'status')
    and(p_filters->>'kind' is null or l.kind=p_filters->>'kind')
    and(p_filters->>'ref' is null or l.external_ref=p_filters->>'ref' or o.order_code::text=p_filters->>'ref')
    and(p_filters->>'userId' is null or l.user_id=(p_filters->>'userId')::uuid)
    and(p_filters->>'from' is null or l.occurred_at>=(p_filters->>'from')::timestamptz)
    and(p_filters->>'to' is null or l.occurred_at<(p_filters->>'to')::timestamptz)),
  'history',case when p_filters->>'id' is null then '[]'::jsonb else coalesce((select jsonb_agg(h order by h.id) from public.revenue_ledger_history h where h.ledger_id=(p_filters->>'id')::bigint),'[]'::jsonb) end
 );
end
$$;
