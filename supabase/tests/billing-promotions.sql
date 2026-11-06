begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('ec000000-0000-4000-8000-000000000001','promo-owner@example.test',now()),
 ('ec000000-0000-4000-8000-000000000002','promo-a@example.test',now()),
 ('ec000000-0000-4000-8000-000000000003','promo-b@example.test',now()),
 ('ec000000-0000-4000-8000-000000000004','promo-c@example.test',now());
insert into public.staff_members(user_id,role) values('ec000000-0000-4000-8000-000000000001','owner');
insert into public.billing_catalog(sku,tier,months,amount,enabled) values('promo_fixture','plus',1,100000,true);

-- Only four owner-approved plans ship; promotions never add plans.
do $$begin if (select count(*) from public.billing_catalog where sku like 'picket_%')<>4 then raise exception 'plan count changed';end if;end$$;

-- Admin creates a capped founder-style offer: 2 slots, 40% off.
select set_config('request.jwt.claim.sub','ec000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
set local role authenticated;
do $$declare p jsonb;begin
 begin perform public.promotion_save('{"name":"No reason","discountPercent":10,"skus":["promo_fixture"]}',''); raise exception 'save without reason'; exception when invalid_parameter_value then null; end;
 begin perform public.promotion_save('{"name":"Bad plan","discountPercent":10,"skus":["ghost"]}','Create bad plan'); raise exception 'unknown sku accepted'; exception when invalid_parameter_value then null; end;
 begin perform public.promotion_save('{"name":"Too deep","discountPercent":95,"skus":["promo_fixture"]}','Too deep discount'); raise exception '95 percent accepted'; exception when check_violation then null; end;
 p:=public.promotion_save('{"name":"Founder QA","discountPercent":40,"skus":["promo_fixture"],"maxRedemptions":2,"enabled":true}','Create founder offer');
 if (p->>'revision')::int<>1 then raise exception 'revision not initialised';end if;
 if jsonb_array_length(public.promotion_list()->'promotions')<>1 then raise exception 'promotion not listed';end if;
end$$;
reset role;

-- Buyer A sees and gets the discounted, locked price.
select set_config('request.jwt.claims','{"aal":"aal1"}',true);
select set_config('request.jwt.claim.sub','ec000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$declare c jsonb; o jsonb;begin
 select x into c from jsonb_array_elements(public.payment_customer()->'catalog') x where x->>'sku'='promo_fixture';
 if (c->>'amount')::bigint<>60000 or (c->>'list_amount')::bigint<>100000 or (c->'promotion'->>'slotsLeft')::int<>2 then raise exception 'catalog offer wrong: %',c;end if;
 o:=public.payment_reserve('promo_fixture','promo-key-a-001');
 if (o->>'amount')::bigint<>60000 or (o->>'discount_amount')::bigint<>40000 then raise exception 'order not discounted: %',o;end if;
end$$;
reset role;
-- Buyer B takes the second slot; buyer C must pay full price.
select set_config('request.jwt.claim.sub','ec000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select public.payment_reserve('promo_fixture','promo-key-b-001');
reset role;
select set_config('request.jwt.claim.sub','ec000000-0000-4000-8000-000000000004',true);
set local role authenticated;
do $$declare o jsonb;begin
 if (select x->'promotion' from jsonb_array_elements(public.payment_customer()->'catalog') x where x->>'sku'='promo_fixture')<>'null'::jsonb then raise exception 'sold-out offer still shown';end if;
 o:=public.payment_reserve('promo_fixture','promo-key-c-001');
 if (o->>'amount')::bigint<>100000 or o->>'promotion_id' is not null then raise exception 'cap oversold';end if;
end$$;
reset role;

-- B's link expires: the slot returns and C's next purchase gets it.
do $$begin
 update public.billing_orders set expires_at=now()-interval '1 minute' where idempotency_key='promo-key-b-001';
 perform public.payment_state((select id from public.billing_orders where idempotency_key='promo-key-b-001'),'EXPIRED');
 if (select state from public.promotion_redemptions r join public.billing_orders o on o.id=r.order_id where o.idempotency_key='promo-key-b-001')<>'released' then raise exception 'slot not released';end if;
end$$;
select set_config('request.jwt.claim.sub','ec000000-0000-4000-8000-000000000004',true);
set local role authenticated;
do $$declare o jsonb;begin
 o:=public.payment_reserve('promo_fixture','promo-key-c-002');
 if (o->>'amount')::bigint<>60000 then raise exception 'released slot not reusable';end if;
end$$;
reset role;

-- A pays: slot consumed, plan granted at the locked discounted price.
do $$declare o public.billing_orders;begin
 select * into strict o from public.billing_orders where idempotency_key='promo-key-a-001';
 perform public.payment_attach(o.id,jsonb_build_object('paymentLinkId','promo-link-a','checkoutUrl','https://pay.payos.vn/a','qrCode','q'));
 perform public.payment_receive(jsonb_build_object('orderCode',o.order_code,'paymentLinkId','promo-link-a','amount',60000,'currency','VND','code','00','reference','promo-ref-a','accountNumber','fixture-bank','transactionDateTime',now()::text),'fixture-bank');
 if (select status from public.billing_orders where id=o.id)<>'paid' then raise exception 'discounted payment not settled';end if;
 if (select state from public.promotion_redemptions where order_id=o.id)<>'consumed' then raise exception 'slot not consumed';end if;
end$$;

-- Admin raises the percentage: only new orders change; cap cannot drop below use.
select set_config('request.jwt.claim.sub','ec000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
set local role authenticated;
do $$declare p jsonb; id uuid;begin
 p:=public.promotion_list()->'promotions'->0; id:=(p->>'id')::uuid;
 begin perform public.promotion_save(jsonb_build_object('id',id,'revision',1,'name','Founder QA','discountPercent',50,'skus',jsonb_build_array('promo_fixture'),'maxRedemptions',1),'Shrink below usage'); raise exception 'cap below usage accepted'; exception when invalid_parameter_value then null; end;
 perform public.promotion_save(jsonb_build_object('id',id,'revision',1,'name','Founder QA','discountPercent',50,'skus',jsonb_build_array('promo_fixture'),'maxRedemptions',3),'Raise discount');
 begin perform public.promotion_save(jsonb_build_object('id',id,'revision',1,'name','Founder QA','discountPercent',20,'skus',jsonb_build_array('promo_fixture')),'Stale edit'); raise exception 'stale revision accepted'; exception when sqlstate 'PT409' then null; end;
 if jsonb_array_length(public.promotion_list()->'promotions'->0->'audit')<>2 then raise exception 'audit trail missing';end if;
end$$;
reset role;
do $$begin if (select amount from public.billing_orders where idempotency_key='promo-key-a-001')<>60000 then raise exception 'locked price changed';end if;end$$;

-- Without MFA or permission, promotions cannot be changed.
select set_config('request.jwt.claims','{"aal":"aal1"}',true);
set local role authenticated;
do $$begin begin perform public.promotion_save('{"name":"No MFA","discountPercent":10,"skus":["promo_fixture"]}','No MFA attempt'); raise exception 'save without MFA'; exception when insufficient_privilege then null; end;end$$;
reset role;
select set_config('request.jwt.claim.sub','ec000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$begin begin perform public.promotion_list(); raise exception 'promotion leak'; exception when insufficient_privilege then null; end;end$$;
reset role;
rollback;
