begin;
do $$begin
 if (select amount from public.billing_catalog where sku='picket_plus_monthly')<>19000 or (select amount from public.billing_catalog where sku='picket_plus_yearly')<>199000 or (select amount from public.billing_catalog where sku='picket_pro_monthly')<>39000 or(select amount from public.billing_catalog where sku='picket_pro_yearly')<>499000 then raise exception 'Owner-approved price changed';end if;
end$$;
insert into auth.users(id,email,email_confirmed_at) values
 ('ee000000-0000-4000-8000-000000000001','pay-owner@example.test',now()),
 ('ee000000-0000-4000-8000-000000000002','pay-member@example.test',now()),
 ('ee000000-0000-4000-8000-000000000003','pay-other@example.test',now());
insert into public.staff_members(user_id,role) values('ee000000-0000-4000-8000-000000000001','owner');
insert into auth.users(id,phone,phone_confirmed_at)values('ee000000-0000-4000-8000-000000000004','84901234567',now());
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000004',true);
set local role authenticated;
do $$begin if not(public.account_access()->>'mobileAllowed')::boolean then raise exception 'Verified phone-only account denied';end if;end$$;
reset role;
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$begin
 begin perform public.payment_dashboard('{}'); raise exception 'member revenue leak'; exception when insufficient_privilege then null; end;
end$$;
reset role;
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
set local role authenticated;
select public.permission_update('ee000000-0000-4000-8000-000000000002','revenue.read',true,null,0,'Finance read access');
do $$declare g jsonb;begin
 g:=public.permission_group_update('{"action":"save","name":"Custom Finance QA","revision":0,"permissions":["payments.read"]}','Create finance test group');
 perform public.permission_group_update(jsonb_build_object('action','member','id',g->>'id','userId','ee000000-0000-4000-8000-000000000004','enabled',true),'Grant finance group access');
 perform public.permission_update('ee000000-0000-4000-8000-000000000004','payments.read',false,null,0,'Explicit deny overrides group');
 if(public.admin_portal('users','{"search":"84901234567"}')->>'total')::int<>1 then raise exception 'Phone user search failed';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$begin
 perform public.payment_dashboard('{}');
 if not (public.account_access()->>'mobileAllowed')::boolean then raise exception 'delegated user lost personal app';end if;
 begin perform public.permission_update('ee000000-0000-4000-8000-000000000002','permissions.manage',true,null,0,'Escalation attempt');raise exception 'self escalation';exception when insufficient_privilege then null;end;
 begin perform public.payment_orders(null,null,null);raise exception 'revenue permission leaked payment logs';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$begin
 begin perform public.permission_update('ee000000-0000-4000-8000-000000000002','revenue.read',false,null,0,'Stale revision');raise exception 'stale permission overwrite';exception when sqlstate 'PT409' then null;end;
end$$;
reset role;
-- Explicit server-side catalog only; disabled by default until prices approved.
insert into public.billing_catalog(sku,tier,months,amount,enabled) values('fixture_month','plus',1,2000,true);
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select public.payment_reserve('fixture_month','fixture-key-0001');
select public.payment_reserve('fixture_month','fixture-key-0001');
do $$begin
 if (select count(*) from public.billing_orders where user_id=auth.uid())<>1 then raise exception 'duplicate idempotent order';end if;
 begin insert into public.billing_orders(user_id,sku,tier,months,amount,idempotency_key) values(auth.uid(),'fixture_month','plus',1,1,'tamper');raise exception 'client writes payment';exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$declare o public.billing_orders; r jsonb;begin
 select * into strict o from public.billing_orders where idempotency_key='fixture-key-0001';
 perform public.payment_attach(o.id,jsonb_build_object('paymentLinkId','fixture-link','checkoutUrl','https://pay.payos.vn/fixture','qrCode','fixture'));
 r:=jsonb_build_object('orderCode',o.order_code,'paymentLinkId','fixture-link','amount',2000,'currency','VND','code','00','reference','fixture-ref','accountNumber','fixture-bank','transactionDateTime',now()::text);
 begin perform public.payment_receive(r-'code','fixture-bank');raise exception 'Unsigned success code not required';exception when invalid_parameter_value then null;end;
 begin perform public.payment_receive(r||'{"currency":"USD"}','fixture-bank');raise exception 'Wrong currency accepted';exception when invalid_parameter_value then null;end;
 begin perform public.payment_receive(r||'{"accountNumber":"other-bank"}','fixture-bank');raise exception 'Wrong receiver accepted';exception when invalid_parameter_value then null;end;
 perform public.payment_receive(r,'fixture-bank');
 perform public.payment_receive(r,'fixture-bank');
 if (select count(*) from public.payment_transactions where reference='fixture-ref')<>1 then raise exception 'duplicate transaction';end if;
 if (select count(*) from public.payment_entitlement_grants where order_id=o.id)<>1 then raise exception 'duplicate grant';end if;
 if (select status from public.billing_orders where id=o.id)<>'paid' then raise exception 'payment not settled';end if;
 perform public.payment_state(o.id,'CANCELLED');
 if (select status from public.billing_orders where id=o.id)<>'paid' then raise exception 'late cancel regressed paid';end if;
end$$;
set local role authenticated;
do $$begin if public.current_plan()<>'plus' then raise exception 'payos entitlement missing';end if;end$$;
reset role;
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000003',true);
set local role authenticated;
do $$begin
 if exists(select 1 from public.billing_orders) then raise exception 'other user order leak';end if;
 begin perform public.payment_receive('{}','fixture-bank');raise exception 'client provider spoof';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000004',true);
set local role authenticated;
do $$begin
 begin perform public.payment_orders(null,null,null);raise exception 'Explicit deny ignored group';exception when insufficient_privilege then null;end;
end$$;
reset role;
-- PIN attempts persist independently of failed HTTP responses.
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000003',true);
insert into auth.sessions(id,user_id) values('ee000000-0000-4000-8000-000000000009','ee000000-0000-4000-8000-000000000003');
select public.quick_login_save('ee000000-0000-4000-8000-000000000003','ee000000-0000-4000-8000-000000000009',repeat('a',64),repeat('b',64),'encrypted-fixture');
select set_config('request.jwt.claims','{"session_id":"ee000000-0000-4000-8000-000000000009","aal":"aal1"}',true);
set local role authenticated;
do $$begin
 if public.is_account_active() then raise exception 'locked session still active';end if;
 begin perform public.quick_login_attempt(repeat('a',64));raise exception 'client read PIN vault';exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$declare r jsonb;begin
 for i in 1..5 loop
  r:=public.quick_login_attempt(repeat('a',64));
  if not(r->>'allowed')::boolean then raise exception 'attempt unexpectedly denied';end if;
  if(public.quick_login_attempt(repeat('a',64))->>'allowed')::boolean then raise exception 'parallel PIN attempt admitted';end if;
  perform public.quick_login_finish(repeat('a',64),(r->>'lease')::uuid,null);
 end loop;
 if(public.quick_login_attempt(repeat('a',64))->>'allowed')::boolean then raise exception 'PIN brute force unbounded';end if;
end$$;
select public.quick_login_revoke(repeat('a',64));
set local role authenticated;
do $$begin if public.is_account_active() then raise exception 'revoked PIN restored session';end if;end$$;
reset role;
-- A valid PIN unlocks the same session; a later lock reuses the binding.
insert into auth.sessions(id,user_id) values('ee000000-0000-4000-8000-000000000010','ee000000-0000-4000-8000-000000000003');
select public.quick_login_save('ee000000-0000-4000-8000-000000000003','ee000000-0000-4000-8000-000000000010',repeat('c',64),repeat('d',64),'cipher-v1');
do $$declare r jsonb;begin
 r:=public.quick_login_attempt(repeat('c',64));
 if not(public.quick_login_finish(repeat('c',64),(r->>'lease')::uuid,'cipher-v2')->>'updated')::boolean then raise exception 'Valid PIN completion rejected';end if;
end$$;
select set_config('request.jwt.claims','{"session_id":"ee000000-0000-4000-8000-000000000010","aal":"aal1"}',true);
set local role authenticated;
do $$begin if not public.is_account_active() then raise exception 'Unlocked session still blocked';end if;end$$;
reset role;
select public.quick_login_lock(repeat('c',64),'ee000000-0000-4000-8000-000000000003','ee000000-0000-4000-8000-000000000010','cipher-v3');
set local role authenticated;
do $$begin if public.is_account_active() then raise exception 'Relocked session still active';end if;end$$;
reset role;
rollback;
