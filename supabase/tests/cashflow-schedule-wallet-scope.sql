begin;
do $$ begin
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='cashflow_schedules' and column_name='wallet_id') then raise exception 'Missing schedule wallet scope'; end if;
end $$;
insert into auth.users(id,email) values('55555555-1234-4321-8123-123456789001','scope-a@example.test'),('55555555-1234-4321-8123-123456789002','scope-b@example.test');
insert into public.profiles(id) values('55555555-1234-4321-8123-123456789001'),('55555555-1234-4321-8123-123456789002') on conflict do nothing;
insert into public.wallets(id,user_id,name,kind,currency_code,opening_balance) values
 ('55555555-1234-4321-8123-123456789011','55555555-1234-4321-8123-123456789001','Own','cash','VND',0),
 ('55555555-1234-4321-8123-123456789012','55555555-1234-4321-8123-123456789002','Foreign','cash','VND',0),
 ('55555555-1234-4321-8123-123456789013','55555555-1234-4321-8123-123456789001','USD','cash','USD',0);
set local role authenticated;
select set_config('request.jwt.claim.sub','55555555-1234-4321-8123-123456789001',true);
do $$
declare schedule jsonb:='{"id":"55555555-1234-4321-8123-123456789021","walletId":"55555555-1234-4321-8123-123456789011","startDay":"2026-10-24","frequency":"monthly","amount":-19000,"currency":"VND","active":true}'; result jsonb; wallet text;
begin
 result:=public.mutate_cashflow_schedule('wallet-scope-save',0,'save',schedule);
 if result->'schedules'->0->>'walletId'<>schedule->>'walletId' then raise exception 'Wallet scope lost'; end if;
 if public.mutate_cashflow_schedule('wallet-scope-save',0,'save',schedule)<>result then raise exception 'Replay changed wallet'; end if;
 foreach wallet in array array['55555555-1234-4321-8123-123456789012','55555555-1234-4321-8123-123456789013','55555555-1234-4321-8123-123456789099'] loop
  begin
   perform public.mutate_cashflow_schedule('wallet-invalid-'||right(wallet,3),1,'save',jsonb_set(schedule,'{walletId}',to_jsonb(wallet)));
   raise exception 'Foreign/missing/cross-currency wallet accepted';
  exception when invalid_parameter_value then null;
  end;
 end loop;
 if (public.load_cashflow_schedules()->>'revision')::int<>1 then raise exception 'Invalid writes advanced revision'; end if;
end $$;
reset role;
-- A finance restore replaces wallets. It must not be blocked by scenario links.
delete from public.wallets where id='55555555-1234-4321-8123-123456789011';
do $$ begin
 if exists(select 1 from public.cashflow_schedules where user_id='55555555-1234-4321-8123-123456789001' and wallet_id is not null) then raise exception 'Deleted wallet left a trusted scope'; end if;
end $$;
rollback;
