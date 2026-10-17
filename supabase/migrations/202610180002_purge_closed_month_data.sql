-- Account deletion may remove closed-month data, but ordinary edits remain locked.
-- Remove the owner's close markers before split and transaction delete triggers run.
create or replace function public.purge_user_data(p_user_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    raise exception 'User id is required' using errcode = '22023';
  end if;

  delete from public.month_closes where user_id = p_user_id;
  delete from public.receipt_line_items where user_id = p_user_id;
  delete from public.transaction_splits where user_id = p_user_id;
  delete from public.receipts where user_id = p_user_id;
  delete from public.ocr_fallback_jobs where user_id = p_user_id;
  delete from public.idempotency_keys where user_id = p_user_id;
  delete from public.reminders where user_id = p_user_id;
  delete from public.reconciliations where user_id = p_user_id;
  delete from public.keepsakes where user_id = p_user_id;
  delete from public.bills where user_id = p_user_id;
  delete from public.subscriptions where user_id = p_user_id;
  delete from public.budget_periods where user_id = p_user_id;
  delete from public.budgets where user_id = p_user_id;

  delete from public.transactions
    where user_id = p_user_id and refund_of is not null;
  delete from public.transactions where user_id = p_user_id;
  delete from public.categories where user_id = p_user_id;
  delete from public.wallets where user_id = p_user_id;

  delete from public.user_preferences where user_id = p_user_id;
  delete from public.finance_snapshots where user_id = p_user_id;
  delete from public.play_purchases where user_id = p_user_id;
  delete from public.plan_grants where user_id = p_user_id;
  delete from public.ocr_events where user_id = p_user_id;
  delete from public.staff_members where user_id = p_user_id;
  delete from public.profiles where id = p_user_id;
end;
$$;

revoke all on function public.purge_user_data(uuid) from public, anon, authenticated;
grant execute on function public.purge_user_data(uuid) to service_role;
