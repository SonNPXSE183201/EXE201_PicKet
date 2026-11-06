-- Marketing promotions on the existing four plans (PayOS channel).
-- Promotions are data: admins create, pause, raise or lower a percentage, cap
-- the number of slots (e.g. a founder offer for the first 100 buyers) and set
-- a window. The server computes and locks the price on each order; a pending
-- 15-minute order holds a slot, an expired/cancelled order releases it, and a
-- paid order consumes it. Google Play prices stay in Play Console offers;
-- play_offer_id only maps a promotion to that offer for reporting.

insert into public.permission_catalog values('promotions.manage','Quản lý ưu đãi') on conflict do nothing;

create table public.billing_promotions(
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 3 and 80),
 description text check(description is null or length(description)<=300),
 code text unique check(code is null or code ~ '^[A-Z0-9_-]{3,32}$'),
 discount_percent integer not null check(discount_percent between 1 and 90),
 skus text[] not null check(cardinality(skus) between 1 and 10),
 channels text[] not null default array['payos'] check(channels <@ array['payos','google_play']::text[] and cardinality(channels)>=1),
 starts_at timestamptz not null default now(),
 ends_at timestamptz,
 max_redemptions integer check(max_redemptions is null or max_redemptions between 1 and 1000000),
 per_user_limit integer not null default 1 check(per_user_limit between 1 and 100),
 enabled boolean not null default false,
 priority integer not null default 0,
 play_offer_id text check(play_offer_id is null or play_offer_id ~ '^[a-z0-9-]{1,63}$'),
 revision integer not null default 1,
 created_by uuid references auth.users on delete set null,
 updated_by uuid references auth.users on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(ends_at is null or ends_at>starts_at));

create table public.promotion_redemptions(
 order_id uuid primary key references public.billing_orders,
 promotion_id uuid not null references public.billing_promotions,
 user_id uuid references auth.users on delete set null,
 state text not null check(state in('reserved','consumed','released')),
 updated_at timestamptz not null default now());
create index promotion_redemptions_promo on public.promotion_redemptions(promotion_id,state);

create table public.promotion_audit(
 id bigint generated always as identity primary key,
 promotion_id uuid not null references public.billing_promotions,
 actor uuid references auth.users on delete set null,
 before_value jsonb,
 after_value jsonb not null,
 reason text not null,
 created_at timestamptz not null default now());

alter table public.billing_orders
 add column list_amount bigint,
 add column discount_amount bigint not null default 0 check(discount_amount>=0),
 add column promotion_id uuid references public.billing_promotions;

alter table public.billing_promotions enable row level security;
alter table public.promotion_redemptions enable row level security;
alter table public.promotion_audit enable row level security;
revoke all on public.billing_promotions,public.promotion_redemptions,public.promotion_audit from public,anon,authenticated;
grant all on public.billing_promotions,public.promotion_redemptions,public.promotion_audit to service_role;

-- Slots in use: paid orders plus pending orders whose link is still open.
create function picket_private.promotion_used(p_id uuid) returns integer language sql stable security definer set search_path='' as $$
 select count(*)::int from public.promotion_redemptions r join public.billing_orders o on o.id=r.order_id
 where r.promotion_id=p_id and(r.state='consumed' or(r.state='reserved' and o.status='pending' and o.expires_at>now()))
$$;
create function picket_private.promotion_user_used(p_id uuid,p_user uuid) returns integer language sql stable security definer set search_path='' as $$
 select count(*)::int from public.promotion_redemptions r join public.billing_orders o on o.id=r.order_id
 where r.promotion_id=p_id and r.user_id=p_user and(r.state='consumed' or(r.state='reserved' and o.status='pending' and o.expires_at>now()))
$$;
-- Best promotion currently available to this user for a PayOS SKU.
create function picket_private.promotion_for(p_sku text,p_user uuid,p_code text) returns public.billing_promotions language sql stable security definer set search_path='' as $$
 select p.* from public.billing_promotions p
 where p.enabled and p_sku=any(p.skus) and 'payos'=any(p.channels) and p.starts_at<=now() and(p.ends_at is null or p.ends_at>now())
  and(p.code is null or p.code=upper(p_code))
  and(p.max_redemptions is null or picket_private.promotion_used(p.id)<p.max_redemptions)
  and(p_user is null or picket_private.promotion_user_used(p.id,p_user)<p.per_user_limit)
 order by p.discount_percent desc,p.priority desc,p.created_at limit 1
$$;
revoke all on function picket_private.promotion_used(uuid),picket_private.promotion_user_used(uuid,uuid),picket_private.promotion_for(text,uuid,text) from public,anon,authenticated;

drop function public.payment_reserve(text,text);
create function public.payment_reserve(p_sku text,p_key text,p_code text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.billing_catalog; o public.billing_orders; p public.billing_promotions; v_discount bigint:=0;begin
 perform picket_private.account_access();
 if p_key is null or length(p_key) not between 8 and 120 then raise exception 'Invalid idempotency key' using errcode='22023';end if;
 if p_code is not null and upper(p_code) !~ '^[A-Z0-9_-]{3,32}$' then raise exception 'Invalid promotion code' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select * into o from public.billing_orders where user_id=auth.uid() and idempotency_key=p_key;
 if found then
  if o.sku<>p_sku then raise exception 'Idempotency key reused' using errcode='22023';end if;
 else
  select * into c from public.billing_catalog where sku=p_sku and enabled;
  if not found then raise exception 'Plan unavailable' using errcode='22023';end if;
  if public.current_plan()<>'free' then raise exception 'Paid plan already active' using errcode='23514';end if;
  with closed as (
   update public.billing_orders set status='cancelled'
   where user_id=auth.uid() and status='pending' and payment_link_id is null returning id)
  insert into public.payment_events(order_id,event_type) select id,'superseded' from closed;
  -- Serialise slot accounting per promotion so a capped offer never oversells.
  p:=picket_private.promotion_for(p_sku,auth.uid(),p_code);
  if p.id is not null then
   perform pg_advisory_xact_lock(hashtextextended(p.id::text,1));
   p:=picket_private.promotion_for(p_sku,auth.uid(),p_code);
  end if;
  if p_code is not null and p.id is null then raise exception 'Promotion unavailable' using errcode='23514';end if;
  if p.id is not null then v_discount:=(c.amount*p.discount_percent)/100; end if;
  insert into public.billing_orders(user_id,sku,tier,months,amount,list_amount,discount_amount,promotion_id,idempotency_key)
  values(auth.uid(),c.sku,c.tier,c.months,c.amount-v_discount,c.amount,v_discount,p.id,p_key) returning * into o;
  insert into public.payment_events(order_id,event_type,details) values(o.id,'created',
   case when p.id is null then '{}'::jsonb else jsonb_build_object('promotion',p.id,'percent',p.discount_percent,'listAmount',c.amount) end);
  if p.id is not null then insert into public.promotion_redemptions(order_id,promotion_id,user_id,state) values(o.id,p.id,auth.uid(),'reserved'); end if;
 end if;
 return to_jsonb(o)||jsonb_build_object('supersede',coalesce((
  select jsonb_agg(jsonb_build_object('id',id,'order_code',order_code,'amount',amount,'payment_link_id',payment_link_id) order by created_at)
  from public.billing_orders where user_id=auth.uid() and status='pending' and payment_link_id is not null and id<>o.id),'[]'::jsonb));
end$$;
revoke all on function public.payment_reserve(text,text,text) from public,anon;
grant execute on function public.payment_reserve(text,text,text) to authenticated;

-- Redemption follows the order: paid consumes (even if paid late), expired
-- or cancelled releases the slot.
create function picket_private.promotion_order_trigger() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.promotion_redemptions set state=case when new.status in('paid','review') then 'consumed' else 'released' end,updated_at=now()
 where order_id=new.id and state<>case when new.status in('paid','review') then 'consumed' else 'released' end;
 return null;
end$$;
revoke all on function picket_private.promotion_order_trigger() from public,anon,authenticated;
create trigger promotion_order after update of status on public.billing_orders for each row when(new.status is distinct from old.status and new.status in('paid','review','expired','cancelled')) execute function picket_private.promotion_order_trigger();

-- Customer view: catalog shows the live offer per plan.
create or replace function public.payment_customer(p_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform picket_private.account_access();
 return jsonb_build_object('catalog',coalesce((select jsonb_agg(x order by x.amount) from(
   select c.sku,c.tier,c.months,c.amount-coalesce((c.amount*p.discount_percent)/100,0) as amount,c.amount as list_amount,
    case when p.id is null then null else jsonb_build_object('id',p.id,'name',p.name,'description',p.description,'percent',p.discount_percent,'endsAt',p.ends_at,
     'slotsLeft',case when p.max_redemptions is null then null else greatest(p.max_redemptions-picket_private.promotion_used(p.id),0) end) end as promotion
   from public.billing_catalog c left join lateral(select * from picket_private.promotion_for(c.sku,auth.uid(),null) q where q.id is not null and q.code is null) p on true
   where c.enabled)x),'[]'),
 'orders',coalesce((select jsonb_agg(x) from(select id,order_code,sku,tier,amount,list_amount,discount_amount,currency,status,payment_link_id,checkout_url,qr_code,created_at,expires_at from public.billing_orders where user_id=auth.uid() and(p_id is null or id=p_id)order by created_at desc,id limit 30)x),'[]'));
end$$;

-- Admin: list with live slot usage; save with optimistic revision + audit.
create function public.promotion_list() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform picket_private.permission_require('promotions.manage');
 return jsonb_build_object('catalog',coalesce((select jsonb_agg(x order by amount) from(select sku,tier,months,amount from public.billing_catalog where enabled)x),'[]'),
  'promotions',coalesce((select jsonb_agg(x order by x.created_at desc) from(
   select p.*,picket_private.promotion_used(p.id) as used,
    (select count(*) from public.promotion_redemptions r where r.promotion_id=p.id and r.state='consumed') as consumed,
    (select coalesce(jsonb_agg(a order by a.id desc),'[]') from(select id,actor,before_value,after_value,reason,created_at from public.promotion_audit where promotion_id=p.id order by id desc limit 20)a) as audit
   from public.billing_promotions p)x),'[]'));
end$$;

create function public.promotion_save(p_body jsonb,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare prev public.billing_promotions; v public.billing_promotions; v_id uuid:=(p_body->>'id')::uuid;begin
 perform picket_private.permission_require('promotions.manage',true);
 if p_reason is null or length(trim(p_reason)) not between 5 and 500 then raise exception 'Reason required' using errcode='22023';end if;
 if exists(select 1 from unnest(coalesce(array(select jsonb_array_elements_text(p_body->'skus')),array[]::text[])) s where s not in(select sku from public.billing_catalog)) then raise exception 'Unknown plan' using errcode='22023';end if;
 if v_id is null then
  insert into public.billing_promotions(name,description,code,discount_percent,skus,channels,starts_at,ends_at,max_redemptions,per_user_limit,enabled,priority,play_offer_id,created_by,updated_by)
  values(p_body->>'name',nullif(p_body->>'description',''),upper(nullif(p_body->>'code','')),(p_body->>'discountPercent')::int,
   array(select jsonb_array_elements_text(p_body->'skus')),coalesce(nullif(array(select jsonb_array_elements_text(p_body->'channels')),'{}'::text[]),array['payos']),
   coalesce((p_body->>'startsAt')::timestamptz,now()),(p_body->>'endsAt')::timestamptz,(p_body->>'maxRedemptions')::int,coalesce((p_body->>'perUserLimit')::int,1),
   coalesce((p_body->>'enabled')::boolean,false),coalesce((p_body->>'priority')::int,0),nullif(p_body->>'playOfferId',''),auth.uid(),auth.uid())
  returning * into v;
 else
  select * into prev from public.billing_promotions where id=v_id for update;
  if not found then raise exception 'Promotion not found' using errcode='P0002';end if;
  if prev.revision<>(p_body->>'revision')::int then raise exception 'Promotion changed by someone else' using errcode='PT409';end if;
  -- Lowering the cap below the slots already used would strand customers.
  if (p_body->>'maxRedemptions') is not null and (p_body->>'maxRedemptions')::int<picket_private.promotion_used(v_id) then raise exception 'Cap below slots in use' using errcode='22023';end if;
  update public.billing_promotions set name=p_body->>'name',description=nullif(p_body->>'description',''),code=upper(nullif(p_body->>'code','')),
   discount_percent=(p_body->>'discountPercent')::int,skus=array(select jsonb_array_elements_text(p_body->'skus')),
   channels=coalesce(nullif(array(select jsonb_array_elements_text(p_body->'channels')),'{}'::text[]),array['payos']),starts_at=coalesce((p_body->>'startsAt')::timestamptz,starts_at),
   ends_at=(p_body->>'endsAt')::timestamptz,max_redemptions=(p_body->>'maxRedemptions')::int,per_user_limit=coalesce((p_body->>'perUserLimit')::int,per_user_limit),
   enabled=coalesce((p_body->>'enabled')::boolean,enabled),priority=coalesce((p_body->>'priority')::int,priority),play_offer_id=nullif(p_body->>'playOfferId',''),
   revision=revision+1,updated_by=auth.uid(),updated_at=now()
  where id=v_id returning * into v;
 end if;
 insert into public.promotion_audit(promotion_id,actor,before_value,after_value,reason) values(v.id,auth.uid(),case when v_id is null then null else to_jsonb(prev) end,to_jsonb(v),trim(p_reason));
 return to_jsonb(v);
end$$;
revoke all on function public.promotion_list(),public.promotion_save(jsonb,text) from public,anon;
grant execute on function public.promotion_list(),public.promotion_save(jsonb,text) to authenticated;
