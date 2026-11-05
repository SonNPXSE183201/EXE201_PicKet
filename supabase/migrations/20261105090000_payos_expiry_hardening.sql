-- PayOS mentor review 05/11/2026.
-- * The link expiry sent to PayOS (now + 900 s at link creation) is persisted.
-- * A new purchase supersedes older pending links instead of being blocked;
--   linked orders are returned so the API cancels them at PayOS first.
-- * A full payment that lands after expiry/cancel still settles the order.
-- * Revenue counts paid orders only; review money is reported separately.

create or replace function public.payment_reserve(p_sku text,p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.billing_catalog; o public.billing_orders;begin
 perform picket_private.account_access();
 if p_key is null or length(p_key) not between 8 and 120 then raise exception 'Invalid idempotency key' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select * into o from public.billing_orders where user_id=auth.uid() and idempotency_key=p_key;
 if found then
  if o.sku<>p_sku then raise exception 'Idempotency key reused' using errcode='22023';end if;
 else
  select * into c from public.billing_catalog where sku=p_sku and enabled;
  if not found then raise exception 'Plan unavailable' using errcode='22023';end if;
  if public.current_plan()<>'free' then raise exception 'Paid plan already active' using errcode='23514';end if;
  -- A reservation without a PayOS link can never receive money.
  with closed as (
   update public.billing_orders set status='cancelled'
   where user_id=auth.uid() and status='pending' and payment_link_id is null returning id)
  insert into public.payment_events(order_id,event_type) select id,'superseded' from closed;
  insert into public.billing_orders(user_id,sku,tier,months,amount,idempotency_key) values(auth.uid(),c.sku,c.tier,c.months,c.amount,p_key) returning * into o;
  insert into public.payment_events(order_id,event_type) values(o.id,'created');
 end if;
 return to_jsonb(o)||jsonb_build_object('supersede',coalesce((
  select jsonb_agg(jsonb_build_object('id',id,'order_code',order_code,'amount',amount,'payment_link_id',payment_link_id) order by created_at)
  from public.billing_orders where user_id=auth.uid() and status='pending' and payment_link_id is not null and id<>o.id),'[]'::jsonb));
end$$;

create or replace function public.payment_attach(p_id uuid,p_data jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.billing_orders set payment_link_id=p_data->>'paymentLinkId',checkout_url=p_data->>'checkoutUrl',qr_code=p_data->>'qrCode',
  expires_at=coalesce((p_data->>'expiresAt')::timestamptz,expires_at)
 where id=p_id and payment_link_id is null;
 if found then insert into public.payment_events(order_id,event_type,details) values(p_id,'checkout_ready',jsonb_build_object('expiresAt',p_data->>'expiresAt'));end if;
end$$;

create or replace function public.payment_receive(p_data jsonb,p_account text) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.billing_orders; total bigint; payment_time timestamptz; ref text;begin
 -- Called only by server after cryptographic signature verification.
 select * into o from public.billing_orders where order_code=(p_data->>'orderCode')::bigint for update;
 if not found then return jsonb_build_object('ignored',true);end if;
 ref:=p_data->>'reference';
 if p_data->>'code' is distinct from '00' or p_data->>'currency' is distinct from 'VND' or p_data->>'accountNumber' is distinct from p_account or coalesce(p_account,'')='' or o.payment_link_id is null or p_data->>'paymentLinkId' is distinct from o.payment_link_id or ref is null or length(ref) not between 1 and 200 or p_data->>'amount' is null or (p_data->>'amount')::bigint<=0 then raise exception 'Payment mismatch' using errcode='22023';end if;
 payment_time:=case when p_data->>'transactionDateTime' ~ '(Z|[+-][0-9]{2}:[0-9]{2})$' then (p_data->>'transactionDateTime')::timestamptz else (p_data->>'transactionDateTime')::timestamp at time zone 'Asia/Ho_Chi_Minh' end;
 if payment_time is null then raise exception 'Missing payment time' using errcode='22023';end if;
 if exists(select 1 from public.payment_transactions where reference=ref and(order_id<>o.id or amount<>(p_data->>'amount')::bigint)) then raise exception 'Reference collision' using errcode='23514';end if;
 insert into public.payment_transactions(order_id,reference,amount,currency,paid_at) values(o.id,ref,(p_data->>'amount')::bigint,'VND',payment_time) on conflict(reference) do nothing;
 if not found then return jsonb_build_object('duplicate',true);end if;
 insert into public.payment_events(order_id,event_type,details) values(o.id,'payment_received',jsonb_build_object('reference',ref,'amount',(p_data->>'amount')::bigint,'lateAfterExpiry',payment_time>o.expires_at,'statusBefore',o.status));
 select sum(amount) into total from public.payment_transactions where order_id=o.id;
 -- Money that really arrived for the exact price is honoured even when it
 -- lands just after expiry or a cancel. Partial/excess payments and a second
 -- payment while a plan is already active stay visible for manual review.
 if total=o.amount and o.status in('pending','expired','cancelled') and o.user_id is not null then
  perform pg_advisory_xact_lock(hashtextextended(o.user_id::text,0));
  if exists(select 1 from public.play_purchases where user_id=o.user_id and active and expires_at>now() and verified_at>now()-interval '24 hours') or exists(select 1 from public.plan_grants where user_id=o.user_id and expires_at>now()) or exists(select 1 from public.payment_entitlement_grants where user_id=o.user_id and expires_at>now() and revoked_at is null) then
   update public.billing_orders set status='review' where id=o.id;
  else
   insert into public.payment_entitlement_grants values(o.id,o.user_id,o.tier,now(),now()+make_interval(months=>o.months),null) on conflict(order_id) do nothing;
   update public.billing_orders set status='paid' where id=o.id;
   insert into public.payment_events(order_id,event_type) values(o.id,'entitlement_granted');
  end if;
 elsif o.status<>'paid' or total<>o.amount then update public.billing_orders set status='review' where id=o.id;
 end if;
 return jsonb_build_object('accepted',true);
end$$;

create or replace function public.payment_dashboard(p_filters jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare f timestamptz; t timestamptz; bucket text; v_period text; local_start timestamp;begin
 perform picket_private.permission_require('revenue.read');
 v_period:=coalesce(p_filters->>'period','month');
 if v_period not in('day','month','year','custom') then raise exception 'Invalid revenue period' using errcode='22023';end if;
 local_start:=date_trunc(case when v_period='custom' then 'month' else v_period end,now() at time zone 'Asia/Ho_Chi_Minh');
 f:=case when p_filters->>'from' is null then local_start at time zone 'Asia/Ho_Chi_Minh' when p_filters->>'from' ~ '(Z|[+-][0-9]{2}:[0-9]{2})$' then(p_filters->>'from')::timestamptz else(p_filters->>'from')::timestamp at time zone 'Asia/Ho_Chi_Minh' end;
 t:=case when p_filters->>'to' is null then(local_start+case v_period when 'day' then interval '1 day' when 'year' then interval '1 year' else interval '1 month' end)at time zone 'Asia/Ho_Chi_Minh' when p_filters->>'to' ~ '(Z|[+-][0-9]{2}:[0-9]{2})$' then(p_filters->>'to')::timestamptz else(p_filters->>'to')::timestamp at time zone 'Asia/Ho_Chi_Minh' end;
 bucket:=coalesce(p_filters->>'bucket','day');
 if t<=f or t-f>interval '5 years' or bucket not in('day','month','year') then raise exception 'Invalid revenue range' using errcode='22023';end if;
 return jsonb_build_object('currency','VND','provider','payos','from',f,'to',t,
  'total',coalesce((select sum(p.amount) from public.payment_transactions p join public.billing_orders o on o.id=p.order_id where o.status='paid' and p.paid_at>=f and p.paid_at<t),0),
  'reviewTotal',coalesce((select sum(p.amount) from public.payment_transactions p join public.billing_orders o on o.id=p.order_id where o.status='review' and p.paid_at>=f and p.paid_at<t),0),
  'series',coalesce((select jsonb_agg(x order by period) from(select date_trunc(bucket,p.paid_at at time zone 'Asia/Ho_Chi_Minh') as period,sum(p.amount) as amount,count(*) as transactions from public.payment_transactions p join public.billing_orders o on o.id=p.order_id where o.status='paid' and p.paid_at>=f and p.paid_at<t group by 1)x),'[]'),
  'coverage','PayOS paid orders only; review (partial, excess or duplicate) money is reported in reviewTotal; refunds and Google Play earnings are separate sources');
end$$;

-- Overdue pending links are checked first and every minute until PayOS
-- confirms their final state; everything else keeps the 5-minute backoff.
create or replace function public.payment_reconcile_queue() returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('orders',coalesce((select jsonb_agg(x) from(
  select * from public.billing_orders
  where payment_link_id is not null and status in('pending','review','expired','cancelled') and created_at>now()-interval '30 days'
   and(last_checked_at is null
    or last_checked_at<now()-case when status='pending' and expires_at<=now() then interval '1 minute' else interval '5 minutes' end)
  order by(status='pending' and expires_at<=now()) desc,last_checked_at nulls first,created_at limit 30)x),'[]'))
$$;

create function public.payment_expire_unlinked() returns jsonb language plpgsql security definer set search_path='' as $$
declare n integer;begin
 with closed as (
  update public.billing_orders set status='expired'
  where status='pending' and payment_link_id is null and expires_at<now() returning id)
 insert into public.payment_events(order_id,event_type) select id,'expired' from closed;
 get diagnostics n=row_count;
 return jsonb_build_object('expired',n);
end$$;
revoke all on function public.payment_expire_unlinked() from public,anon,authenticated;
grant execute on function public.payment_expire_unlinked() to service_role;
