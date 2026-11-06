begin;
do $$ begin
 if not exists(select 1 from pg_extension where extname='pg_cron') then raise exception 'No database retention scheduler'; end if;
 if not exists(select 1 from cron.job where jobname='picket-learning-ai-retention' and active and command='select public.prune_learning_ai_jobs();') then raise exception 'No active AI retention job'; end if;
end $$;
rollback;
