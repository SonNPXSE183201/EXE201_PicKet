begin;
do $$ begin
 if to_regprocedure('public.load_cashflow_ledger_snapshot()') is null then raise exception 'Missing atomic ledger snapshot'; end if;
 if has_function_privilege('anon','public.load_cashflow_ledger_snapshot()','EXECUTE') then raise exception 'Anonymous ledger snapshot'; end if;
end $$;
insert into auth.users(id,email) values('99999999-1234-4321-8123-123456789001','ledger-a@example.test'),('99999999-1234-4321-8123-123456789002','ledger-b@example.test');
insert into public.profiles(id) values('99999999-1234-4321-8123-123456789001'),('99999999-1234-4321-8123-123456789002') on conflict do nothing;
insert into public.wallets(id,user_id,name,kind,currency_code,opening_balance) values('99999999-1234-4321-8123-123456789011','99999999-1234-4321-8123-123456789001','Private wallet','cash','VND',100000);
insert into public.transactions(id,user_id,wallet_id,title,amount,kind,occurred_at,note) values('99999999-1234-4321-8123-123456789021','99999999-1234-4321-8123-123456789001','99999999-1234-4321-8123-123456789011','Private merchant',19000,'expense',now()-interval '1 day','private note');
set local role authenticated;
select set_config('request.jwt.claim.sub','99999999-1234-4321-8123-123456789001',true);
do $$ declare s jsonb; begin
 s:=public.load_cashflow_ledger_snapshot();
 if jsonb_array_length(s->'wallets')<>1 or jsonb_array_length(s->'entries')<>1 then raise exception 'Missing ledger facts'; end if;
 if s::text like '%Private merchant%' or s::text like '%private note%' then raise exception 'Unneeded personal text included'; end if;
 if s->'confirmations'->0->>'source'<>'cloud-verified' then raise exception 'Missing server provenance'; end if;
 if s->'confirmations'->0->>'confirmedAt'<>s->>'asOf' then raise exception 'Inconsistent confirmation origin'; end if;
end $$;
select set_config('request.jwt.claim.sub','99999999-1234-4321-8123-123456789002',true);
do $$ begin
 if jsonb_array_length(public.load_cashflow_ledger_snapshot()->'entries')<>0 or jsonb_array_length(public.load_cashflow_ledger_snapshot()->'wallets')<>0 then raise exception 'Ledger owner leak'; end if;
end $$;
rollback;
