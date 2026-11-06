-- Unified revenue ledger: one traceable row per money movement, whatever the
-- channel. Adding a channel later (or dropping Google Play) is a row in
-- revenue_sources plus a writer; the ledger, dashboard and exports stay as is.

create table public.revenue_sources(
 code text primary key check(code ~ '^[a-z][a-z0-9_]{1,31}$'),
 name text not null,
 enabled boolean not null default true,
 created_at timestamptz not null default now());
insert into public.revenue_sources(code,name) values
 ('payos','PayOS (APK phát hành ngoài Google Play)'),
 ('google_play','Google Play Billing');

create table public.revenue_ledger(
 id bigint generated always as identity primary key,
 source text not null references public.revenue_sources,
 kind text not null check(kind in('charge','refund','chargeback','adjustment')),
 status text not null check(status in('estimated','confirmed','review','reversed')),
 external_ref text not null check(length(external_ref) between 1 and 200),
 user_id uuid references auth.users on delete set null,
 sku text,
 tier text check(tier is null or tier in('plus','pro')),
 currency text not null check(currency ~ '^[A-Z]{3}$'),
 amount_original numeric(20,2) not null,
 amount_vnd bigint,
 is_test boolean not null default false,
 occurred_at timestamptz not null,
 recorded_at timestamptz not null default now(),
 payment_order_id uuid references public.billing_orders,
 play_token_hash text,
 evidence jsonb not null default '{}',
 note text,
 unique(source,kind,external_ref),
 check((kind='charge' and amount_original>=0) or kind<>'charge'),
 check(currency<>'VND' or amount_vnd=amount_original));
create index revenue_ledger_time on public.revenue_ledger(occurred_at desc,id desc);
create index revenue_ledger_user on public.revenue_ledger(user_id,occurred_at desc);
create index revenue_ledger_order on public.revenue_ledger(payment_order_id);

create table public.revenue_ledger_history(
 id bigint generated always as identity primary key,
 ledger_id bigint not null references public.revenue_ledger,
 actor uuid,
 previous jsonb not null,
 changed_at timestamptz not null default now());

-- Append-only: rows are never deleted. Only an estimated or review row may
-- change, and every change keeps the previous version for tracing.
create function picket_private.revenue_ledger_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'Revenue ledger is append-only' using errcode='42501';end if;
 if old.status not in('estimated','review') or new.source<>old.source or new.kind<>old.kind or new.external_ref<>old.external_ref then
  raise exception 'Settled revenue rows are immutable' using errcode='42501';end if;
 insert into public.revenue_ledger_history(ledger_id,actor,previous) values(old.id,auth.uid(),to_jsonb(old));
 return new;
end$$;
revoke all on function picket_private.revenue_ledger_guard() from public,anon,authenticated;
create trigger revenue_ledger_guard before update or delete on public.revenue_ledger for each row execute function picket_private.revenue_ledger_guard();

alter table public.revenue_sources enable row level security;
alter table public.revenue_ledger enable row level security;
alter table public.revenue_ledger_history enable row level security;
revoke all on public.revenue_sources,public.revenue_ledger,public.revenue_ledger_history from public,anon,authenticated;
grant all on public.revenue_sources,public.revenue_ledger,public.revenue_ledger_history to service_role;

insert into public.permission_catalog values('revenue.adjust','Điều chỉnh/hoàn tiền doanh thu') on conflict do nothing;

-- PayOS: every received transfer is one ledger row keyed by its bank reference.
create function picket_private.revenue_sync_payos(p_order uuid) returns void language plpgsql security definer set search_path='' as $$
declare o public.billing_orders;begin
 select * into o from public.billing_orders where id=p_order;
 if not found then return;end if;
 insert into public.revenue_ledger(source,kind,status,external_ref,user_id,sku,tier,currency,amount_original,amount_vnd,occurred_at,payment_order_id,evidence)
 select 'payos','charge',case when o.status='paid' then 'confirmed' else 'review' end,t.reference,o.user_id,o.sku,o.tier,'VND',t.amount,t.amount,t.paid_at,o.id,
  jsonb_build_object('provider','payos','orderCode',o.order_code,'paymentLinkId',o.payment_link_id,'transactionId',t.id)
 from public.payment_transactions t where t.order_id=o.id
 on conflict(source,kind,external_ref) do nothing;
 -- A review row becomes revenue once the order settles as paid.
 if o.status='paid' then
  update public.revenue_ledger set status='confirmed' where payment_order_id=o.id and source='payos' and status='review';
 end if;
end$$;
revoke all on function picket_private.revenue_sync_payos(uuid) from public,anon,authenticated;
create function picket_private.revenue_payos_order_trigger() returns trigger language plpgsql security definer set search_path='' as $$
begin perform picket_private.revenue_sync_payos(new.id); return null; end$$;
revoke all on function picket_private.revenue_payos_order_trigger() from public,anon,authenticated;
create trigger revenue_payos_order after update of status on public.billing_orders for each row when(new.status in('paid','review') and new.status is distinct from old.status) execute function picket_private.revenue_payos_order_trigger();

-- Backfill money received before the ledger existed.
do $$declare r record;begin
 for r in select distinct order_id from public.payment_transactions loop perform picket_private.revenue_sync_payos(r.order_id); end loop;
end$$;

-- Google Play, step 1: a verified order is recorded as an estimate at the
-- catalog price. Step 2 (sales report) confirms the real charged amount.
create function public.revenue_record_play_order(p_order_id text,p_user uuid,p_product text,p_hash text,p_is_test boolean,p_occurred timestamptz) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.billing_catalog;begin
 if p_order_id is null or p_order_id !~ '^GPA\.[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{5}(\.\.[0-9]+)?$' then return jsonb_build_object('ignored',true);end if;
 select * into c from public.billing_catalog where sku=p_product;
 insert into public.revenue_ledger(source,kind,status,external_ref,user_id,sku,tier,currency,amount_original,amount_vnd,is_test,occurred_at,play_token_hash,evidence)
 values('google_play','charge','estimated',p_order_id,p_user,p_product,c.tier,'VND',coalesce(c.amount,0),coalesce(c.amount,0),coalesce(p_is_test,false),coalesce(p_occurred,now()),p_hash,
  jsonb_build_object('basis','catalog_price','verifiedAt',now()))
 on conflict(source,kind,external_ref) do update set user_id=coalesce(public.revenue_ledger.user_id,excluded.user_id),play_token_hash=coalesce(public.revenue_ledger.play_token_hash,excluded.play_token_hash),is_test=excluded.is_test
  where public.revenue_ledger.status='estimated' and (public.revenue_ledger.user_id is null or public.revenue_ledger.play_token_hash is null or public.revenue_ledger.is_test<>excluded.is_test);
 return jsonb_build_object('recorded',true);
end$$;

-- Google Play, step 2: the monthly sales report is the source of truth for
-- amounts, refunds and chargebacks. Unknown orders are kept, unattributed.
create function public.revenue_ingest_play_report(p_rows jsonb,p_report text) returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb; v_kind text; v_amount numeric; v_vnd bigint; v_confirmed int:=0; v_new int:=0;begin
 if jsonb_typeof(p_rows)<>'array' or p_report is null then raise exception 'Invalid report' using errcode='22023';end if;
 for r in select * from jsonb_array_elements(p_rows) loop
  v_kind:=case r->>'status' when 'charged' then 'charge' when 'refund' then 'refund' when 'partial refund' then 'refund' when 'chargeback' then 'chargeback' end;
  if v_kind is null or coalesce(r->>'orderNumber','')='' or (r->>'currency') !~ '^[A-Z]{3}$' then raise exception 'Invalid report row' using errcode='22023';end if;
  v_amount:=abs((r->>'amount')::numeric)*case when v_kind='charge' then 1 else -1 end;
  v_vnd:=case when r->>'currency'='VND' then v_amount::bigint end;
  if v_kind='charge' then
   update public.revenue_ledger set status='confirmed',currency=r->>'currency',amount_original=v_amount,amount_vnd=v_vnd,occurred_at=coalesce((r->>'chargedAt')::timestamptz,occurred_at),
    evidence=evidence||jsonb_build_object('report',p_report,'basis','sales_report')
   where source='google_play' and kind='charge' and external_ref=r->>'orderNumber' and status='estimated';
   if found then v_confirmed:=v_confirmed+1; continue; end if;
  end if;
  insert into public.revenue_ledger(source,kind,status,external_ref,sku,currency,amount_original,amount_vnd,occurred_at,evidence,user_id,tier,play_token_hash)
  select 'google_play',v_kind,'confirmed',r->>'orderNumber',coalesce(r->>'sku',e.sku),r->>'currency',v_amount,v_vnd,coalesce((r->>'chargedAt')::timestamptz,now()),
   jsonb_build_object('report',p_report,'basis','sales_report'),e.user_id,e.tier,e.play_token_hash
  from (select 1) one left join lateral(select sku,user_id,tier,play_token_hash from public.revenue_ledger where source='google_play' and kind='charge' and external_ref=r->>'orderNumber' limit 1) e on true
  on conflict(source,kind,external_ref) do nothing;
  if found then v_new:=v_new+1; end if;
 end loop;
 return jsonb_build_object('confirmed',v_confirmed,'inserted',v_new);
end$$;

revoke all on function public.revenue_record_play_order(text,uuid,text,text,boolean,timestamptz),public.revenue_ingest_play_report(jsonb,text) from public,anon,authenticated;
grant execute on function public.revenue_record_play_order(text,uuid,text,text,boolean,timestamptz),public.revenue_ingest_play_report(jsonb,text) to service_role;

-- Admin: a refund or correction is a new adjustment row (MFA + reason).
create function public.revenue_adjust(p_body jsonb,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.revenue_ledger; ref public.revenue_ledger;begin
 perform picket_private.permission_require('revenue.adjust',true);
 if p_reason is null or length(trim(p_reason)) not between 5 and 500 then raise exception 'Reason required' using errcode='22023';end if;
 select * into ref from public.revenue_ledger where id=(p_body->>'ledgerId')::bigint;
 if not found or ref.kind<>'charge' or ref.status<>'confirmed' then raise exception 'Unknown charge' using errcode='22023';end if;
 if coalesce((p_body->>'amountVnd')::bigint,0)<=0 or (p_body->>'amountVnd')::bigint>coalesce(ref.amount_vnd,0) then raise exception 'Invalid amount' using errcode='22023';end if;
 insert into public.revenue_ledger(source,kind,status,external_ref,user_id,sku,tier,currency,amount_original,amount_vnd,occurred_at,payment_order_id,play_token_hash,evidence,note)
 values(ref.source,case when p_body->>'kind'='refund' then 'refund' else 'adjustment' end,'confirmed',
  coalesce(nullif(p_body->>'externalRef',''),'adj-'||ref.id||'-'||extract(epoch from now())::bigint),ref.user_id,ref.sku,ref.tier,'VND',
  -(p_body->>'amountVnd')::bigint,-(p_body->>'amountVnd')::bigint,now(),ref.payment_order_id,ref.play_token_hash,
  jsonb_build_object('basis','admin','charge',ref.id,'actor',auth.uid()),trim(p_reason)) returning * into v;
 return to_jsonb(v);
end$$;

-- Admin: totals by source and status; estimated and unconverted money is
-- reported, never silently added to confirmed revenue. Test purchases excluded.
create function public.revenue_summary(p_filters jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare f timestamptz; t timestamptz; bucket text;begin
 perform picket_private.permission_require('revenue.read');
 f:=coalesce((p_filters->>'from')::timestamptz,date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh');
 t:=coalesce((p_filters->>'to')::timestamptz,now()+interval '1 second');
 bucket:=coalesce(p_filters->>'bucket','day');
 if t<=f or t-f>interval '5 years' or bucket not in('day','month','year') then raise exception 'Invalid revenue range' using errcode='22023';end if;
 return jsonb_build_object('from',f,'to',t,'currency','VND',
  'confirmedVnd',coalesce((select sum(amount_vnd) from public.revenue_ledger where status='confirmed' and not is_test and occurred_at>=f and occurred_at<t),0),
  'estimatedVnd',coalesce((select sum(amount_vnd) from public.revenue_ledger where status='estimated' and not is_test and occurred_at>=f and occurred_at<t),0),
  'reviewVnd',coalesce((select sum(amount_vnd) from public.revenue_ledger where status='review' and not is_test and occurred_at>=f and occurred_at<t),0),
  'unconverted',coalesce((select jsonb_agg(x) from(select currency,sum(amount_original) as amount from public.revenue_ledger where amount_vnd is null and not is_test and occurred_at>=f and occurred_at<t group by currency)x),'[]'),
  'bySource',coalesce((select jsonb_agg(x order by x.source) from(
    select s.code as source,s.name,s.enabled,
     coalesce(sum(l.amount_vnd) filter(where l.status='confirmed'),0) as confirmed,
     coalesce(sum(l.amount_vnd) filter(where l.status='estimated'),0) as estimated,
     count(l.id) filter(where l.kind='charge') as charges,
     coalesce(-sum(l.amount_vnd) filter(where l.kind in('refund','chargeback') and l.status='confirmed'),0) as refunded
    from public.revenue_sources s left join public.revenue_ledger l on l.source=s.code and not l.is_test and l.occurred_at>=f and l.occurred_at<t
    group by s.code,s.name,s.enabled)x),'[]'),
  'series',coalesce((select jsonb_agg(x order by period,source) from(
    select date_trunc(bucket,occurred_at at time zone 'Asia/Ho_Chi_Minh') as period,source,sum(amount_vnd) as amount,count(*) as entries
    from public.revenue_ledger where status='confirmed' and not is_test and occurred_at>=f and occurred_at<t group by 1,2)x),'[]'));
end$$;

create function public.revenue_entries(p_filters jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform picket_private.permission_require('revenue.read');
 return jsonb_build_object('entries',coalesce((select jsonb_agg(x) from(
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
   and(p_filters->>'beforeId' is null or l.id<(p_filters->>'beforeId')::bigint)
  order by l.id desc limit least(coalesce((p_filters->>'limit')::int,50),1000))x),'[]'),
  'history',case when p_filters->>'id' is null then '[]'::jsonb else coalesce((select jsonb_agg(h order by h.id) from public.revenue_ledger_history h where h.ledger_id=(p_filters->>'id')::bigint),'[]') end);
end$$;

revoke all on function public.revenue_adjust(jsonb,text),public.revenue_summary(jsonb),public.revenue_entries(jsonb) from public,anon;
grant execute on function public.revenue_adjust(jsonb,text),public.revenue_summary(jsonb),public.revenue_entries(jsonb) to authenticated;
