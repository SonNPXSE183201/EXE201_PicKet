begin;
insert into auth.users(id,email) values('55555555-1234-4321-8123-123456789001','restore-round-trip@example.test');
insert into public.profiles(id) values('55555555-1234-4321-8123-123456789001') on conflict do nothing;
insert into public.wallets(id,user_id,name,opening_balance,currency_code) values
 ('55555555-1234-4321-8123-123456789011','55555555-1234-4321-8123-123456789001','Cash',500000,'VND'),
 ('55555555-1234-4321-8123-123456789012','55555555-1234-4321-8123-123456789001','Bank',800000,'VND');
insert into public.categories(id,user_id,name,kind,is_custom) values
 ('55555555-1234-4321-8123-123456789031','55555555-1234-4321-8123-123456789001','QA Food','expense',true),
 ('55555555-1234-4321-8123-123456789032','55555555-1234-4321-8123-123456789001','QA Fun','both',true);
insert into public.transactions(id,user_id,wallet_id,destination_wallet_id,title,amount,kind,occurred_at,note) values
 ('55555555-1234-4321-8123-123456789021','55555555-1234-4321-8123-123456789001','55555555-1234-4321-8123-123456789011','55555555-1234-4321-8123-123456789012','QA transfer',100000,'transfer',date_trunc('month',now())-interval '10 day','');
insert into public.transactions(id,user_id,wallet_id,category_id,title,amount,kind,occurred_at,note) values
 ('55555555-1234-4321-8123-123456789022','55555555-1234-4321-8123-123456789001','55555555-1234-4321-8123-123456789011','55555555-1234-4321-8123-123456789031','QA lunch',90000,'expense',date_trunc('month',now())-interval '9 day',''),
 ('55555555-1234-4321-8123-123456789023','55555555-1234-4321-8123-123456789001','55555555-1234-4321-8123-123456789012','55555555-1234-4321-8123-123456789032','QA salary',2000000,'income',now()-interval '1 day','');
insert into public.transactions(id,user_id,wallet_id,category_id,refund_of,title,amount,kind,occurred_at,note) values
 ('55555555-1234-4321-8123-123456789024','55555555-1234-4321-8123-123456789001','55555555-1234-4321-8123-123456789011','55555555-1234-4321-8123-123456789031','55555555-1234-4321-8123-123456789022','QA refund',10000,'refund',now()-interval '1 day','');
insert into public.transaction_splits(user_id,transaction_id,category_id,amount) values
 ('55555555-1234-4321-8123-123456789001','55555555-1234-4321-8123-123456789022','55555555-1234-4321-8123-123456789031',60000),
 ('55555555-1234-4321-8123-123456789001','55555555-1234-4321-8123-123456789022','55555555-1234-4321-8123-123456789032',30000);
insert into public.receipts(user_id,transaction_id,storage_path,review_required) values
 ('55555555-1234-4321-8123-123456789001','55555555-1234-4321-8123-123456789022','55555555-1234-4321-8123-123456789001/receipts/qa.jpg',false);
insert into public.budgets(id,user_id,category_id,name,default_limit) values
 ('55555555-1234-4321-8123-123456789041','55555555-1234-4321-8123-123456789001','55555555-1234-4321-8123-123456789031','QA Food',300000);
insert into public.bills(id,user_id,title,amount,due_at,status) values
 ('55555555-1234-4321-8123-123456789051','55555555-1234-4321-8123-123456789001','QA bill',150000,now()+interval '5 day','pending');
insert into public.subscriptions(id,user_id,title,amount,cadence,next_due_at,cycle_months) values
 ('55555555-1234-4321-8123-123456789061','55555555-1234-4321-8123-123456789001','QA sub',99000,'monthly',now()+interval '9 day',1);
insert into public.keepsakes(id,user_id,title,amount,purchased_at,note,category_name) values
 ('55555555-1234-4321-8123-123456789071','55555555-1234-4321-8123-123456789001','QA keepsake',500000,now()-interval '3 day','','Khác');
set local role authenticated;
select set_config('request.jwt.claim.sub','55555555-1234-4321-8123-123456789001',true);
-- The live test closes the previous month before exporting.
select public.close_budget_month((date_trunc('month',now())-interval '1 month')::date,false,'QA');
do $$ declare snapshot jsonb; payload jsonb; revision bigint;
begin
 snapshot:=public.load_normalized_finance(); payload:=snapshot->'payload';
 if jsonb_array_length(payload->'closedMonths')<>1 then raise exception 'Closed month missing from export'; end if;
 -- Export -> restore round trip (previously 23505 on month_closes).
 revision:=public.save_normalized_finance((snapshot->>'revision')::bigint,payload);
 if (select count(*) from public.month_closes where user_id=auth.uid())<>1 then raise exception 'Closed month not restored once'; end if;
 if (select rollover_payload->>'rollover' from public.month_closes where user_id=auth.uid()) is distinct from 'false' then raise exception 'Server-side close details lost'; end if;
 if (select count(*) from public.transactions where user_id=auth.uid())<>4 then raise exception 'Transactions not restored'; end if;
 if (select count(*) from public.transaction_splits where user_id=auth.uid())<>2 then raise exception 'Splits not restored'; end if;
 if (select category_id from public.transactions where id='55555555-1234-4321-8123-123456789021') is not null then raise exception 'Transfer category restored'; end if;
 if (select category_id from public.budgets where id='55555555-1234-4321-8123-123456789041')<>'55555555-1234-4321-8123-123456789031' then raise exception 'Budget category id changed'; end if;
 -- A second restore of the same file is idempotent.
 revision:=public.save_normalized_finance(revision,payload);
 if (select count(*) from public.month_closes where user_id=auth.uid())<>1 then raise exception 'Closed month duplicated'; end if;
 -- Restoring a backup without closed months reopens them.
 payload:=jsonb_set(payload,'{closedMonths}','[]'::jsonb);
 revision:=public.save_normalized_finance(revision,payload);
 if exists(select 1 from public.month_closes where user_id=auth.uid()) then raise exception 'Closed month kept after restoring an open-month backup'; end if;
end $$;
-- Production variant: a closed month with no data in it (23505 before the fix).
reset role;
insert into auth.users(id,email) values('55555555-1234-4321-8123-123456789002','restore-empty-close@example.test');
insert into public.profiles(id) values('55555555-1234-4321-8123-123456789002') on conflict do nothing;
insert into public.wallets(id,user_id,name,opening_balance,currency_code) values
 ('55555555-1234-4321-8123-123456789013','55555555-1234-4321-8123-123456789002','Cash',0,'VND');
set local role authenticated;
select set_config('request.jwt.claim.sub','55555555-1234-4321-8123-123456789002',true);
select public.close_budget_month((date_trunc('month',now())-interval '2 month')::date,false,'empty');
do $$ declare snapshot jsonb;
begin
 snapshot:=public.load_normalized_finance();
 perform public.save_normalized_finance((snapshot->>'revision')::bigint,snapshot->'payload');
 if (select count(*) from public.month_closes where user_id=auth.uid())<>1 then raise exception 'Empty closed month not restored'; end if;
end $$;
rollback;
