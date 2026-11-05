begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('ed000000-0000-4000-8000-000000000001','ledger-owner@example.test',now()),
 ('ed000000-0000-4000-8000-000000000002','ledger-buyer@example.test',now()),
 ('ed000000-0000-4000-8000-000000000003','ledger-play@example.test',now());
insert into public.staff_members(user_id,role) values('ed000000-0000-4000-8000-000000000001','owner');
insert into public.billing_catalog(sku,tier,months,amount,enabled) values('ledger_fixture','plus',1,3000,true);

-- PayOS: paid order lands in the ledger as confirmed VND revenue.
select set_config('request.jwt.claim.sub','ed000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select public.payment_reserve('ledger_fixture','ledger-key-0001');
reset role;
do $$declare o public.billing_orders;begin
 select * into strict o from public.billing_orders where idempotency_key='ledger-key-0001';
 perform public.payment_attach(o.id,jsonb_build_object('paymentLinkId','ledger-link','checkoutUrl','https://pay.payos.vn/l','qrCode','q'));
 perform public.payment_receive(jsonb_build_object('orderCode',o.order_code,'paymentLinkId','ledger-link','amount',3000,'currency','VND','code','00','reference','ledger-ref-1','accountNumber','fixture-bank','transactionDateTime',now()::text),'fixture-bank');
 if (select status from public.revenue_ledger where source='payos' and external_ref='ledger-ref-1')<>'confirmed' then raise exception 'payos revenue not confirmed';end if;
 if (select payment_order_id from public.revenue_ledger where external_ref='ledger-ref-1')<>o.id then raise exception 'payos row not traceable to order';end if;
 -- A second transfer after the plan is active is money to refund, not revenue.
 perform public.payment_receive(jsonb_build_object('orderCode',o.order_code,'paymentLinkId','ledger-link','amount',3000,'currency','VND','code','00','reference','ledger-ref-2','accountNumber','fixture-bank','transactionDateTime',now()::text),'fixture-bank');
 if (select status from public.revenue_ledger where external_ref='ledger-ref-2')<>'review' then raise exception 'excess transfer counted as revenue';end if;
 if (select status from public.revenue_ledger where external_ref='ledger-ref-1')<>'confirmed' then raise exception 'original charge demoted';end if;
end$$;

-- Google Play: verification records an estimate; the sales report confirms it.
do $$declare r jsonb;begin
 perform public.revenue_record_play_order('GPA.1234-5678-9012-34567','ed000000-0000-4000-8000-000000000003','picket_plus_monthly','hash-1',false,now());
 perform public.revenue_record_play_order('GPA.1234-5678-9012-34567','ed000000-0000-4000-8000-000000000003','picket_plus_monthly','hash-1',false,now());
 if (select count(*) from public.revenue_ledger where source='google_play')<>1 then raise exception 'duplicate play order';end if;
 if (select status from public.revenue_ledger where external_ref='GPA.1234-5678-9012-34567')<>'estimated' then raise exception 'play order not estimated';end if;
 if (public.revenue_record_play_order('not-an-order',null,'x',null,false,now())->>'ignored')::boolean is not true then raise exception 'bad order id accepted';end if;
 r:=public.revenue_ingest_play_report(jsonb_build_array(
  jsonb_build_object('orderNumber','GPA.1234-5678-9012-34567','status','charged','currency','VND','amount','18000','chargedAt','2026-11-05T01:00:00Z','sku','picket_plus_monthly'),
  jsonb_build_object('orderNumber','GPA.1234-5678-9012-34567','status','refund','currency','VND','amount','-18000','chargedAt','2026-11-05T02:00:00Z'),
  jsonb_build_object('orderNumber','GPA.9999-0000-1111-22222','status','charged','currency','USD','amount','1.99','chargedAt','2026-11-05T03:00:00Z')),'salesreport_202611.zip');
 if (r->>'confirmed')::int<>1 or (r->>'inserted')::int<>2 then raise exception 'report ingest counts wrong: %',r;end if;
 if (select amount_vnd from public.revenue_ledger where external_ref='GPA.1234-5678-9012-34567' and kind='charge')<>18000 then raise exception 'report amount not applied';end if;
 if (select user_id from public.revenue_ledger where external_ref='GPA.1234-5678-9012-34567' and kind='refund') is distinct from 'ed000000-0000-4000-8000-000000000003' then raise exception 'refund not attributed';end if;
 if (select count(*) from public.revenue_ledger_history)<1 then raise exception 'confirmation history missing';end if;
 -- Settled rows can be neither edited nor deleted.
 begin update public.revenue_ledger set amount_vnd=1 where external_ref='ledger-ref-1'; raise exception 'confirmed row edited'; exception when insufficient_privilege then null; end;
 begin delete from public.revenue_ledger where external_ref='ledger-ref-1'; raise exception 'ledger row deleted'; exception when insufficient_privilege then null; end;
end$$;

-- Summary: confirmed revenue by source; review, test and FX rows kept apart.
select set_config('request.jwt.claim.sub','ed000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
set local role authenticated;
do $$declare s jsonb; adj jsonb;begin
 s:=public.revenue_summary(jsonb_build_object('from','2026-01-01T00:00:00Z'));
 if (s->>'confirmedVnd')::bigint<>3000 then raise exception 'confirmed total wrong: %',s->>'confirmedVnd';end if;
 if (s->>'reviewVnd')::bigint<>3000 then raise exception 'review total wrong';end if;
 if (select (x->>'confirmed')::bigint from jsonb_array_elements(s->'bySource') x where x->>'source'='google_play')<>0 then raise exception 'play net wrong: %',s->'bySource';end if;
 if (select (x->>'refunded')::bigint from jsonb_array_elements(s->'bySource') x where x->>'source'='google_play')<>18000 then raise exception 'play refund missing';end if;
 if jsonb_array_length(s->'unconverted')<>1 then raise exception 'USD row not reported as unconverted';end if;
 if jsonb_array_length(public.revenue_entries('{"source":"payos"}')->'entries')<>2 then raise exception 'entries filter wrong';end if;
 adj:=public.revenue_adjust(jsonb_build_object('ledgerId',(public.revenue_entries('{"ref":"ledger-ref-1"}')->'entries'->0->>'id')::bigint,'kind','refund','amountVnd',1000),'Customer refund QA');
 if (adj->>'amount_vnd')::bigint<>-1000 then raise exception 'adjustment amount wrong';end if;
 if (public.revenue_summary(jsonb_build_object('from','2026-01-01T00:00:00Z'))->>'confirmedVnd')::bigint<>2000 then raise exception 'refund not netted';end if;
end$$;
reset role;
-- Without MFA, adjustments are refused; members without permission see nothing.
select set_config('request.jwt.claims','{"aal":"aal1"}',true);
set local role authenticated;
do $$begin
 begin perform public.revenue_adjust('{"ledgerId":1,"amountVnd":1}','No MFA attempt'); raise exception 'adjust without MFA'; exception when insufficient_privilege then null; end;
end$$;
reset role;
select set_config('request.jwt.claim.sub','ed000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$begin
 begin perform public.revenue_summary('{}'); raise exception 'revenue leak'; exception when insufficient_privilege then null; end;
 begin perform count(*) from public.revenue_ledger; raise exception 'direct ledger read'; exception when insufficient_privilege then null; end;
end$$;
reset role;
rollback;
