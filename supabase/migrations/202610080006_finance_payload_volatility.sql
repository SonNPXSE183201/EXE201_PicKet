-- The validator performs casts whose PostgreSQL volatility is STABLE. Marking
-- the wrapper IMMUTABLE can let the planner reuse results too aggressively.
alter function public.valid_finance_payload(jsonb) stable;
