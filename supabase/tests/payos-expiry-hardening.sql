begin;
-- PayOS mentor review 05/11/2026: 15-minute links, supersede old links,
-- honour late full payments, and count revenue from paid orders only.
insert into auth.users(id,email,email_confirmed_at) values
 ('ef000000-0000-4000-8000-000000000001','expiry-owner@example.test',now()),
 ('ef000000-0000-4000-8000-000000000002','expiry-buyer@example.test',now());
insert into public.staff_members(user_id,role) values('ef000000-0000-4000-8000-000000000001','owner');
insert into public.billing_catalog(sku,tier,months,amount,enabled) values('expiry_fixture','plus',1,2000,true);

select set_config('request.jwt.claim.sub','ef000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select public.payment_reserve('expiry_fixture','expiry-key-0000');
reset role;
-- Linked order: the link expiry written by the API is the one persisted.
do $$declare o public.billing_orders;begin
 select * into strict o from public.billing_orders where idempotency_key='expiry-key-0000';
 perform public.payment_attach(o.id,jsonb_build_object('paymentLinkId','expiry-link-0','checkoutUrl','https://pay.payos.vn/expiry-0','qrCode','q','expiresAt','2030-01-01T00:15:00Z'));
 if (select expires_at from public.billing_orders where id=o.id)<>'2030-01-01T00:15:00Z'::timestamptz then raise exception 'link expiry not persisted';end if;
 -- A link without an explicit expiry keeps the reservation default.
 update public.billing_orders set expires_at=now()+interval '15 minutes' where id=o.id;
end$$;

-- A second purchase is allowed while an older link is pending; the older
-- linked order is returned for provider cancellation instead of blocking.
select set_config('request.jwt.claim.sub','ef000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$declare r jsonb; again jsonb;begin
 r:=public.payment_reserve('expiry_fixture','expiry-key-0001');
 if r->>'idempotency_key'<>'expiry-key-0001' then raise exception 'new order not reserved';end if;
 if jsonb_array_length(r->'supersede')<>1 or r->'supersede'->0->>'payment_link_id'<>'expiry-link-0' then raise exception 'old link not superseded: %',r->'supersede';end if;
 again:=public.payment_reserve('expiry_fixture','expiry-key-0001');
 if again->>'id'<>r->>'id' then raise exception 'idempotent retry created another order';end if;
 -- Unlinked pending order can never receive money, so it is cancelled at once.
 r:=public.payment_reserve('expiry_fixture','expiry-key-0002');
 if (select status from public.billing_orders where idempotency_key='expiry-key-0001')<>'cancelled' then raise exception 'unlinked superseded order left pending';end if;
end$$;
reset role;

-- Late full payment on an order already reconciled as EXPIRED still grants.
do $$declare o public.billing_orders;begin
 select * into strict o from public.billing_orders where idempotency_key='expiry-key-0000';
 update public.billing_orders set expires_at=now()-interval '1 minute' where id=o.id;
 perform public.payment_state(o.id,'EXPIRED');
 if (select status from public.billing_orders where id=o.id)<>'expired' then raise exception 'expiry not recorded';end if;
 perform public.payment_receive(jsonb_build_object('orderCode',o.order_code,'paymentLinkId','expiry-link-0','amount',2000,'currency','VND','code','00','reference','expiry-late','accountNumber','fixture-bank','transactionDateTime',now()::text),'fixture-bank');
 if (select status from public.billing_orders where id=o.id)<>'paid' then raise exception 'late full payment not honoured';end if;
 if not exists(select 1 from public.payment_entitlement_grants where order_id=o.id) then raise exception 'late payment grant missing';end if;
end$$;

-- Paying a second link after the plan is active is a double payment: review.
do $$declare o public.billing_orders;begin
 select * into strict o from public.billing_orders where idempotency_key='expiry-key-0002';
 perform public.payment_attach(o.id,jsonb_build_object('paymentLinkId','expiry-link-2','checkoutUrl','https://pay.payos.vn/expiry-2','qrCode','q'));
 perform public.payment_receive(jsonb_build_object('orderCode',o.order_code,'paymentLinkId','expiry-link-2','amount',2000,'currency','VND','code','00','reference','expiry-double','accountNumber','fixture-bank','transactionDateTime',now()::text),'fixture-bank');
 if (select status from public.billing_orders where id=o.id)<>'review' then raise exception 'double payment not held for review';end if;
end$$;

-- Unlinked reservations that pass their expiry are closed without PayOS.
do $$declare o public.billing_orders;begin
 insert into public.billing_orders(user_id,sku,tier,months,amount,idempotency_key,expires_at) values('ef000000-0000-4000-8000-000000000002','expiry_fixture','plus',1,2000,'expiry-stale',now()-interval '1 minute') returning * into o;
 if (public.payment_expire_unlinked()->>'expired')::int<1 then raise exception 'stale unlinked order not expired';end if;
 if (select status from public.billing_orders where id=o.id)<>'expired' then raise exception 'stale unlinked status wrong';end if;
end$$;

-- Overdue pending links are reconciled first.
do $$declare q jsonb;begin
 insert into public.billing_orders(user_id,sku,tier,months,amount,idempotency_key,expires_at,payment_link_id,last_checked_at) values('ef000000-0000-4000-8000-000000000002','expiry_fixture','plus',1,2000,'expiry-overdue',now()-interval '2 minutes','expiry-link-overdue',now()-interval '90 seconds');
 q:=public.payment_reconcile_queue();
 if q->'orders'->0->>'payment_link_id'<>'expiry-link-overdue' then raise exception 'overdue link not prioritised: %',q->'orders'->0;end if;
end$$;

-- Revenue counts settled orders only; review money is reported separately.
select set_config('request.jwt.claim.sub','ef000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
set local role authenticated;
do $$declare d jsonb;begin
 d:=public.payment_dashboard('{}');
 if (d->>'total')::bigint<>2000 then raise exception 'revenue includes non-paid orders: %',d->>'total';end if;
 if (d->>'reviewTotal')::bigint<>2000 then raise exception 'review total missing: %',d->>'reviewTotal';end if;
end$$;
reset role;
rollback;
