-- SQLSTATE 40001 is reserved for serialization failures and can be retried by
-- PostgREST's upstream stack. A stale receipt version is a business conflict,
-- so return the same non-retryable constraint code used by transaction splits.
do $$
declare
  definition text;
begin
  select pg_get_functiondef(
    'public.update_receipt_record(uuid,bigint,text,bigint,timestamptz,boolean,jsonb)'::regprocedure
  ) into definition;

  if position('40001' in definition) = 0 then
    raise exception 'update_receipt_record does not contain the expected conflict code';
  end if;

  execute replace(definition, '''40001''', '''23514''');
end;
$$;
