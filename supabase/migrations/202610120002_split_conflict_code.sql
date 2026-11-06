-- 40001 is reserved for serialization failures and may be retried by an
-- upstream pool/proxy. Split conflicts are business conflicts, so expose them
-- as 23514; the Dart API maps this code to HTTP 409.
do $$
declare
  definition text;
begin
  select pg_get_functiondef(
    'public.set_transaction_splits(uuid,bigint,jsonb)'::regprocedure
  ) into definition;

  if position('40001' in definition) = 0 then
    raise exception 'set_transaction_splits does not contain the expected conflict code';
  end if;

  execute replace(definition, '''40001''', '''23514''');
end;
$$;
