-- These functions are trigger entry points, not client RPCs.
-- PostgreSQL invokes existing triggers without granting clients direct EXECUTE.
revoke all on function public.enforce_maintenance() from public, anon, authenticated;
revoke all on function public.reject_suspended_snapshot() from public, anon, authenticated;
