-- Integrity triggers must also run during service-role purges and auth-user
-- cascades. Their fixed empty search_path prevents object-shadowing attacks.
alter function public.reject_closed_month_transaction() security definer;
alter function public.validate_transaction_change() security definer;
alter function public.validate_transaction_split_change() security definer;
alter function public.check_transaction_split_total() security definer;
