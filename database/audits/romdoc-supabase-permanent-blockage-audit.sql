-- RomDoc permanent-blockage audit
-- Read-only: this script does not modify data or schema.
-- Run in Supabase Dashboard -> SQL Editor.

-- 1. Supabase Auth: explicit bans or deleted users
select
  id,
  email,
  banned_until,
  deleted_at,
  created_at,
  last_sign_in_at,
  case
    when banned_until is null then 'not_banned'
    when banned_until > now() + interval '100 years' then 'effectively_permanent_ban'
    when banned_until > now() then 'temporary_ban'
    else 'expired_ban'
  end as ban_assessment
from auth.users
where banned_until is not null
   or deleted_at is not null
order by banned_until desc nulls last;

-- 2. Profiles: status values and counts
select account_status, count(*) as users
from public.profiles
group by account_status
order by account_status;

select id, role, account_status, created_at, updated_at
from public.profiles
where coalesce(account_status, 'active') <> 'active'
order by updated_at desc nulls last;

-- 3. Columns that may represent blocking, disabling, or expiry
select table_schema, table_name, column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema in ('public', 'auth')
  and (
    column_name ilike '%block%'
    or column_name ilike '%ban%'
    or column_name ilike '%suspend%'
    or column_name ilike '%disable%'
    or column_name ilike '%lock%'
    or column_name ilike '%status%'
    or column_name ilike '%expire%'
    or column_name ilike '%until%'
    or column_name ilike '%revok%'
    or column_name ilike '%deleted%'
  )
order by table_schema, table_name, ordinal_position;

-- 4. Check constraints containing permanent-looking statuses
select
  n.nspname as schema_name,
  c.relname as table_name,
  con.conname as constraint_name,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and (
    pg_get_constraintdef(con.oid) ilike '%blocked%'
    or pg_get_constraintdef(con.oid) ilike '%banned%'
    or pg_get_constraintdef(con.oid) ilike '%disabled%'
    or pg_get_constraintdef(con.oid) ilike '%suspended%'
    or pg_get_constraintdef(con.oid) ilike '%revoked%'
    or pg_get_constraintdef(con.oid) ilike '%permanent%'
  )
order by c.relname, con.conname;

-- 5. Functions containing lockout/blocking logic
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (
    pg_get_functiondef(p.oid) ilike '%blocked%'
    or pg_get_functiondef(p.oid) ilike '%banned%'
    or pg_get_functiondef(p.oid) ilike '%disabled%'
    or pg_get_functiondef(p.oid) ilike '%suspended%'
    or pg_get_functiondef(p.oid) ilike '%revoked%'
    or pg_get_functiondef(p.oid) ilike '%permanent%'
    or pg_get_functiondef(p.oid) ilike '%consume_api_rate_limit%'
    or pg_get_functiondef(p.oid) ilike '%account_status%'
  )
order by p.proname;

-- 6. Triggers that can block or change account access
select event_object_schema, event_object_table, trigger_name, action_timing, event_manipulation, action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and (
    trigger_name ilike '%block%'
    or trigger_name ilike '%ban%'
    or trigger_name ilike '%suspend%'
    or trigger_name ilike '%disable%'
    or trigger_name ilike '%status%'
    or action_statement ilike '%account_status%'
  )
order by event_object_table, trigger_name;

-- 7. RLS policies that depend on blocking/status fields
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and (
    coalesce(qual, '') ilike '%account_status%'
    or coalesce(with_check, '') ilike '%account_status%'
    or coalesce(qual, '') ilike '%blocked%'
    or coalesce(with_check, '') ilike '%blocked%'
    or coalesce(qual, '') ilike '%banned%'
    or coalesce(with_check, '') ilike '%banned%'
    or coalesce(qual, '') ilike '%suspended%'
    or coalesce(with_check, '') ilike '%suspended%'
    or coalesce(qual, '') ilike '%disabled%'
    or coalesce(with_check, '') ilike '%disabled%'
  )
order by tablename, policyname;

-- 8. Rate-limit storage: discover likely tables
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and (
    table_name ilike '%rate%limit%'
    or table_name ilike '%attempt%'
    or table_name ilike '%lock%'
  )
order by table_name;

select table_name, column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema = 'public'
  and (
    table_name ilike '%rate%limit%'
    or table_name ilike '%attempt%'
    or table_name ilike '%lock%'
  )
order by table_name, ordinal_position;

-- 9. Known api_rate_limits table, when present
select *
from public.api_rate_limits
order by updated_at desc nulls last;

-- 10. Doctor, clinic and review statuses
select 'doctors' as source, status, count(*) as records
from public.doctors
group by status
union all
select 'clinics' as source, status, count(*) as records
from public.clinics
group by status
union all
select 'reviews' as source, status, count(*) as records
from public.reviews
group by status
order by source, status;

-- 11. Search view definitions for hidden status restrictions
select schemaname, viewname, definition
from pg_views
where schemaname = 'public'
  and (
    definition ilike '%account_status%'
    or definition ilike '%blocked%'
    or definition ilike '%banned%'
    or definition ilike '%suspended%'
    or definition ilike '%disabled%'
  )
order by viewname;

-- 12. Summary: account rows requiring human review
select
  p.id,
  p.role,
  p.account_status,
  u.email,
  u.banned_until,
  u.deleted_at,
  case
    when u.deleted_at is not null then 'deleted_auth_user'
    when u.banned_until > now() + interval '100 years' then 'effectively_permanent_auth_ban'
    when u.banned_until > now() then 'temporary_auth_ban'
    when coalesce(p.account_status, 'active') <> 'active' then 'non_active_profile'
    else 'active'
  end as review_reason
from public.profiles p
left join auth.users u on u.id = p.id
where u.deleted_at is not null
   or u.banned_until > now()
   or coalesce(p.account_status, 'active') <> 'active'
order by review_reason, p.role, u.email;
