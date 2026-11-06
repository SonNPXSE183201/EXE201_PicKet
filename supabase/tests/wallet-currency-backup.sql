begin;
insert into auth.users(id,email) values('33333333-1234-4321-8123-123456789001','currency-backup@example.test');
insert into public.profiles(id) values('33333333-1234-4321-8123-123456789001') on conflict do nothing;
insert into public.user_preferences(user_id,currency_code) values('33333333-1234-4321-8123-123456789001','VND') on conflict(user_id) do update set currency_code='VND';
insert into public.wallets(id,user_id,name,opening_balance,currency_code) values
 ('33333333-1234-4321-8123-123456789011','33333333-1234-4321-8123-123456789001','VND wallet',1000,'VND'),
 ('33333333-1234-4321-8123-123456789012','33333333-1234-4321-8123-123456789001','USD wallet',-100,'USD');
set local role authenticated;
select set_config('request.jwt.claim.sub','33333333-1234-4321-8123-123456789001',true);
do $$ declare snapshot jsonb; payload jsonb; revision bigint;
begin
 snapshot:=public.load_normalized_finance(); payload:=snapshot->'payload';
 if not exists(select 1 from jsonb_array_elements(payload->'wallets') w where w->>'name'='USD wallet' and w->>'currencyCode'='USD') then raise exception 'Backup lost wallet currency'; end if;
 update public.wallets set currency_code='EUR' where user_id=auth.uid();
 revision:=public.save_normalized_finance((public.load_normalized_finance()->>'revision')::bigint,payload);
 if (select currency_code from public.wallets where id='33333333-1234-4321-8123-123456789011') is distinct from 'VND' then raise exception 'VND currency changed'; end if;
 if (select currency_code from public.wallets where id='33333333-1234-4321-8123-123456789012') is distinct from 'USD' then raise exception 'USD currency changed'; end if;
 if (select opening_balance from public.wallets where id='33333333-1234-4321-8123-123456789012')<>-100 then raise exception 'Opening balance changed'; end if;
 -- A legacy single-currency backup falls back to its preference, not today's setting.
 payload:=jsonb_set(payload,'{wallets}',(select jsonb_agg(w-'currencyCode') from jsonb_array_elements(payload->'wallets') w));
 payload:=jsonb_set(payload,'{preferences,currency}','"USD"');
 revision:=public.save_normalized_finance(revision,payload);
 if exists(select 1 from public.wallets where user_id=auth.uid() and currency_code<>'USD') then raise exception 'Legacy currency fallback changed'; end if;
end $$;
rollback;
