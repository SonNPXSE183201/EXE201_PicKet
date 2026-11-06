-- One MVCC statement, one origin, only fields needed by deterministic arithmetic.
create function public.load_cashflow_ledger_snapshot() returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare o uuid:=auth.uid(); result jsonb;
begin
 if o is null or not public.is_account_active() then raise exception 'Active account required' using errcode='42501'; end if;
 if (select count(*) from public.wallets where user_id=o)>1000 or
    (select count(*) from public.transactions where user_id=o)>100000 then
  raise exception 'Ledger scope too large' using errcode='22023';
 end if;
 select jsonb_build_object('asOf',now(),'wallets',
  coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'currencyCode',w.currency_code,
   'openingBalance',w.opening_balance,'archived',w.archived_at is not null,'deletedAt',null,'updatedAt',w.updated_at) order by w.id)
   from public.wallets w where w.user_id=o),'[]'::jsonb),
  'entries',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'accountId',t.wallet_id,
   'destinationAccountId',t.destination_wallet_id,'kind',t.kind,'amount',t.amount,
   'occurredAt',t.occurred_at,'deletedAt',t.deleted_at,'updatedAt',t.updated_at) order by t.id)
   from public.transactions t where t.user_id=o),'[]'::jsonb),
  'confirmations',coalesce((select jsonb_agg(jsonb_build_object('transactionId',t.id,'confirmedAt',now(),'source','cloud-verified') order by t.id)
   from public.transactions t where t.user_id=o),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.load_cashflow_ledger_snapshot() from public,anon;
grant execute on function public.load_cashflow_ledger_snapshot() to authenticated;
