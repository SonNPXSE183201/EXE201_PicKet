drop function public.payment_orders(uuid,text,timestamptz,uuid);

create function public.payment_orders(
 p_id uuid default null,
 p_status text default null,
 p_before timestamptz default null,
 p_before_id uuid default null,
 p_page integer default null,
 p_page_size integer default 50,
 p_search text default null,
 p_from date default null,
 p_to date default null
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_search text:=lower(trim(coalesce(p_search,'')));
 v_page_size integer:=coalesce(p_page_size,50);
begin
 perform picket_private.permission_require('payments.read');
 if (p_page is not null and (p_page<0 or p_page>10000)) or v_page_size<1 or v_page_size>100 or length(v_search)>160 or (p_from is not null and p_to is not null and p_to<p_from) then
  raise exception 'Invalid payment filters' using errcode='22023';
 end if;
 return jsonb_build_object(
  'orders',coalesce((select jsonb_agg(x) from(
   select o.id,o.user_id,o.order_code,o.sku,o.amount,o.currency,o.status,o.created_at,o.expires_at
   from public.billing_orders o
   where(p_id is null or o.id=p_id)
    and(p_status is null or o.status=p_status)
    and(p_page is not null or p_before is null or o.created_at<p_before or(o.created_at=p_before and p_before_id is not null and o.id<p_before_id))
    and(v_search='' or o.id::text=v_search or strpos(o.order_code::text,v_search)>0 or strpos(lower(coalesce(o.user_id::text,'')),v_search)>0)
    and(p_from is null or o.created_at>=(p_from::timestamp at time zone 'Asia/Ho_Chi_Minh'))
    and(p_to is null or o.created_at<((p_to+1)::timestamp at time zone 'Asia/Ho_Chi_Minh'))
   order by o.created_at desc,o.id desc
   limit v_page_size offset case when p_page is null then 0 else p_page*v_page_size end
  )x),'[]'::jsonb),
  'total',(select count(*) from public.billing_orders o
   where(p_id is null or o.id=p_id)
    and(p_status is null or o.status=p_status)
    and(v_search='' or o.id::text=v_search or strpos(o.order_code::text,v_search)>0 or strpos(lower(coalesce(o.user_id::text,'')),v_search)>0)
    and(p_from is null or o.created_at>=(p_from::timestamp at time zone 'Asia/Ho_Chi_Minh'))
    and(p_to is null or o.created_at<((p_to+1)::timestamp at time zone 'Asia/Ho_Chi_Minh'))),
  'events',case when p_id is null then '[]'::jsonb else coalesce((select jsonb_agg(x order by x.id) from(
   select e.id,e.event_type,e.details,e.created_at from public.payment_events e where e.order_id=p_id order by e.id limit 200
  )x),'[]'::jsonb) end,
  'page',coalesce(p_page,0),
  'pageSize',v_page_size
 );
end
$$;

revoke all on function public.payment_orders(uuid,text,timestamptz,uuid,integer,integer,text,date,date) from public,anon,authenticated;
grant execute on function public.payment_orders(uuid,text,timestamptz,uuid,integer,integer,text,date,date) to authenticated;
