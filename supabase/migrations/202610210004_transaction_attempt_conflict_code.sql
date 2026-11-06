-- A permanent fence is a definitive conflict, never a serialization retry.
-- Preserve the deployed function body and change only this named rejection.
do $$
declare
  definition text := pg_get_functiondef('public.create_finance_transaction(text,uuid,uuid,text,bigint,text,timestamptz,text)'::regprocedure);
  old_clause text := '''TRANSACTION_ATTEMPT_ABANDONED'' using errcode=''40001''';
  new_clause text := '''TRANSACTION_ATTEMPT_ABANDONED'' using errcode=''23505''';
begin
  if position(old_clause in definition)=0 then
    raise exception 'Expected transaction attempt fence clause not found';
  end if;
  execute replace(definition,old_clause,new_clause);
end;
$$;
