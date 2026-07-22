-- =========================================================
-- RomDoc Step 87
-- Remove the custom application-level API rate-limit system
--
-- Exact destination:
-- ROMDOC/database/87-remove-api-rate-limits.sql
--
-- This migration intentionally keeps all storage upload limits.
-- It removes only:
--   1. public.consume_api_rate_limit(...)
--   2. public.api_rate_limits
-- =========================================================

begin;

drop function if exists
  public.consume_api_rate_limit(
    text,
    integer,
    integer
  );

drop table if exists
  public.api_rate_limits;

commit;

-- ---------------------------------------------------------
-- Verification
-- Both results should be null.
-- ---------------------------------------------------------

select
  to_regprocedure(
    'public.consume_api_rate_limit(text,integer,integer)'
  ) as rate_limit_function;

select
  to_regclass(
    'public.api_rate_limits'
  ) as rate_limit_table;
