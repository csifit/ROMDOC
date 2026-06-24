-- =========================================================
-- RomDoc Step 66D
-- API rate limiting, abuse protection, and 2 MB upload limits
--
-- Exact destination:
-- ROMDOC/database/46-api-rate-limits-and-upload-limits.sql
-- =========================================================

begin;

-- ---------------------------------------------------------
-- 1. Enforce a 2 MB bucket-level limit
-- ---------------------------------------------------------

update storage.buckets
set file_size_limit = 2 * 1024 * 1024
where id in (
  'doctor-profile-photos',
  'doctor-photo-staging',
  'doctor-verification-documents',
  'patient-medical-folder'
);

-- ---------------------------------------------------------
-- 2. Persistent API rate-limit state
--
-- Server-only table. No client policies are intentionally added.
-- ---------------------------------------------------------

create table if not exists public.api_rate_limits (
  rate_limit_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),

  constraint api_rate_limits_request_count_nonnegative
    check (request_count >= 0)
);

alter table public.api_rate_limits
  enable row level security;

revoke all
on table public.api_rate_limits
from public, anon, authenticated;

grant select, insert, update, delete
on table public.api_rate_limits
to service_role;

create index if not exists
  idx_api_rate_limits_updated_at
on public.api_rate_limits (
  updated_at
);

-- ---------------------------------------------------------
-- 3. Atomic rate-limit RPC
--
-- Callable only by service_role. Application routes call this
-- through createAdminClient().
-- ---------------------------------------------------------

create or replace function public.consume_api_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_time timestamptz := clock_timestamp();
  current_row public.api_rate_limits%rowtype;
  elapsed_seconds integer;
begin
  if p_key is null or length(trim(p_key)) < 3 then
    raise exception 'invalid_rate_limit_key'
      using errcode = '22023';
  end if;

  if p_limit < 1 or p_limit > 10000 then
    raise exception 'invalid_rate_limit_limit'
      using errcode = '22023';
  end if;

  if p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid_rate_limit_window'
      using errcode = '22023';
  end if;

  -- Serialize requests for the same key.
  perform pg_advisory_xact_lock(
    hashtextextended(p_key, 0)
  );

  select *
  into current_row
  from public.api_rate_limits
  where rate_limit_key = p_key
  for update;

  if not found then
    insert into public.api_rate_limits (
      rate_limit_key,
      window_started_at,
      request_count,
      updated_at
    )
    values (
      p_key,
      current_time,
      1,
      current_time
    );

    return query
    select
      true,
      greatest(p_limit - 1, 0),
      0;

    return;
  end if;

  elapsed_seconds :=
    floor(
      extract(
        epoch from (
          current_time -
          current_row.window_started_at
        )
      )
    )::integer;

  if elapsed_seconds >= p_window_seconds then
    update public.api_rate_limits
    set
      window_started_at = current_time,
      request_count = 1,
      updated_at = current_time
    where rate_limit_key = p_key;

    return query
    select
      true,
      greatest(p_limit - 1, 0),
      0;

    return;
  end if;

  if current_row.request_count >= p_limit then
    return query
    select
      false,
      0,
      greatest(
        p_window_seconds - elapsed_seconds,
        1
      );

    return;
  end if;

  update public.api_rate_limits
  set
    request_count =
      current_row.request_count + 1,
    updated_at = current_time
  where rate_limit_key = p_key;

  return query
  select
    true,
    greatest(
      p_limit -
      current_row.request_count -
      1,
      0
    ),
    0;
end;
$$;

revoke all
on function public.consume_api_rate_limit(
  text,
  integer,
  integer
)
from public, anon, authenticated;

grant execute
on function public.consume_api_rate_limit(
  text,
  integer,
  integer
)
to service_role;

commit;

-- ---------------------------------------------------------
-- Verification
-- ---------------------------------------------------------

select
  id,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id in (
  'doctor-profile-photos',
  'doctor-photo-staging',
  'doctor-verification-documents',
  'patient-medical-folder'
)
order by id;

select
  has_function_privilege(
    'anon',
    'public.consume_api_rate_limit(text,integer,integer)',
    'EXECUTE'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated',
    'public.consume_api_rate_limit(text,integer,integer)',
    'EXECUTE'
  ) as authenticated_can_execute,
  has_function_privilege(
    'service_role',
    'public.consume_api_rate_limit(text,integer,integer)',
    'EXECUTE'
  ) as service_role_can_execute;
