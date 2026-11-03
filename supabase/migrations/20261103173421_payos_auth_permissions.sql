-- New permissions are database data; legacy staff grants are migrated once.
create table public.permission_catalog(code text primary key, description text not null);
insert into public.permission_catalog
select section||'.'||operation, section||' / '||operation
from unnest(array['overview','users','billing','ocr','health','releases','incidents','tickets','audit','settings','integrations','acquisition','engagement','content','partners','staff','exports','security']) section
cross join unnest(array['read','write']) operation;
insert into public.permission_catalog values('revenue.read','Xem doanh thu'),('payments.read','Xem giao dịch thanh toán'),('permissions.manage','Quản lý quyền');
create table public.permission_groups(id uuid primary key default gen_random_uuid(),name text unique not null check(length(name) between 1 and 80),revision integer not null default 1);
create table public.permission_group_rules(group_id uuid references public.permission_groups on delete cascade,permission text references public.permission_catalog,primary key(group_id,permission));
create index permission_group_rules_permission on public.permission_group_rules(permission);
create table public.permission_group_members(user_id uuid references auth.users on delete cascade,group_id uuid references public.permission_groups on delete cascade,expires_at timestamptz,primary key(user_id,group_id));
create index permission_group_members_group on public.permission_group_members(group_id);
create table public.user_permissions(user_id uuid references auth.users on delete cascade,permission text references public.permission_catalog,allowed boolean not null,expires_at timestamptz,revision integer not null default 1,primary key(user_id,permission));
create index user_permissions_permission on public.user_permissions(permission);
create table public.permission_audit(id bigint generated always as identity primary key,actor uuid references auth.users on delete set null,target uuid references auth.users on delete set null,permission text not null,before_value jsonb,after_value jsonb,reason text not null,created_at timestamptz not null default now());
create index permission_audit_actor on public.permission_audit(actor);
create index permission_audit_target on public.permission_audit(target);
insert into public.permission_groups(name) values('operations'),('support'),('analyst'),('content');
insert into public.permission_group_rules
select g.id,c.code from public.permission_groups g cross join public.permission_catalog c
where split_part(c.code,'.',1)=any(case g.name
 when 'operations' then array['overview','users','billing','ocr','health','releases','incidents','tickets','audit','settings','integrations','acquisition','engagement','exports','security']
 when 'support' then array['overview','users','billing','tickets','audit','exports','security']
 when 'analyst' then array['overview','acquisition','engagement','ocr','integrations','exports','security']
 when 'content' then array['overview','content','partners','exports','security'] else array[]::text[] end);
insert into public.permission_group_members(user_id,group_id) select s.user_id,g.id from public.staff_members s join public.permission_groups g on g.name=s.role;
create function picket_private.sync_legacy_permission_group() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op<>'INSERT' then delete from public.permission_group_members where user_id=old.user_id and group_id in(select id from public.permission_groups where name in('operations','support','analyst','content'));end if;
 if tg_op<>'DELETE' then insert into public.permission_group_members(user_id,group_id) select new.user_id,id from public.permission_groups where name=new.role on conflict do nothing;end if;
 return null;
end$$;
revoke all on function picket_private.sync_legacy_permission_group() from public,anon,authenticated;
create trigger staff_permission_group after insert or update or delete on public.staff_members for each row execute function picket_private.sync_legacy_permission_group();

create function picket_private.has_permission(p_code text) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_account_active() and (
 exists(select 1 from public.staff_members where user_id=auth.uid() and role='owner') or
 coalesce((select allowed from public.user_permissions where user_id=auth.uid() and permission=p_code and (expires_at is null or expires_at>now())),
 exists(select 1 from public.permission_group_members m join public.permission_group_rules r using(group_id) where m.user_id=auth.uid() and r.permission=p_code and(m.expires_at is null or m.expires_at>now()))))
$$;
create or replace function picket_private.admin_require(p_capability text,p_sensitive boolean default false) returns void language plpgsql stable security definer set search_path='' as $$
begin
 if not picket_private.has_permission(p_capability||case when p_sensitive then '.write' else '.read' end) then raise exception 'Administrative permission required' using errcode='42501';end if;
 if p_sensitive and coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'aal','aal1')<>'aal2' then raise exception 'MFA verification required' using errcode='42501';end if;
end$$;
create function picket_private.permission_require(p_code text,p_sensitive boolean default false) returns void language plpgsql stable security definer set search_path='' as $$
begin
 if not picket_private.has_permission(p_code) then raise exception 'Permission required' using errcode='42501';end if;
 if p_sensitive and coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'aal','aal1')<>'aal2' then raise exception 'MFA verification required' using errcode='42501';end if;
end$$;
create or replace function picket_private.account_access() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r text; p jsonb;begin
 if auth.uid() is null or not public.is_account_active() then raise exception 'Active account required' using errcode='42501';end if;
 if not exists(select 1 from auth.users u where u.id=auth.uid() and(u.email_confirmed_at is not null or u.phone_confirmed_at is not null)) then raise exception 'Verified account required' using errcode='42501';end if;
 select role into r from public.staff_members where user_id=auth.uid();
 select coalesce(jsonb_agg(code order by code),'[]') into p from public.permission_catalog where picket_private.has_permission(code);
 return jsonb_build_object('staff',jsonb_array_length(p)>0,'role',r,'permissions',p,'mobileAllowed',true,'mfaVerified',coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'aal','aal1')='aal2');
end$$;
create function public.permission_update(p_user uuid,p_permission text,p_allowed boolean,p_expires timestamptz,p_revision integer,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare old public.user_permissions; result public.user_permissions;begin
 perform picket_private.permission_require('permissions.manage',true);
 if p_user is null or p_permission is null or p_reason is null or p_revision is null or p_user=auth.uid() or length(trim(p_reason)) not between 5 and 500 or p_allowed is null or (p_expires is not null and p_expires<=now()) then raise exception 'Invalid permission change' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into old from public.user_permissions where user_id=p_user and permission=p_permission;
 if coalesce(old.revision,0)<>p_revision then raise exception 'Permission changed; reload' using errcode='40001';end if;
 insert into public.user_permissions values(p_user,p_permission,p_allowed,p_expires,coalesce(old.revision,0)+1)
 on conflict(user_id,permission) do update set allowed=excluded.allowed,expires_at=excluded.expires_at,revision=excluded.revision returning * into result;
 insert into public.permission_audit(actor,target,permission,before_value,after_value,reason) values(auth.uid(),p_user,p_permission,to_jsonb(old),to_jsonb(result),p_reason);
 return to_jsonb(result);
end$$;
create function public.permission_list(p_user uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform picket_private.permission_require('permissions.manage');
 return jsonb_build_object('catalog',(select jsonb_agg(c order by code) from public.permission_catalog c),'rules',coalesce((select jsonb_agg(r order by permission) from public.user_permissions r where user_id=p_user),'[]'),'groups',coalesce((select jsonb_agg(g) from(select g.*,coalesce((select jsonb_agg(permission order by permission) from public.permission_group_rules where group_id=g.id),'[]') as permissions,exists(select 1 from public.permission_group_members where group_id=g.id and user_id=p_user and(expires_at is null or expires_at>now())) as member from public.permission_groups g order by name)g),'[]'));
end$$;
create function public.permission_group_update(p_body jsonb,p_reason text)returns jsonb language plpgsql security definer set search_path='' as $$
declare g public.permission_groups; gid uuid; target uuid;begin
 perform picket_private.permission_require('permissions.manage',true);
 if p_reason is null or length(trim(p_reason)) not between 5 and 500 then raise exception 'Reason required' using errcode='22023';end if;
 gid:=coalesce((p_body->>'id')::uuid,gen_random_uuid());
 perform pg_advisory_xact_lock(hashtextextended(gid::text,0));
 select * into g from public.permission_groups where id=gid;
 if p_body->>'action'='save' then
  if coalesce(g.revision,0) is distinct from (p_body->>'revision')::integer or jsonb_typeof(p_body->'permissions') is distinct from 'array' then raise exception 'Group changed; reload' using errcode='40001';end if;
  insert into public.permission_groups(id,name,revision) values(gid,p_body->>'name',coalesce(g.revision,0)+1) on conflict(id) do update set name=excluded.name,revision=excluded.revision;
  delete from public.permission_group_rules where group_id=gid;
  insert into public.permission_group_rules select gid,value from jsonb_array_elements_text(p_body->'permissions') on conflict do nothing;
 elsif p_body->>'action'='member' and g.id is not null then
  target:=(p_body->>'userId')::uuid;
  if target=auth.uid() then raise exception 'Cannot change own membership' using errcode='22023';end if;
  if (p_body->>'enabled')::boolean then insert into public.permission_group_members(user_id,group_id,expires_at) values(target,gid,(p_body->>'expiresAt')::timestamptz) on conflict(user_id,group_id) do update set expires_at=excluded.expires_at;
  else delete from public.permission_group_members where user_id=target and group_id=gid;end if;
 else raise exception 'Invalid group action' using errcode='22023';end if;
 insert into public.permission_audit(actor,target,permission,before_value,after_value,reason)values(auth.uid(),target,'group:'||gid::text,to_jsonb(g),p_body,p_reason);
 return jsonb_build_object('updated',true,'id',gid);
end$$;
revoke all on function public.permission_group_update(jsonb,text) from public,anon,authenticated;
grant execute on function public.permission_group_update(jsonb,text) to authenticated;

create table public.billing_catalog(sku text primary key,tier text not null check(tier in('plus','pro')),months integer not null check(months in(1,12)),amount bigint not null check(amount between 1000 and 9000000000000),enabled boolean not null default false);
-- Prices explicitly confirmed by the owner on 04/11/2026. Provider remains
-- disabled by PAYOS_ENABLED until credentials/webhook are configured.
insert into public.billing_catalog(sku,tier,months,amount,enabled) values
 ('picket_plus_monthly','plus',1,19000,true),
 ('picket_plus_yearly','plus',12,199000,true),
 ('picket_pro_monthly','pro',1,39000,true),
 ('picket_pro_yearly','pro',12,499000,true);
create sequence public.payos_order_code_seq start 1000000000 maxvalue 9007199254740991;
create table public.billing_orders(
 id uuid primary key default gen_random_uuid(), user_id uuid references auth.users on delete set null,
 order_code bigint unique not null default nextval('public.payos_order_code_seq'),sku text not null,tier text not null check(tier in('plus','pro')),months integer not null check(months in(1,12)),amount bigint not null check(amount>0),currency text not null default 'VND' check(currency='VND'),
 idempotency_key text not null,status text not null default 'pending' check(status in('pending','paid','cancelled','expired','review')),
 payment_link_id text unique,checkout_url text,qr_code text,created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '15 minutes',unique(user_id,idempotency_key));
create index billing_orders_user on public.billing_orders(user_id,created_at desc);
alter table public.billing_orders add column last_checked_at timestamptz;
create table public.payment_transactions(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.billing_orders,reference text unique not null,amount bigint not null check(amount>0),currency text not null check(currency='VND'),paid_at timestamptz not null,received_at timestamptz not null default now());
create index payment_transactions_order on public.payment_transactions(order_id);
create index payment_transactions_paid on public.payment_transactions(paid_at);
create table public.payment_events(id bigint generated always as identity primary key,order_id uuid references public.billing_orders,event_type text not null,details jsonb not null default '{}',created_at timestamptz not null default now());
create index payment_events_order on public.payment_events(order_id,id);
create table public.payment_entitlement_grants(order_id uuid primary key references public.billing_orders,user_id uuid references auth.users on delete set null,tier text not null check(tier in('plus','pro')),starts_at timestamptz not null,expires_at timestamptz not null,revoked_at timestamptz);
create index payment_entitlement_grants_user on public.payment_entitlement_grants(user_id,expires_at);

create function public.payment_reserve(p_sku text,p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.billing_catalog; o public.billing_orders;begin
 perform picket_private.account_access();
 if p_key is null or length(p_key) not between 8 and 120 then raise exception 'Invalid idempotency key' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select * into o from public.billing_orders where user_id=auth.uid() and idempotency_key=p_key;
 if found then
  if o.sku<>p_sku then raise exception 'Idempotency key reused' using errcode='22023';end if;
  return to_jsonb(o);
 end if;
 select * into c from public.billing_catalog where sku=p_sku and enabled;
 if not found then raise exception 'Plan unavailable' using errcode='22023';end if;
 if public.current_plan()<>'free' then raise exception 'Paid plan already active' using errcode='23514';end if;
 if exists(select 1 from public.billing_orders where user_id=auth.uid() and status='pending' and expires_at>now()) then raise exception 'A payment is already pending' using errcode='23514';end if;
 insert into public.billing_orders(user_id,sku,tier,months,amount,idempotency_key) values(auth.uid(),c.sku,c.tier,c.months,c.amount,p_key) returning * into o;
 insert into public.payment_events(order_id,event_type) values(o.id,'created');
 return to_jsonb(o);
end$$;
create function public.payment_attach(p_id uuid,p_data jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.billing_orders set payment_link_id=p_data->>'paymentLinkId',checkout_url=p_data->>'checkoutUrl',qr_code=p_data->>'qrCode' where id=p_id and payment_link_id is null;
 if found then insert into public.payment_events(order_id,event_type) values(p_id,'checkout_ready');end if;
end$$;
create function public.payment_state(p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_status not in('CANCELLED','EXPIRED') then return;end if;
 update public.billing_orders set status=lower(p_status) where id=p_id and status='pending';
 if found then insert into public.payment_events(order_id,event_type) values(p_id,lower(p_status));end if;
end$$;
create function public.payment_receive(p_data jsonb,p_account text) returns jsonb language plpgsql security definer set search_path='' as $$
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
 insert into public.payment_events(order_id,event_type,details) values(o.id,'payment_received',jsonb_build_object('reference',ref,'amount',(p_data->>'amount')::bigint));
 select sum(amount) into total from public.payment_transactions where order_id=o.id;
 -- Late, excess, partial or conflicting purchases remain visible for review.
 if total=o.amount and o.status='pending' and payment_time<=o.expires_at and o.user_id is not null then
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
create or replace function public.current_plan() returns text language sql stable security definer set search_path='' as $$
 select coalesce((select tier from(
 select tier from public.play_purchases where user_id=auth.uid() and active and expires_at>now() and verified_at>now()-interval '24 hours'
 union all select tier from public.plan_grants where user_id=auth.uid() and expires_at>now()
 union all select tier from public.payment_entitlement_grants where user_id=auth.uid() and starts_at<=now() and expires_at>now() and revoked_at is null
 )p where public.is_account_active() order by case tier when 'pro' then 2 else 1 end desc limit 1),'free')
$$;
create function public.payment_dashboard(p_filters jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare f timestamptz; t timestamptz; bucket text; v_period text; local_start timestamp;begin
 perform picket_private.permission_require('revenue.read');
 v_period:=coalesce(p_filters->>'period','month');
 if v_period not in('day','month','year','custom') then raise exception 'Invalid revenue period' using errcode='22023';end if;
 local_start:=date_trunc(case when v_period='custom' then 'month' else v_period end,now() at time zone 'Asia/Ho_Chi_Minh');
 f:=case when p_filters->>'from' is null then local_start at time zone 'Asia/Ho_Chi_Minh' when p_filters->>'from' ~ '(Z|[+-][0-9]{2}:[0-9]{2})$' then(p_filters->>'from')::timestamptz else(p_filters->>'from')::timestamp at time zone 'Asia/Ho_Chi_Minh' end;
 t:=case when p_filters->>'to' is null then(local_start+case v_period when 'day' then interval '1 day' when 'year' then interval '1 year' else interval '1 month' end)at time zone 'Asia/Ho_Chi_Minh' when p_filters->>'to' ~ '(Z|[+-][0-9]{2}:[0-9]{2})$' then(p_filters->>'to')::timestamptz else(p_filters->>'to')::timestamp at time zone 'Asia/Ho_Chi_Minh' end;
 bucket:=coalesce(p_filters->>'bucket','day');
 if t<=f or t-f>interval '5 years' or bucket not in('day','month','year') then raise exception 'Invalid revenue range' using errcode='22023';end if;
 return jsonb_build_object('currency','VND','provider','payos','from',f,'to',t,'total',coalesce((select sum(amount) from public.payment_transactions where paid_at>=f and paid_at<t),0),'series',coalesce((select jsonb_agg(x order by period) from(select date_trunc(bucket,paid_at at time zone 'Asia/Ho_Chi_Minh') as period,sum(amount) as amount,count(*) as transactions from public.payment_transactions where paid_at>=f and paid_at<t group by 1)x),'[]'),'coverage','PayOS receipts only; refunds and Google Play earnings are separate sources');
end$$;
create function public.payment_orders(p_id uuid default null,p_status text default null,p_before timestamptz default null,p_before_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform picket_private.permission_require('payments.read');
 return jsonb_build_object('orders',coalesce((select jsonb_agg(x) from(select id,user_id,order_code,sku,amount,currency,status,created_at,expires_at from public.billing_orders where(p_id is null or id=p_id)and(p_status is null or status=p_status)and(p_before is null or created_at<p_before or(created_at=p_before and p_before_id is not null and id<p_before_id))order by created_at desc,id limit 50)x),'[]'),'events',case when p_id is null then '[]'::jsonb else coalesce((select jsonb_agg(x order by id) from(select id,event_type,details,created_at from public.payment_events where order_id=p_id order by id limit 200)x),'[]') end);
end$$;

-- No public writes. Customer reads are scoped; finance data uses capability RPCs.
do $$declare t text;begin
 foreach t in array array['permission_catalog','permission_groups','permission_group_rules','permission_group_members','user_permissions','permission_audit','billing_catalog','billing_orders','payment_transactions','payment_events','payment_entitlement_grants'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end$$;
grant select on public.billing_orders,public.billing_catalog to authenticated;
create policy billing_order_owner on public.billing_orders for select to authenticated using(user_id=(select auth.uid()) and(select public.is_account_active()));
create policy billing_catalog_read on public.billing_catalog for select to authenticated using(enabled and(select public.is_account_active()));
grant usage,select on sequence public.payos_order_code_seq,public.payment_events_id_seq,public.permission_audit_id_seq to service_role;
revoke all on function picket_private.has_permission(text),picket_private.permission_require(text,boolean) from public,anon,authenticated;
revoke all on function public.permission_update(uuid,text,boolean,timestamptz,integer,text),public.permission_list(uuid),public.payment_reserve(text,text),public.payment_dashboard(jsonb),public.payment_orders(uuid,text,timestamptz,uuid),public.payment_attach(uuid,jsonb),public.payment_state(uuid,text),public.payment_receive(jsonb,text) from public,anon,authenticated;
grant execute on function public.permission_update(uuid,text,boolean,timestamptz,integer,text),public.permission_list(uuid),public.payment_reserve(text,text),public.payment_dashboard(jsonb),public.payment_orders(uuid,text,timestamptz,uuid) to authenticated;
grant execute on function public.payment_attach(uuid,jsonb),public.payment_state(uuid,text),public.payment_receive(jsonb,text) to service_role;

create function public.payment_customer(p_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform picket_private.account_access();
 return jsonb_build_object('catalog',coalesce((select jsonb_agg(x) from(select sku,tier,months,amount from public.billing_catalog where enabled order by amount)x),'[]'),
 'orders',coalesce((select jsonb_agg(x) from(select id,order_code,sku,tier,amount,currency,status,payment_link_id,checkout_url,qr_code,created_at,expires_at from public.billing_orders where user_id=auth.uid() and(p_id is null or id=p_id)order by created_at desc,id limit 30)x),'[]'));
end$$;
revoke all on function public.payment_customer(uuid) from public,anon,authenticated;
grant execute on function public.payment_customer(uuid) to authenticated;
create function public.payment_reconcile_queue()returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('orders',coalesce((select jsonb_agg(x) from(select * from public.billing_orders where payment_link_id is not null and status in('pending','review','expired','cancelled') and created_at>now()-interval '30 days' and(last_checked_at is null or last_checked_at<now()-interval '5 minutes') order by last_checked_at nulls first,created_at limit 30)x),'[]'))
$$;
create function public.payment_checked(p_id uuid)returns jsonb language plpgsql security definer set search_path='' as $$begin update public.billing_orders set last_checked_at=now() where id=p_id;return jsonb_build_object('updated',found);end$$;
revoke all on function public.payment_reconcile_queue(),public.payment_checked(uuid) from public,anon,authenticated;
grant execute on function public.payment_reconcile_queue(),public.payment_checked(uuid) to service_role;

-- PIN is a trusted-browser session unlock, never a replacement password.
create table picket_private.quick_login_devices(
 device_hash text primary key check(length(device_hash)=64),user_id uuid not null references auth.users on delete cascade,
 session_id uuid not null references auth.sessions on delete cascade,verifier text not null check(length(verifier)=64),cipher text not null,
 expires_at timestamptz not null default now()+interval '30 days',locked boolean not null default true,
 failures integer not null default 0,window_at timestamptz not null default now(),busy_until timestamptz,lease uuid);
create index quick_login_user on picket_private.quick_login_devices(user_id);
create index quick_login_session on picket_private.quick_login_devices(session_id);
alter table picket_private.quick_login_devices enable row level security;
revoke all on picket_private.quick_login_devices from public,anon,authenticated,service_role;
create function public.quick_login_save(p_user uuid,p_session uuid,p_device text,p_verifier text,p_cipher text)returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from auth.sessions s join auth.users u on u.id=s.user_id where s.id=p_session and s.user_id=p_user and(u.banned_until is null or u.banned_until<=now())) or exists(select 1 from public.admin_revoked_sessions where session_id=p_session) then raise exception 'Active session required' using errcode='42501';end if;
 delete from picket_private.quick_login_devices where session_id=p_session;
 insert into picket_private.quick_login_devices(device_hash,user_id,session_id,verifier,cipher) values(p_device,p_user,p_session,p_verifier,p_cipher);
 return jsonb_build_object('saved',true);
end$$;
create function public.quick_login_attempt(p_device text)returns jsonb language plpgsql security definer set search_path='' as $$
declare d picket_private.quick_login_devices;begin
 select * into d from picket_private.quick_login_devices where device_hash=p_device for update;
 if not found or d.expires_at<=now() or not d.locked or d.busy_until>now() or (d.failures>=5 and d.window_at>now()-interval '15 minutes') or not exists(select 1 from auth.sessions s join auth.users u on u.id=s.user_id where s.id=d.session_id and s.user_id=d.user_id and(u.banned_until is null or u.banned_until<=now())) or exists(select 1 from public.admin_revoked_sessions where session_id=d.session_id) then return jsonb_build_object('allowed',false);end if;
 update picket_private.quick_login_devices set failures=case when window_at<=now()-interval '15 minutes' then 1 else failures+1 end,window_at=case when window_at<=now()-interval '15 minutes' then now() else window_at end,busy_until=now()+interval '30 seconds',lease=gen_random_uuid() where device_hash=p_device returning * into d;
 return jsonb_build_object('allowed',true,'userId',d.user_id,'sessionId',d.session_id,'cipher',d.cipher,'verifier',d.verifier,'lease',d.lease);
end$$;
create function public.quick_login_lock(p_device text,p_user uuid,p_session uuid,p_cipher text)returns jsonb language plpgsql security definer set search_path='' as $$
begin
 update picket_private.quick_login_devices d set cipher=p_cipher,locked=true,busy_until=null,lease=null where device_hash=p_device and user_id=p_user and session_id=p_session and expires_at>now() and not locked and exists(select 1 from auth.sessions s join auth.users u on u.id=s.user_id where s.id=p_session and s.user_id=p_user and(u.banned_until is null or u.banned_until<=now())) and not exists(select 1 from public.admin_revoked_sessions where session_id=p_session);
 return jsonb_build_object('updated',found);
end$$;
revoke all on function public.quick_login_lock(text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.quick_login_lock(text,uuid,uuid,text) to service_role;
create function public.quick_login_finish(p_device text,p_lease uuid,p_cipher text)returns jsonb language plpgsql security definer set search_path='' as $$
begin
 update picket_private.quick_login_devices set cipher=coalesce(p_cipher,cipher),locked=case when p_cipher is null then locked else false end,failures=case when p_cipher is null then failures else 0 end,busy_until=null,lease=null where device_hash=p_device and lease=p_lease and busy_until>now();
 return jsonb_build_object('updated',found);
end$$;
create function public.quick_login_revoke(p_device text)returns jsonb language plpgsql security definer set search_path='' as $$
begin
 -- Preserve a lock until its underlying session is revoked as well.
 insert into public.admin_revoked_sessions(session_id,user_id) select session_id,user_id from picket_private.quick_login_devices where device_hash=p_device on conflict(session_id) do nothing;
 delete from picket_private.quick_login_devices where device_hash=p_device;
 return jsonb_build_object('revoked',true);
end$$;
revoke all on function public.quick_login_save(uuid,uuid,text,text,text),public.quick_login_attempt(text),public.quick_login_finish(text,uuid,text),public.quick_login_revoke(text) from public,anon,authenticated;
grant execute on function public.quick_login_save(uuid,uuid,text,text,text),public.quick_login_attempt(text),public.quick_login_finish(text,uuid,text),public.quick_login_revoke(text) to service_role;
create or replace function public.is_account_active()returns boolean language sql stable security definer set search_path=''as $$
 select exists(select 1 from auth.users where id=auth.uid()and(banned_until is null or banned_until<=now()))
 and not exists(select 1 from public.admin_revoked_sessions where user_id=auth.uid()and session_id=nullif(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'session_id','')::uuid)
 and(nullif(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'session_id','')is null or exists(select 1 from auth.sessions where id=(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'session_id')::uuid and user_id=auth.uid()))
 and not exists(select 1 from picket_private.quick_login_devices where user_id=auth.uid() and session_id=nullif(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'session_id','')::uuid and locked)
$$;

-- Preserve existing portal behavior while adding verified phone identities,
-- phone search and database capabilities to the existing operations.
insert into public.permission_catalog values('billing.financial.read','Xem báo cáo tài chính Play'),('settings.retention.write','Sửa chính sách lưu dữ liệu');
insert into public.permission_group_rules select id,'billing.financial.read' from public.permission_groups where name='operations';
create or replace function picket_private.admin_user_filter(p_user auth.users,p_filters jsonb)returns boolean
language plpgsql stable security definer set search_path=''as $$
declare v_tier text;v_effective text;begin
 v_tier:=coalesce(p_filters->>'tier','');
 if v_tier not in('','free','plus','pro')or length(coalesce(p_filters->>'version',''))>40 then raise exception 'Invalid user filter'using errcode='22023';end if;
 if coalesce(p_filters->>'createdFrom','')<>''and p_user.created_at<((p_filters->>'createdFrom')::date::timestamp at time zone 'Asia/Ho_Chi_Minh')then return false;end if;
 if coalesce(p_filters->>'createdTo','')<>''and p_user.created_at>=(((p_filters->>'createdTo')::date+1)::timestamp at time zone 'Asia/Ho_Chi_Minh')then return false;end if;
 if coalesce(p_filters->>'version','')<>''and coalesce((select version from public.admin_user_activity where user_id=p_user.id),'')<>p_filters->>'version'then return false;end if;
 if v_tier<>''then
  select tier into v_effective from(select tier from public.play_purchases where user_id=p_user.id and active and expires_at>now()and verified_at>now()-interval '24 hours'union all select tier from public.plan_grants where user_id=p_user.id and expires_at>now() union all select tier from public.payment_entitlement_grants where user_id=p_user.id and starts_at<=now() and expires_at>now() and revoked_at is null)p order by case tier when'pro'then 3 when'plus'then 2 else 1 end desc limit 1;
  if coalesce(v_effective,'free')<>v_tier then return false;end if;
 end if;
 return true;
end $$;

create or replace function picket_private.admin_portal(p_section text,p_filters jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' set work_mem='16MB' as $$
declare v_page integer:=coalesce((p_filters->>'page')::integer,0);
 v_days integer:=coalesce((p_filters->>'days')::integer,30);
 v_since timestamptz; v_result jsonb; v_search text:=lower(trim(coalesce(p_filters->>'search','')));
 v_status text:=coalesce(p_filters->>'status',''); v_kind text;
begin
 perform picket_private.admin_require(p_section);
 if v_page<0 or v_page>10000 or v_days not in (7,30,90) or length(v_search)>160 or jsonb_typeof(p_filters)<>'object' then
  raise exception 'Invalid filters' using errcode='22023'; end if;
 v_since:=(date_trunc('day',now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh')-(v_days-1)*interval '1 day';
 if p_section='overview' then
  select jsonb_build_object('totalUsers',(select count(*) from auth.users u where not exists(select 1 from public.staff_members s where s.user_id=u.id)),
   'newUsers',(select count(*) from auth.users u where u.created_at>=v_since and not exists(select 1 from public.staff_members s where s.user_id=u.id)),
   'newUsersPrevious',(select count(*)from auth.users u where u.created_at>=v_since-v_days*interval '1 day'and u.created_at<now()-v_days*interval '1 day'and not exists(select 1 from public.staff_members s where s.user_id=u.id)),
   'health',coalesce((select jsonb_agg(x)from(select distinct on(component)component,status,checked_at from public.admin_health_samples order by component,checked_at desc,id desc)x),'[]'::jsonb),
   'verifiedUsers',(select count(*) from auth.users u where (email_confirmed_at is not null or phone_confirmed_at is not null) and not exists(select 1 from public.staff_members s where s.user_id=u.id)),
   'paidUsers',(select count(distinct user_id) from public.play_purchases where active and expires_at>now()and verified_at>now()-interval '24 hours'and is_test=false),
   'testUsers',(select count(distinct user_id)from public.play_purchases where active and expires_at>now()and verified_at>now()-interval '24 hours'and is_test=true),
   'unknownPurchaseUsers',(select count(distinct user_id)from public.play_purchases where active and expires_at>now()and verified_at>now()-interval '24 hours'and is_test is null),
   'openTickets',(select count(*) from public.admin_tickets where status in ('open','in_progress')),
   'openIncidents',(select count(*) from public.admin_records where kind='incident' and status in ('open','investigating')),
   'dailyUsers',coalesce((select jsonb_agg(x) from(select d.day::date as day,coalesce(g.value,0)as value from generate_series((v_since at time zone 'Asia/Ho_Chi_Minh')::date,(now()at time zone 'Asia/Ho_Chi_Minh')::date,interval '1 day')d(day)left join(select(u.created_at at time zone 'Asia/Ho_Chi_Minh')::date as day,count(*)as value from auth.users u where u.created_at>=v_since and not exists(select 1 from public.staff_members s where s.user_id=u.id)group by 1)g on g.day=d.day::date order by d.day)x),'[]'::jsonb)) into v_result;
 elsif p_section in ('users','user') then
  if coalesce(p_filters->>'sort','newest')not in('newest','oldest','email')then raise exception 'Invalid sort'using errcode='22023';end if;
  select jsonb_build_object('total',count(*),'rows',coalesce(jsonb_agg(x order by case when p_filters->>'sort'='oldest'then x.created_at end asc,case when p_filters->>'sort'='email'then lower(x.email)end asc,case when coalesce(p_filters->>'sort','newest')='newest'then x.created_at end desc,x.id),'[]'::jsonb)) into v_result
  from (select u.id,u.email,u.phone,u.created_at,u.phone_confirmed_at,u.email_confirmed_at,u.last_sign_in_at,u.banned_until,s.role,(select tier from public.payment_entitlement_grants pe where pe.user_id=u.id and pe.starts_at<=now() and pe.expires_at>now() and pe.revoked_at is null order by case tier when 'pro' then 2 else 1 end desc limit 1) as payos_tier,
   (select a.last_seen_at from public.admin_user_activity a where a.user_id=u.id)as last_activity_at,
   (select a.version from public.admin_user_activity a where a.user_id=u.id)as app_version,
   coalesce((select pp.tier from public.play_purchases pp where pp.user_id=u.id and pp.active and pp.expires_at>now()and pp.verified_at>now()-interval '24 hours' order by case pp.tier when 'pro' then 2 else 1 end desc limit 1),'free') as play_tier,
   (select jsonb_build_object('tier',pg.tier,'expires_at',pg.expires_at) from public.plan_grants pg where pg.user_id=u.id and pg.expires_at>now()) as grant
   from auth.users u left join public.staff_members s on s.user_id=u.id
   where (case when p_filters ?| array['tier','version','createdFrom','createdTo']then picket_private.admin_user_filter(u,p_filters)else true end)and (v_search='' or strpos(lower(coalesce(u.email,'')),v_search)>0 or strpos(coalesce(u.phone,''),v_search)>0 or u.id::text=v_search)
    and (p_filters->>'userId' is null or u.id=(p_filters->>'userId')::uuid)
    and (v_status='' or (v_status='suspended' and u.banned_until>now()) or (v_status='active' and (u.banned_until is null or u.banned_until<=now())))
   order by case when p_filters->>'sort'='oldest'then u.created_at end asc,case when p_filters->>'sort'='email'then lower(u.email)end asc,case when coalesce(p_filters->>'sort','newest')='newest'then u.created_at end desc,u.id limit 25 offset v_page*25) x;
  -- Total must describe the full filtered result, not just the current page.
  v_result:=jsonb_set(v_result,'{total}',to_jsonb((select count(*) from auth.users u where (case when p_filters ?| array['tier','version','createdFrom','createdTo']then picket_private.admin_user_filter(u,p_filters)else true end)and
   (v_search='' or strpos(lower(coalesce(u.email,'')),v_search)>0 or strpos(coalesce(u.phone,''),v_search)>0 or u.id::text=v_search)
   and(p_filters->>'userId' is null or u.id=(p_filters->>'userId')::uuid)
   and(v_status='' or(v_status='suspended' and u.banned_until>now())or(v_status='active' and(u.banned_until is null or u.banned_until<=now()))))));
 if p_filters->>'userId'is not null then
   v_result:=v_result||jsonb_build_object(
    'timeline',coalesce((select jsonb_agg(x)from(select action,reason,created_at,details from public.admin_audit where target=p_filters->>'userId'order by created_at desc limit 50)x),'[]'::jsonb),
    'tickets',coalesce((select jsonb_agg(x)from(select id,title,status,priority,updated_at from public.admin_tickets where target_user=(p_filters->>'userId')::uuid order by updated_at desc limit 25)x),'[]'::jsonb),
    'quota',coalesce((select jsonb_agg(x)from(select date_trunc('day',created_at)as day,count(*)as attempts,count(*)filter(where success)as successful from public.ocr_events where user_id=(p_filters->>'userId')::uuid and created_at>=v_since group by 1 order by 1 desc)x),'[]'::jsonb));
 end if;
 elsif p_section in ('acquisition','engagement') then
  select jsonb_build_object('events',coalesce((select jsonb_agg(x) from(select (created_at at time zone 'Asia/Ho_Chi_Minh')::date as day,event,channel,count(*) as events,count(distinct session_id) as sessions,count(distinct user_id) as users from public.app_analytics_events where created_at>=v_since and environment='production'and event in('landing_view','apk_click','app_open','first_open') group by 1,2,3 order by 1)x),'[]'::jsonb),
   'metrics',coalesce((select jsonb_agg(x) from(select source,metric,day,sum(value) as value,source_timezone,max(observed_at) as observed_at from public.admin_daily_metrics where day>=v_since::date and environment='production'and source in('google_play_installs','apk_access') group by source,metric,day,source_timezone order by day)x),'[]'::jsonb),
   'activity',(select jsonb_build_object('dau',count(*) filter(where last_activity>=now()-interval '1 day'),'wau',count(*) filter(where last_activity>=now()-interval '7 days'),'mau',count(*))from(select last_meaningful_at as last_activity from public.admin_user_activity a where last_meaningful_at>=now()-interval '30 days'and not exists(select 1 from public.staff_members s where s.user_id=a.user_id))a),
   'integrations',coalesce((select jsonb_agg(r) from public.admin_integration_runs r),'[]'::jsonb),
   'firstObservedAt',(select min(created_at) from public.app_analytics_events where environment='production')) into v_result;
 elsif p_section='billing' then
  select jsonb_build_object('rows',coalesce((select jsonb_agg(x) from(select user_id,product_id,tier,expires_at,active,verified_at,is_test,subscription_state,acknowledgement_state,metadata_verified_at from public.play_purchases order by verified_at desc,user_id limit 25 offset v_page*25)x),'[]'::jsonb),'total',(select count(*) from public.play_purchases),
   'grants',coalesce((select jsonb_agg(x) from(select user_id,tier,expires_at,granted_by from public.plan_grants order by expires_at desc limit 25 offset v_page*25)x),'[]'::jsonb)) into v_result;
 elsif p_section='ocr' then
  select jsonb_build_object('rows',coalesce(jsonb_agg(x),'[]'::jsonb)) into v_result from(select (created_at at time zone 'Asia/Ho_Chi_Minh')::date as day,count(*) as scans,count(*) filter(where success) as successful,round(avg(duration_ms)) as average_ms,percentile_disc(0.95) within group(order by duration_ms) as p95_ms from public.ocr_events where created_at>=v_since group by 1 order by 1 desc)x;
 elsif p_section='audit' then
  select jsonb_build_object('rows',coalesce((select jsonb_agg(x) from(select id,actor,action,target,reason,created_at,request_id,details from public.admin_audit where created_at>=v_since and(v_search='' or strpos(lower(action),v_search)>0 or target=v_search) order by id desc limit 25 offset v_page*25)x),'[]'::jsonb),'total',(select count(*) from public.admin_audit where created_at>=v_since and(v_search='' or strpos(lower(action),v_search)>0 or target=v_search))) into v_result;
 elsif p_section='tickets' then
  select jsonb_build_object('rows',coalesce((select jsonb_agg(x) from(select * from public.admin_tickets where(v_status='' or status=v_status)and(v_search='' or strpos(lower(title),v_search)>0) order by updated_at desc,id limit 25 offset v_page*25)x),'[]'::jsonb),'total',(select count(*) from public.admin_tickets where(v_status='' or status=v_status)and(v_search='' or strpos(lower(title),v_search)>0))) into v_result;
 elsif p_section in ('incidents','releases','content') then
  v_kind:=case p_section when 'incidents' then 'incident' when 'releases' then 'release' else 'content' end;
  select jsonb_build_object('rows',coalesce((select jsonb_agg(x) from(select * from public.admin_records where kind=v_kind and(v_status='' or status=v_status)and(v_search='' or strpos(lower(title),v_search)>0) order by updated_at desc,id limit 25 offset v_page*25)x),'[]'::jsonb),'total',(select count(*) from public.admin_records where kind=v_kind and(v_status='' or status=v_status)and(v_search='' or strpos(lower(title),v_search)>0))) into v_result;
 elsif p_section='health' then
  select jsonb_build_object('rows',coalesce((select jsonb_agg(x) from(select distinct on(component) component,status,latency_ms,message,checked_at from public.admin_health_samples order by component,checked_at desc)x),'[]'::jsonb),'history',coalesce((select jsonb_agg(x) from(select component,status,latency_ms,checked_at from public.admin_health_samples where checked_at>now()-interval '1 day' order by checked_at desc limit 300)x),'[]'::jsonb)) into v_result;
 elsif p_section='integrations' then select jsonb_build_object('rows',coalesce(jsonb_agg(r),'[]'::jsonb)) into v_result from public.admin_integration_runs r;
 elsif p_section='staff' then select jsonb_build_object('rows',coalesce(jsonb_agg(x),'[]'::jsonb)) into v_result from(select s.user_id,s.role,u.email from public.staff_members s join auth.users u on u.id=s.user_id order by s.role,s.user_id)x;
 elsif p_section='settings' then select jsonb_build_object('settings',to_jsonb(s)) into v_result from public.app_settings s where id;
 elsif p_section='partners' then select jsonb_build_object('rows',coalesce(jsonb_agg(x),'[]'::jsonb)) into v_result from(select id,title,body,url,active,starts_at,ends_at,row_version from public.partner_ads order by created_at desc limit 100)x;
 else raise exception 'Unknown administrative section' using errcode='22023';
 end if;
 if p_section='tickets'then v_result:=v_result||jsonb_build_object('comments',coalesce((select jsonb_agg(c)from(select id,ticket_id,author,body,created_at from public.admin_ticket_comments where ticket_id in(select (value->>'id')::uuid from jsonb_array_elements(v_result->'rows'))order by created_at desc limit 200)c),'[]'::jsonb));end if;
 if p_section='content'then v_result:=v_result||jsonb_build_object('lessons',coalesce((select jsonb_agg(x)from(select lesson_id,content_version,published from public.learning_answer_keys order by lesson_id,content_version)x),'[]'::jsonb));end if;
 if p_section='engagement'then
  v_result:=v_result||jsonb_build_object('versions',coalesce((select jsonb_agg(x)from(select version,count(*)as users from(select version from public.admin_user_activity a where last_seen_at>=v_since and version<>''and not exists(select 1 from public.staff_members s where s.user_id=a.user_id))a group by version)x),'[]'::jsonb),
   'retention',coalesce((select jsonb_agg(x)from(select n as day,count(*)filter(where first_day<=(now()at time zone'Asia/Ho_Chi_Minh')::date-n)as eligible,count(*)filter(where first_day<=(now()at time zone'Asia/Ho_Chi_Minh')::date-n and exists(select 1 from public.app_analytics_events e where e.user_id=c.user_id and e.event='meaningful_action'and e.environment='production'and(e.created_at at time zone'Asia/Ho_Chi_Minh')::date=c.first_day+n))as retained from(values(1),(7),(30))d(n)cross join(select user_id,(first_open_at at time zone'Asia/Ho_Chi_Minh')::date as first_day from public.admin_user_activity a where first_open_at>=v_since and not exists(select 1 from public.staff_members s where s.user_id=a.user_id))c group by n order by n)x),'[]'::jsonb),
   'funnel',jsonb_build_object('registered',(select count(*)from auth.users u where created_at>=v_since and not exists(select 1 from public.staff_members s where s.user_id=u.id)),'verified',(select count(*)from auth.users u where created_at>=v_since and (email_confirmed_at is not null or phone_confirmed_at is not null) and not exists(select 1 from public.staff_members s where s.user_id=u.id)),'observedActive',(select count(*)from public.admin_user_activity a where last_meaningful_at>=v_since and not exists(select 1 from public.staff_members s where s.user_id=a.user_id))));
 end if;
 if p_section in('health','ocr')then v_result:=v_result||jsonb_build_object('diagnostics',coalesce((select jsonb_agg(x)from(select metric,day,value,observed_at from public.admin_daily_metrics where source='backend_diagnostics'and day>=v_since::date order by day desc limit 300)x),'[]'::jsonb));end if;
 if p_section='health'then v_result:=v_result||jsonb_build_object('staleMinutes',(select stale_minutes from public.app_settings where id),
 'vitals',coalesce((select jsonb_agg(m)from(select metric,day,value,source_timezone,observed_at from public.admin_daily_metrics where source='google_play_vitals'and day>=v_since::date order by day desc)m),'[]'::jsonb),
 'queue',coalesce((select jsonb_agg(x)from(select'ocr'as queue,status,count(*)as jobs from public.ocr_fallback_jobs group by status union all select'learning'as queue,status,count(*)as jobs from public.learning_ai_jobs group by status)x),'[]'::jsonb),
 'probeSuccess',coalesce((select jsonb_agg(x)from(select component,count(*)as samples,count(*)filter(where status='ok')as successful from public.admin_health_samples where checked_at>now()-interval '1 day'group by component)x),'[]'::jsonb));end if;
 if p_section='billing'and picket_private.has_permission('billing.financial.read')then v_result:=v_result||jsonb_build_object('financialAccess',true,'sales',coalesce((select jsonb_agg(m)from(select day,metric,dimension as currency,value,observed_at from public.admin_daily_metrics where source='google_play_financial'and day>=v_since::date order by day desc)m),'[]'::jsonb));end if;
 return coalesce(v_result,'{}'::jsonb)||jsonb_build_object('asOf',now(),'days',v_days,'page',v_page,'timezone','Asia/Ho_Chi_Minh');
end $$;

create or replace function picket_private.admin_mutate(p_action text,p_body jsonb,p_reason text,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_cap text; v_id uuid; v_fingerprint text; v_saved public.admin_mutation_requests; v_result jsonb;
 v_version integer; v_role text; v_target uuid; v_kind text; v_before jsonb;
begin
 v_cap:=case p_action when'revoke_sessions'then'users'when 'ticket' then 'tickets' when 'comment' then 'tickets'when'review_content'then'content'when 'incident' then 'incidents' when 'release' then 'releases' when 'staff' then 'staff' when 'settings' then 'settings' when 'partner' then 'partners' when 'grant' then 'billing' when 'content' then 'content' else null end;
 if v_cap is null then raise exception 'Invalid action' using errcode='22023'; end if;
 perform picket_private.admin_require(v_cap,true);
 if p_request_id is null or p_reason is null or length(trim(p_reason)) not between 5 and 500 or jsonb_typeof(p_body)<>'object' or octet_length(p_body::text)>20000 then raise exception 'Reason and valid request required' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
 v_fingerprint:=md5(p_action||p_body::text||p_reason);
 select * into v_saved from public.admin_mutation_requests where actor=auth.uid() and request_id=p_request_id;
 if found then
  if v_saved.fingerprint<>v_fingerprint then raise exception 'Idempotency key reused' using errcode='22023'; end if;
  return v_saved.result;
 end if;
 v_id:=coalesce((p_body->>'id')::uuid,(p_body->>'userId')::uuid,gen_random_uuid());
 v_before:=picket_private.admin_snapshot(p_action,v_id);
 if p_action='ticket' then
  if p_body->>'assignee'is not null and not exists(select 1 from public.staff_members where user_id=(p_body->>'assignee')::uuid)then raise exception 'Assignee must be staff'using errcode='22023';end if;
  if p_body->>'id' is null then
   insert into public.admin_tickets(id,title,body,status,priority,category,target_user,assignee) values(v_id,p_body->>'title',coalesce(p_body->>'body',''),coalesce(p_body->>'status','open'),coalesce(p_body->>'priority','normal'),coalesce(p_body->>'category','support'),(p_body->>'targetUser')::uuid,(p_body->>'assignee')::uuid);
  else
   update public.admin_tickets set title=p_body->>'title',body=coalesce(p_body->>'body',''),status=p_body->>'status',priority=p_body->>'priority',category=coalesce(p_body->>'category','support'),target_user=(p_body->>'targetUser')::uuid,assignee=(p_body->>'assignee')::uuid,row_version=row_version+1,updated_at=now() where id=v_id and row_version=(p_body->>'expectedVersion')::integer;
   if not found then raise exception 'Record changed; reload before saving' using errcode='40001'; end if;
  end if;
 elsif p_action='revoke_sessions'then
  v_target:=(p_body->>'userId')::uuid;
  if v_target=auth.uid()then raise exception 'Use local sign out for your own session'using errcode='23514';end if;
  insert into public.admin_revoked_sessions(session_id,user_id)select id,user_id from auth.sessions where user_id=v_target on conflict(session_id)do nothing;
  v_id:=v_target;
 elsif p_action='comment'then
  insert into public.admin_ticket_comments(ticket_id,author,body)values((p_body->>'ticketId')::uuid,auth.uid(),p_body->>'body');
  v_id:=(p_body->>'ticketId')::uuid;
 elsif p_action='review_content'then
  update public.admin_records set reviewed_by=auth.uid(),reviewed_at=now(),reviewed_hash=md5(body||details::text),status='review',row_version=row_version+1 where id=v_id and kind='content'and updated_by<>auth.uid()and row_version=(p_body->>'expectedVersion')::integer;
  if not found then raise exception 'Independent review or current revision required'using errcode='42501';end if;
 elsif p_action in ('incident','release','content') then
  if p_action='release' and (coalesce(p_body->'details'->>'sha256','')!~'^[a-f0-9]{64}$' or coalesce(p_body->'details'->>'url','')!~'^https://picketfinance[.]com/downloads/[^?]+[.]apk$') then raise exception 'Verified release URL and checksum required' using errcode='22023'; end if;
  if p_action='content'and p_body->>'status'='published'then
   if not exists(select 1 from public.admin_records where id=v_id and kind='content'and reviewed_by is not null and reviewed_by<>updated_by and reviewed_hash=md5(coalesce(p_body->>'body','')||coalesce(p_body->'details','{}'::jsonb)::text))then raise exception 'Independent content review required'using errcode='23514';end if;
  end if;
  if p_body->>'id' is null then
   insert into public.admin_records(id,kind,title,body,status,details,updated_by) values(v_id,p_action,p_body->>'title',coalesce(p_body->>'body',''),coalesce(p_body->>'status',case when p_action='incident' then 'open' else 'draft' end),coalesce(p_body->'details','{}'::jsonb),auth.uid());
  else
   update public.admin_records set title=p_body->>'title',body=coalesce(p_body->>'body',''),status=p_body->>'status',details=coalesce(p_body->'details','{}'::jsonb),row_version=row_version+1,updated_at=now(),updated_by=case when p_action='content'and p_body->>'status'='published'then updated_by else auth.uid()end where id=v_id and kind=p_action and row_version=(p_body->>'expectedVersion')::integer;
   if not found then raise exception 'Record changed; reload before saving' using errcode='40001'; end if;
  end if;
  if p_action='content'and coalesce(p_body->'details'->>'lessonId','')<>''and p_body->>'status'in('published','archived')then
   update public.learning_answer_keys set published=(p_body->>'status'='published')where lesson_id=p_body->'details'->>'lessonId'and content_version=(p_body->'details'->>'contentVersion')::integer;
   if not found then raise exception 'Linked lesson version not found'using errcode='22023';end if;
  end if;
 elsif p_action='staff' then
  lock table public.staff_members in share row exclusive mode;
  v_target:=(p_body->>'userId')::uuid; v_role:=p_body->>'role';
  if v_role not in ('owner','operations','support','analyst','content','remove') or v_target is null then raise exception 'Invalid staff role' using errcode='22023'; end if;
  if exists(select 1 from public.staff_members where user_id=v_target and role='owner') and v_role<>'owner' and (select count(*) from public.staff_members where role='owner')<=1 then raise exception 'Cannot remove last owner' using errcode='23514'; end if;
  if v_role='remove' then delete from public.staff_members where user_id=v_target;
  else insert into public.staff_members(user_id,role) values(v_target,v_role) on conflict(user_id)do update set role=excluded.role; end if;
  v_id:=v_target;
 elsif p_action='settings' then
  if not picket_private.has_permission('settings.retention.write')and(p_body ? 'analyticsRetentionDays'or p_body ? 'aggregateRetentionMonths')then raise exception 'Owner required for retention policy'using errcode='42501';end if;
  if length(coalesce(p_body->>'notice',''))>1000 or jsonb_typeof(p_body->'maintenance')<>'boolean' then raise exception 'Invalid settings' using errcode='22023'; end if;
  update public.app_settings set maintenance=(p_body->>'maintenance')::boolean,notice=coalesce(p_body->>'notice',''),disk_warning_percent=coalesce((p_body->>'diskWarningPercent')::integer,85),probe_timeout_seconds=coalesce((p_body->>'probeTimeoutSeconds')::integer,8),stale_minutes=coalesce((p_body->>'staleMinutes')::integer,15),analytics_retention_days=coalesce((p_body->>'analyticsRetentionDays')::integer,analytics_retention_days),aggregate_retention_months=coalesce((p_body->>'aggregateRetentionMonths')::integer,aggregate_retention_months),row_version=row_version+1 where id and row_version=(p_body->>'expectedVersion')::integer;
  if not found then raise exception 'Settings changed; reload before saving'using errcode='40001';end if;
 elsif p_action='partner' then
  if coalesce(p_body->>'url','')!~'^https://[^/@: ]+([/:][^@ ]*)?$' then raise exception 'HTTPS URL required' using errcode='22023'; end if;
  if p_body->>'id'is null then insert into public.partner_ads(id,title,body,url,active,starts_at,ends_at) values(v_id,p_body->>'title',coalesce(p_body->>'body',''),p_body->>'url',coalesce((p_body->>'active')::boolean,false),(p_body->>'startsAt')::timestamptz,(p_body->>'endsAt')::timestamptz);
  else update public.partner_ads set title=p_body->>'title',body=coalesce(p_body->>'body',''),url=p_body->>'url',active=coalesce((p_body->>'active')::boolean,false),starts_at=(p_body->>'startsAt')::timestamptz,ends_at=(p_body->>'endsAt')::timestamptz,row_version=row_version+1 where id=v_id and row_version=(p_body->>'expectedVersion')::integer;
   if not found then raise exception 'Partner record changed; reload'using errcode='40001';end if;
  end if;
 elsif p_action='grant' then
  if not picket_private.has_permission('billing.write') then raise exception 'Grant permission required' using errcode='42501'; end if;
  v_target:=(p_body->>'userId')::uuid;
  if p_body->>'tier'='free' then delete from public.plan_grants where user_id=v_target;
  elsif p_body->>'tier' in ('plus','pro') then insert into public.plan_grants(user_id,tier,expires_at,granted_by)values(v_target,p_body->>'tier',now()+interval '30 days',auth.uid())on conflict(user_id)do update set tier=excluded.tier,expires_at=excluded.expires_at,granted_by=excluded.granted_by;
  else raise exception 'Invalid grant' using errcode='22023'; end if;
  v_id:=v_target;
 end if;
 v_result:=jsonb_build_object('updated',true,'id',v_id);
 insert into public.admin_audit(actor,action,target,reason,request_id,details)values(auth.uid(),p_action,v_id::text,trim(p_reason),p_request_id,jsonb_build_object('before',v_before,'after',picket_private.admin_snapshot(p_action,v_id)));
 insert into public.admin_mutation_requests(actor,request_id,fingerprint,result)values(auth.uid(),p_request_id,v_fingerprint,v_result);
 return v_result;
end $$;

create or replace function picket_private.admin_prepare_auth(p_action text,p_user uuid,p_reason text,p_request_id uuid)returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_email text; v_request public.admin_mutation_requests; v_fingerprint text; begin
 perform picket_private.admin_require('users',true);
 if p_action not in ('suspend','restore','reset_password','revoke_sessions')or length(trim(coalesce(p_reason,'')))not between 5 and 500 or p_request_id is null then raise exception 'Invalid account action' using errcode='22023'; end if;
 if p_action in ('suspend','restore','revoke_sessions') and exists(select 1 from public.staff_members where user_id=p_user)then raise exception 'Staff account requires owner recovery procedure' using errcode='42501';end if;
 select email into v_email from auth.users where id=p_user;
 if not found then raise exception 'User not found' using errcode='P0002';end if;
 if p_action='reset_password' and coalesce(v_email,'')='' then raise exception 'Phone password recovery is not enabled yet' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
 v_fingerprint:=md5(p_action||p_user::text||p_reason);
 select * into v_request from public.admin_mutation_requests where actor=auth.uid()and request_id=p_request_id;
 if found then
  if v_request.fingerprint<>v_fingerprint then raise exception 'Idempotency key reused'using errcode='22023';end if;
  if v_request.result->>'state'='applied'then return jsonb_build_object('state','applied');end if;
  if v_request.result->>'state'='processing'and(v_request.result->>'leaseAt')::timestamptz>now()-interval '5 minutes'then return jsonb_build_object('state','in_progress');end if;
  update public.admin_mutation_requests set result=jsonb_build_object('state','processing','leaseAt',now())where actor=auth.uid()and request_id=p_request_id;
  return jsonb_build_object('state','execute','email',v_email);
 end if;
 insert into public.admin_audit(actor,action,target,reason,request_id,details)values(auth.uid(),p_action,p_user::text,p_reason,p_request_id,'{"state":"requested"}');
 insert into public.admin_mutation_requests(actor,request_id,fingerprint,result)values(auth.uid(),p_request_id,v_fingerprint,jsonb_build_object('state','processing','leaseAt',now()));
 return jsonb_build_object('email',v_email,'state','execute');
end $$;

-- Include phone identities in authorized user exports.
create or replace function public.admin_process_export()returns jsonb language plpgsql security definer set search_path=''as $$
declare r public.admin_exports;v_export jsonb;v_search text;begin
 select * into r from public.admin_exports where status='queued'order by created_at for update skip locked limit 1;
 if not found then return null;end if;
 begin
  perform set_config('request.jwt.claim.sub',r.actor::text,true);
  perform picket_private.admin_require(r.section);
  v_search:=lower(coalesce(r.filters->>'search',''));
  if r.section='users'then
   select coalesce(jsonb_agg(x),'[]'::jsonb)into v_export from(select id,phone,email,created_at,phone_confirmed_at,email_confirmed_at,last_sign_in_at,banned_until from auth.users u where picket_private.admin_user_filter(u,r.filters)and(v_search=''or strpos(lower(coalesce(email,'')),v_search)>0 or strpos(coalesce(phone,''),v_search)>0 or id::text=v_search)and(coalesce(r.filters->>'status','')=''or(r.filters->>'status'='suspended'and banned_until>now())or(r.filters->>'status'='active'and(banned_until is null or banned_until<=now())))order by created_at desc,id limit 25000)x;
  elsif r.section='billing'then select coalesce(jsonb_agg(x),'[]'::jsonb)into v_export from(select user_id,product_id,tier,expires_at,active,verified_at,is_test,subscription_state,acknowledgement_state,metadata_verified_at from public.play_purchases order by verified_at desc limit 25000)x;
  elsif r.section='tickets'then select coalesce(jsonb_agg(x),'[]'::jsonb)into v_export from(select id,title,status,priority,target_user,assignee,created_at,updated_at from public.admin_tickets where(coalesce(r.filters->>'status','')=''or status=r.filters->>'status')and(v_search=''or strpos(lower(title),v_search)>0)order by created_at desc limit 25000)x;
  elsif r.section='audit'then select coalesce(jsonb_agg(x),'[]'::jsonb)into v_export from(select id,actor,action,target,reason,created_at from public.admin_audit where created_at>now()-coalesce((r.filters->>'days')::integer,30)*interval '1 day'and(v_search=''or strpos(lower(action),v_search)>0 or target=v_search)order by id desc limit 25000)x;
  else v_export:=picket_private.admin_portal(r.section,r.filters-'page');end if;
  update public.admin_exports set status='ready',result=v_export,expires_at=now()+interval '1 hour'where id=r.id;
 exception when others then update public.admin_exports set status='failed',expires_at=now()+interval '1 hour'where id=r.id;
 end;
 return jsonb_build_object('id',r.id);
end $$;
