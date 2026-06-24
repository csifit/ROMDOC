-- =============================================================
-- RomDoc Step 66A — Supabase RLS and RPC permission audit
--
-- Exact destination:
-- ROMDOC/database/audits/44-supabase-rls-rpc-permission-audit.sql
--
-- READ-ONLY AUDIT:
-- - creates no tables
-- - changes no policies
-- - changes no grants
-- - changes no functions
--
-- Run each result set in Supabase SQL Editor while signed in as
-- the project owner. Save/export the results before remediation.
-- =============================================================

-- =============================================================
-- 1. PUBLIC TABLE RLS SUMMARY
-- Flags public tables where RLS is disabled or where RLS is
-- enabled but no policies exist.
-- Expected: rls_enabled = true for every client-accessible table.
-- =============================================================
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls_enabled,
  count(p.polname) as policy_count,
  case
    when c.relrowsecurity = false then 'CRITICAL: RLS disabled'
    when count(p.polname) = 0 then 'HIGH: RLS enabled but no policies'
    else 'OK'
  end as audit_status
from pg_class c
join pg_namespace n
  on n.oid = c.relnamespace
left join pg_policy p
  on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
group by
  n.nspname,
  c.relname,
  c.relrowsecurity,
  c.relforcerowsecurity
order by
  audit_status,
  c.relname;


-- =============================================================
-- 2. POLICY INVENTORY
-- Review every policy command, role, USING expression and
-- WITH CHECK expression.
-- permissive = true means policies are OR-combined.
-- =============================================================
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
from pg_policies
where schemaname in ('public', 'storage')
order by
  schemaname,
  tablename,
  cmd,
  policyname;


-- =============================================================
-- 3. POSSIBLY DANGEROUS WRITE POLICIES
-- Heuristic only. Every result requires manual review.
-- Flags INSERT/UPDATE/DELETE/ALL policies that:
-- - target PUBLIC/anon broadly;
-- - contain unconditional true expressions;
-- - have no WITH CHECK for INSERT/UPDATE/ALL.
-- =============================================================
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check,
  concat_ws(
    '; ',
    case
      when roles && array['public']::name[]
        then 'policy applies to PUBLIC'
    end,
    case
      when roles && array['anon']::name[]
        then 'policy applies to anon'
    end,
    case
      when lower(coalesce(qual, '')) in ('true', '(true)')
        then 'unconditional USING true'
    end,
    case
      when lower(coalesce(with_check, '')) in ('true', '(true)')
        then 'unconditional WITH CHECK true'
    end,
    case
      when cmd in ('INSERT', 'UPDATE', 'ALL')
       and with_check is null
        then 'missing WITH CHECK'
    end
  ) as risk_reason
from pg_policies
where schemaname in ('public', 'storage')
  and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  and (
    roles && array['public', 'anon']::name[]
    or lower(coalesce(qual, '')) in ('true', '(true)')
    or lower(coalesce(with_check, '')) in ('true', '(true)')
    or (
      cmd in ('INSERT', 'UPDATE', 'ALL')
      and with_check is null
    )
  )
order by
  schemaname,
  tablename,
  policyname;


-- =============================================================
-- 4. DIRECT TABLE PRIVILEGES FOR API ROLES
-- RLS does not replace GRANT checks. Review all direct privileges
-- held by anon and authenticated.
-- =============================================================
select
  grantee,
  table_schema,
  table_name,
  string_agg(privilege_type, ', ' order by privilege_type)
    as privileges
from information_schema.role_table_grants
where grantee in ('anon', 'authenticated')
  and table_schema in ('public', 'storage')
group by
  grantee,
  table_schema,
  table_name
order by
  table_schema,
  table_name,
  grantee;


-- =============================================================
-- 5. TABLES WITH WRITE GRANTS BUT RLS DISABLED
-- Expected: zero rows.
-- =============================================================
select distinct
  g.grantee,
  g.table_schema,
  g.table_name,
  g.privilege_type,
  c.relrowsecurity as rls_enabled
from information_schema.role_table_grants g
join pg_namespace n
  on n.nspname = g.table_schema
join pg_class c
  on c.relnamespace = n.oid
 and c.relname = g.table_name
where g.grantee in ('anon', 'authenticated')
  and g.table_schema in ('public', 'storage')
  and g.privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  and c.relrowsecurity = false
order by
  g.table_schema,
  g.table_name,
  g.grantee,
  g.privilege_type;


-- =============================================================
-- 6. COLUMN-LEVEL PRIVILEGES
-- Detect unusual grants that may not be visible in a table-level
-- privilege review.
-- =============================================================
select
  grantee,
  table_schema,
  table_name,
  column_name,
  privilege_type
from information_schema.column_privileges
where grantee in ('anon', 'authenticated')
  and table_schema = 'public'
order by
  table_name,
  column_name,
  grantee,
  privilege_type;


-- =============================================================
-- 7. SEQUENCE PRIVILEGES
-- Review whether API roles can directly use sequences.
-- UUID tables usually do not need broad sequence privileges.
-- =============================================================
select
  grantee,
  object_schema as sequence_schema,
  object_name as sequence_name,
  privilege_type
from information_schema.usage_privileges
where grantee in ('anon', 'authenticated')
  and object_type = 'SEQUENCE'
  and object_schema = 'public'
order by
  object_name,
  grantee,
  privilege_type;


-- =============================================================
-- 8. FUNCTION / RPC INVENTORY
-- security_definer = true deserves special scrutiny.
-- identity_arguments are required when issuing precise REVOKE or
-- GRANT statements for overloaded functions.
-- =============================================================
select
  n.nspname as function_schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_get_function_result(p.oid) as return_type,
  l.lanname as language,
  p.prosecdef as security_definer,
  p.provolatile as volatility_code,
  r.rolname as owner_role,
  p.proconfig as function_configuration,
  obj_description(p.oid, 'pg_proc') as description
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
join pg_language l
  on l.oid = p.prolang
join pg_roles r
  on r.oid = p.proowner
where n.nspname = 'public'
order by
  p.proname,
  pg_get_function_identity_arguments(p.oid);


-- =============================================================
-- 9. LIVE RPC EXECUTE ACCESS
-- Critical for SECURITY DEFINER functions because PostgreSQL
-- grants EXECUTE to PUBLIC by default unless explicitly revoked.
-- Review every callable function and confirm the role is intended.
-- =============================================================
select
  p.oid::regprocedure::text as function_signature,
  p.prosecdef as security_definer,
  has_function_privilege(
    'anon',
    p.oid,
    'EXECUTE'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated',
    p.oid,
    'EXECUTE'
  ) as authenticated_can_execute,
  has_function_privilege(
    'service_role',
    p.oid,
    'EXECUTE'
  ) as service_role_can_execute,
  has_function_privilege(
    'public',
    p.oid,
    'EXECUTE'
  ) as public_can_execute
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
order by
  p.prosecdef desc,
  p.proname,
  pg_get_function_identity_arguments(p.oid);


-- =============================================================
-- 10. HIGH-RISK RPC EXECUTE ACCESS
-- SECURITY DEFINER functions callable by anon or PUBLIC.
-- Every row needs explicit justification.
-- =============================================================
select
  p.oid::regprocedure::text as function_signature,
  r.rolname as owner_role,
  has_function_privilege('anon', p.oid, 'EXECUTE')
    as anon_can_execute,
  has_function_privilege('public', p.oid, 'EXECUTE')
    as public_can_execute,
  p.proconfig as function_configuration
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
join pg_roles r
  on r.oid = p.proowner
where n.nspname = 'public'
  and p.prosecdef = true
  and (
    has_function_privilege('anon', p.oid, 'EXECUTE')
    or has_function_privilege('public', p.oid, 'EXECUTE')
  )
order by p.proname;


-- =============================================================
-- 11. SECURITY DEFINER FUNCTIONS WITHOUT A FIXED SEARCH_PATH
-- Expected: zero rows for application SECURITY DEFINER functions.
-- A fixed search_path reduces object-shadowing attacks.
-- Acceptable configuration normally contains search_path=public
-- or search_path=pg_catalog,public with fully qualified objects.
-- =============================================================
select
  p.oid::regprocedure::text as function_signature,
  r.rolname as owner_role,
  p.proconfig as function_configuration,
  case
    when p.proconfig is null
      then 'HIGH: no function configuration'
    when not exists (
      select 1
      from unnest(p.proconfig) setting
      where setting like 'search_path=%'
    )
      then 'HIGH: search_path not fixed'
    else 'OK'
  end as audit_status
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
join pg_roles r
  on r.oid = p.proowner
where n.nspname = 'public'
  and p.prosecdef = true
  and (
    p.proconfig is null
    or not exists (
      select 1
      from unnest(p.proconfig) setting
      where setting like 'search_path=%'
    )
  )
order by p.proname;


-- =============================================================
-- 12. SECURITY DEFINER AUTHORIZATION HEURISTIC
-- Heuristic only: flags callable SECURITY DEFINER functions whose
-- source does not visibly reference auth.uid(), is_admin(), or a
-- current role/JWT check. Trigger-only functions may be legitimate.
-- =============================================================
select
  p.oid::regprocedure::text as function_signature,
  has_function_privilege('anon', p.oid, 'EXECUTE')
    as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE')
    as authenticated_can_execute,
  case
    when pg_get_functiondef(p.oid) ~* 'auth[.]uid\s*\('
      then 'contains auth.uid() check/reference'
    when pg_get_functiondef(p.oid) ~* 'is_admin\s*\('
      then 'contains is_admin() check/reference'
    when pg_get_functiondef(p.oid) ~* '(current_user|session_user|request[.]jwt)'
      then 'contains role/JWT reference'
    else 'REVIEW: no obvious caller authorization reference'
  end as authorization_observation
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
order by
  authorization_observation desc,
  p.proname;


-- =============================================================
-- 13. FUNCTIONS WITH MUTABLE/UNSAFE SEARCH PATH CONTENT
-- Flags SECURITY DEFINER functions where the configured search path
-- includes schemas beyond pg_catalog/public or uses "$user".
-- =============================================================
select
  p.oid::regprocedure::text as function_signature,
  p.proconfig as function_configuration,
  setting as search_path_setting
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
cross join lateral unnest(coalesce(p.proconfig, array[]::text[])) setting
where n.nspname = 'public'
  and p.prosecdef = true
  and setting like 'search_path=%'
  and (
    setting ~ '[$]user'
    or setting ~* '(^|,)(?!\s*(pg_catalog|public)\s*(,|$))'
  )
order by p.proname;


-- =============================================================
-- 14. VIEW SECURITY AUDIT
-- PostgreSQL views can bypass underlying RLS depending on ownership
-- and security_invoker configuration. Review every public view.
-- =============================================================
select
  n.nspname as view_schema,
  c.relname as view_name,
  r.rolname as owner_role,
  c.reloptions,
  case
    when coalesce(c.reloptions, array[]::text[])
      @> array['security_invoker=true']::text[]
      then 'OK: security_invoker=true'
    else 'REVIEW: owner-rights view unless otherwise protected'
  end as audit_status
from pg_class c
join pg_namespace n
  on n.oid = c.relnamespace
join pg_roles r
  on r.oid = c.relowner
where n.nspname = 'public'
  and c.relkind = 'v'
order by c.relname;


-- =============================================================
-- 15. STORAGE BUCKET AUDIT
-- public=true means files are readable without storage RLS.
-- Medical documents and professional-verification files must not be
-- in public buckets.
-- =============================================================
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at,
  case
    when public = true
     and (
       lower(name) like '%medical%'
       or lower(name) like '%patient%'
       or lower(name) like '%verification%'
       or lower(name) like '%document%'
     )
      then 'CRITICAL: sensitive-looking bucket is public'
    when public = true
      then 'REVIEW: public bucket'
    else 'OK: private bucket'
  end as audit_status
from storage.buckets
order by public desc, name;


-- =============================================================
-- 16. STORAGE OBJECT POLICY INVENTORY
-- Review SELECT/INSERT/UPDATE/DELETE independently. A private bucket
-- still needs correct storage.objects policies.
-- =============================================================
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by cmd, policyname;


-- =============================================================
-- 17. STORAGE POLICIES WITH BROAD ACCESS
-- Heuristic: flags PUBLIC/anon storage policies and true clauses.
-- =============================================================
select
  policyname,
  roles,
  cmd,
  qual,
  with_check,
  concat_ws(
    '; ',
    case when roles && array['public']::name[]
      then 'applies to PUBLIC' end,
    case when roles && array['anon']::name[]
      then 'applies to anon' end,
    case when lower(coalesce(qual, '')) in ('true', '(true)')
      then 'USING true' end,
    case when lower(coalesce(with_check, '')) in ('true', '(true)')
      then 'WITH CHECK true' end
  ) as risk_reason
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and (
    roles && array['public', 'anon']::name[]
    or lower(coalesce(qual, '')) in ('true', '(true)')
    or lower(coalesce(with_check, '')) in ('true', '(true)')
  )
order by policyname;


-- =============================================================
-- 18. DUPLICATE / OVERLAPPING POLICY COUNTS
-- Multiple permissive policies for the same table/command/role are
-- OR-combined and can accidentally broaden access.
-- =============================================================
select
  schemaname,
  tablename,
  cmd,
  roles,
  count(*) as policy_count,
  array_agg(policyname order by policyname) as policy_names
from pg_policies
where schemaname in ('public', 'storage')
  and permissive = 'PERMISSIVE'
group by
  schemaname,
  tablename,
  cmd,
  roles
having count(*) > 1
order by
  schemaname,
  tablename,
  cmd;


-- =============================================================
-- 19. PUBLICATION / REALTIME EXPOSURE
-- Realtime does not bypass RLS, but sensitive tables should not be
-- published without a clear need.
-- =============================================================
select
  pub.pubname as publication_name,
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_publication pub
join pg_publication_rel pr
  on pr.prpubid = pub.oid
join pg_class c
  on c.oid = pr.prrelid
join pg_namespace n
  on n.oid = c.relnamespace
where n.nspname in ('public', 'storage')
order by pub.pubname, n.nspname, c.relname;


-- =============================================================
-- 20. SECURITY SUMMARY COUNTS
-- Use this as a final dashboard after reviewing detailed results.
-- =============================================================
with public_tables as (
  select
    c.oid,
    c.relrowsecurity,
    count(p.polname) as policy_count
  from pg_class c
  join pg_namespace n
    on n.oid = c.relnamespace
  left join pg_policy p
    on p.polrelid = c.oid
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
  group by c.oid, c.relrowsecurity
),
definer_functions as (
  select
    p.oid,
    p.proconfig,
    has_function_privilege('anon', p.oid, 'EXECUTE')
      as anon_exec,
    has_function_privilege('public', p.oid, 'EXECUTE')
      as public_exec
  from pg_proc p
  join pg_namespace n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef = true
)
select
  (select count(*) from public_tables) as public_table_count,
  (
    select count(*)
    from public_tables
    where relrowsecurity = false
  ) as tables_without_rls,
  (
    select count(*)
    from public_tables
    where relrowsecurity = true
      and policy_count = 0
  ) as rls_tables_without_policies,
  (select count(*) from definer_functions)
    as security_definer_function_count,
  (
    select count(*)
    from definer_functions
    where anon_exec or public_exec
  ) as definer_functions_callable_by_anon_or_public,
  (
    select count(*)
    from definer_functions
    where proconfig is null
       or not exists (
         select 1
         from unnest(proconfig) setting
         where setting like 'search_path=%'
       )
  ) as definer_functions_without_fixed_search_path,
  (
    select count(*)
    from storage.buckets
    where public = true
  ) as public_storage_bucket_count;
