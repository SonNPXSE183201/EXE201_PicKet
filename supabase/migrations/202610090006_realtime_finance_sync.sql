-- Publish user-owned finance slices for Expo multi-device invalidation. Realtime
-- still evaluates each table's RLS policy before sending a row to a client.
do $$
declare
  table_name text;
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    return;
  end if;

  foreach table_name in array array[
    'profiles',
    'user_preferences',
    'wallets',
    'categories',
    'transactions',
    'transaction_splits',
    'budgets'
  ] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        table_name
      );
    end if;
  end loop;
end;
$$;
