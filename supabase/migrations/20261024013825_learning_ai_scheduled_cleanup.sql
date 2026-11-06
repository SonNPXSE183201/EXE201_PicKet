-- Cleanup must keep running when generation is disabled or a worker is down.
-- https://supabase.com/docs/guides/cron/quickstart
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('picket-learning-ai-retention','17 * * * *',
 'select public.prune_learning_ai_jobs();');
-- Cron run records contain no prompts/results, but still need finite retention.
select cron.schedule('picket-learning-ai-cron-history','31 2 * * *',
 $cleanup$delete from cron.job_run_details where end_time<now()-interval '7 days'
 and jobid in(select jobid from cron.job where jobname in
 ('picket-learning-ai-retention','picket-learning-ai-cron-history'));$cleanup$);
