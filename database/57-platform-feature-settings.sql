-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Platform feature settings and immutable audit history
--
-- Project path:
-- ROMDOC/database/57-platform-feature-settings.sql
--
-- Step:
-- 71A-1 — Voice Assistant Standby Infrastructure
--
-- Adds:
--   - private platform feature settings
--   - immutable feature-setting audit events
--   - automatic update timestamps and audit snapshots
--   - administrator actor validation
--   - disabled-by-default Voice Appointment Assistant seed
--
-- Important:
--   - This migration does not store an OpenAI API key.
--   - This migration does not call OpenAI.
--   - The seeded voice assistant remains in standby and disabled.
-- =====================================================

begin;

-- =====================================================
-- 1. PLATFORM FEATURE SETTINGS
-- =====================================================

create table if not exists
  public.platform_feature_settings (
    id uuid primary key
      default gen_random_uuid(),

    feature_key text not null
      unique
      check (
        feature_key ~
        '^[a-z][a-z0-9_]{2,99}$'
      ),

    display_name text not null
      check (
        char_length(
          trim(display_name)
        ) between 3 and 200
      ),

    description text
      check (
        description is null
        or char_length(description)
          <= 2000
      ),

    is_enabled boolean not null
      default false,

    operational_state text not null
      default 'standby'
      check (
        operational_state in (
          'standby',
          'admin_testing',
          'limited_rollout',
          'active'
        )
      ),

    allowed_roles text[] not null
      default array[
        'patient'
      ]::text[]
      check (
        cardinality(allowed_roles)
          between 1 and 5
        and allowed_roles <@
          array[
            'patient',
            'doctor',
            'staff',
            'admin',
            'manager'
          ]::text[]
      ),

    settings jsonb not null
      default '{}'::jsonb
      check (
        jsonb_typeof(settings) =
        'object'
      ),

    maintenance_message_ro text not null
      default
        'Asistentul vocal este temporar indisponibil. Puteți continua programarea folosind formularul obișnuit.'
      check (
        char_length(
          trim(
            maintenance_message_ro
          )
        ) between 3 and 500
      ),

    maintenance_message_en text not null
      default
        'The voice assistant is temporarily unavailable. You can continue using the standard appointment form.'
      check (
        char_length(
          trim(
            maintenance_message_en
          )
        ) between 3 and 500
      ),

    change_source text not null
      default 'system'
      check (
        change_source in (
          'system',
          'administrator'
        )
      ),

    updated_by_profile_id uuid
      references public.profiles(id)
      on update cascade
      on delete restrict,

    last_change_reason text
      check (
        last_change_reason is null
        or char_length(
          trim(last_change_reason)
        ) between 3 and 1000
      ),

    created_at timestamptz not null
      default now(),

    updated_at timestamptz not null
      default now(),

    constraint
      platform_feature_settings_actor_check
    check (
      (
        change_source = 'system'
        and updated_by_profile_id
          is null
      )
      or
      (
        change_source =
          'administrator'
        and updated_by_profile_id
          is not null
      )
    )
  );

comment on table
  public.platform_feature_settings
is
  'Private platform feature flags, rollout states, access roles, operational limits, and maintenance messages. Secrets must never be stored here.';

comment on column
  public.platform_feature_settings.feature_key
is
  'Stable machine-readable feature identifier. This value cannot be changed after creation.';

comment on column
  public.platform_feature_settings.settings
is
  'Non-secret JSON configuration for the feature. API keys and provider credentials must remain in server-side environment variables.';

comment on column
  public.platform_feature_settings.change_source
is
  'Identifies whether the latest change was made by an administrator or by a protected system process.';

create index if not exists
  idx_platform_feature_settings_enabled
on public.platform_feature_settings (
  is_enabled,
  operational_state
);

create index if not exists
  idx_platform_feature_settings_updated
on public.platform_feature_settings (
  updated_at desc
);

-- =====================================================
-- 2. IMMUTABLE FEATURE-SETTING AUDIT EVENTS
-- =====================================================

create table if not exists
  public.platform_feature_setting_audit_events (
    id uuid primary key
      default gen_random_uuid(),

    feature_setting_id uuid not null
      references
        public.platform_feature_settings(id)
      on update cascade
      on delete restrict,

    feature_key text not null,

    event_type text not null
      check (
        event_type in (
          'created',
          'enabled',
          'disabled',
          'rollout_changed',
          'configuration_changed'
        )
      ),

    changed_fields text[] not null
      default '{}'::text[],

    previous_snapshot jsonb,

    new_snapshot jsonb not null
      check (
        jsonb_typeof(new_snapshot) =
        'object'
      ),

    actor_type text not null
      check (
        actor_type in (
          'system',
          'administrator'
        )
      ),

    actor_profile_id uuid
      references public.profiles(id)
      on update cascade
      on delete restrict,

    reason text
      check (
        reason is null
        or char_length(
          trim(reason)
        ) between 3 and 1000
      ),

    created_at timestamptz not null
      default now(),

    constraint
      platform_feature_audit_actor_check
    check (
      (
        actor_type = 'system'
        and actor_profile_id
          is null
      )
      or
      (
        actor_type =
          'administrator'
        and actor_profile_id
          is not null
      )
    )
  );

comment on table
  public.platform_feature_setting_audit_events
is
  'Immutable audit history for platform feature creation and configuration changes.';

create index if not exists
  idx_platform_feature_audit_feature
on public.platform_feature_setting_audit_events (
  feature_setting_id,
  created_at desc
);

create index if not exists
  idx_platform_feature_audit_key
on public.platform_feature_setting_audit_events (
  feature_key,
  created_at desc
);

create index if not exists
  idx_platform_feature_audit_actor
on public.platform_feature_setting_audit_events (
  actor_profile_id,
  created_at desc
)
where actor_profile_id is not null;

-- =====================================================
-- 3. VALIDATE WRITES AND MAINTAIN updated_at
-- =====================================================

create or replace function
  public.validate_platform_feature_setting_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if
    tg_op = 'UPDATE'
    and new.feature_key
      is distinct from
      old.feature_key
  then
    raise exception
      'platform_feature_key_is_immutable'
      using errcode = '55000';
  end if;

  if
    new.change_source =
    'administrator'
  then
    if not exists (
      select 1
      from public.profiles
      where id =
        new.updated_by_profile_id
        and role = 'admin'
        and account_status =
          'active'
    ) then
      raise exception
        'active_administrator_required'
        using errcode = '42501';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    new.created_at :=
      old.created_at;
  end if;

  new.updated_at := now();

  return new;
end;
$$;

revoke all
on function
  public.validate_platform_feature_setting_write()
from public;

drop trigger if exists
  validate_platform_feature_setting_write
on public.platform_feature_settings;

create trigger
  validate_platform_feature_setting_write
before insert or update
on public.platform_feature_settings
for each row
execute function
  public.validate_platform_feature_setting_write();

-- =====================================================
-- 4. AUTOMATIC AUDIT EVENT CREATION
-- =====================================================

create or replace function
  public.audit_platform_feature_setting_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  audit_event_type text;
  changed text[] :=
    '{}'::text[];
  previous_value jsonb;
  new_value jsonb;
begin
  new_value :=
    to_jsonb(new)
    - array[
        'updated_by_profile_id',
        'change_source',
        'last_change_reason'
      ]::text[];

  if tg_op = 'INSERT' then
    audit_event_type :=
      'created';

    changed :=
      array[
        'feature_created'
      ]::text[];

    previous_value := null;
  else
    previous_value :=
      to_jsonb(old)
      - array[
          'updated_by_profile_id',
          'change_source',
          'last_change_reason'
        ]::text[];

    if
      old.display_name
        is distinct from
        new.display_name
    then
      changed :=
        array_append(
          changed,
          'display_name'
        );
    end if;

    if
      old.description
        is distinct from
        new.description
    then
      changed :=
        array_append(
          changed,
          'description'
        );
    end if;

    if
      old.is_enabled
        is distinct from
        new.is_enabled
    then
      changed :=
        array_append(
          changed,
          'is_enabled'
        );
    end if;

    if
      old.operational_state
        is distinct from
        new.operational_state
    then
      changed :=
        array_append(
          changed,
          'operational_state'
        );
    end if;

    if
      old.allowed_roles
        is distinct from
        new.allowed_roles
    then
      changed :=
        array_append(
          changed,
          'allowed_roles'
        );
    end if;

    if
      old.settings
        is distinct from
        new.settings
    then
      changed :=
        array_append(
          changed,
          'settings'
        );
    end if;

    if
      old.maintenance_message_ro
        is distinct from
        new.maintenance_message_ro
    then
      changed :=
        array_append(
          changed,
          'maintenance_message_ro'
        );
    end if;

    if
      old.maintenance_message_en
        is distinct from
        new.maintenance_message_en
    then
      changed :=
        array_append(
          changed,
          'maintenance_message_en'
        );
    end if;

    if cardinality(changed) = 0 then
      return new;
    end if;

    if
      old.is_enabled = false
      and new.is_enabled = true
    then
      audit_event_type :=
        'enabled';
    elsif
      old.is_enabled = true
      and new.is_enabled = false
    then
      audit_event_type :=
        'disabled';
    elsif
      old.operational_state
        is distinct from
        new.operational_state
    then
      audit_event_type :=
        'rollout_changed';
    else
      audit_event_type :=
        'configuration_changed';
    end if;
  end if;

  insert into
    public.platform_feature_setting_audit_events (
      feature_setting_id,
      feature_key,
      event_type,
      changed_fields,
      previous_snapshot,
      new_snapshot,
      actor_type,
      actor_profile_id,
      reason
    )
  values (
    new.id,
    new.feature_key,
    audit_event_type,
    changed,
    previous_value,
    new_value,
    new.change_source,
    new.updated_by_profile_id,
    new.last_change_reason
  );

  return new;
end;
$$;

revoke all
on function
  public.audit_platform_feature_setting_change()
from public;

drop trigger if exists
  audit_platform_feature_setting_change
on public.platform_feature_settings;

create trigger
  audit_platform_feature_setting_change
after insert or update
on public.platform_feature_settings
for each row
execute function
  public.audit_platform_feature_setting_change();

-- =====================================================
-- 5. PREVENT DELETION OF FEATURE SETTINGS
-- =====================================================

create or replace function
  public.prevent_platform_feature_setting_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception
    'platform_feature_settings_cannot_be_deleted'
    using errcode = '55000';
end;
$$;

revoke all
on function
  public.prevent_platform_feature_setting_delete()
from public;

drop trigger if exists
  prevent_platform_feature_setting_delete
on public.platform_feature_settings;

create trigger
  prevent_platform_feature_setting_delete
before delete
on public.platform_feature_settings
for each row
execute function
  public.prevent_platform_feature_setting_delete();

-- =====================================================
-- 6. MAKE AUDIT EVENTS IMMUTABLE
-- =====================================================

create or replace function
  public.prevent_platform_feature_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception
    'platform_feature_audit_is_immutable'
    using errcode = '55000';
end;
$$;

revoke all
on function
  public.prevent_platform_feature_audit_mutation()
from public;

drop trigger if exists
  prevent_platform_feature_audit_update
on public.platform_feature_setting_audit_events;

create trigger
  prevent_platform_feature_audit_update
before update
on public.platform_feature_setting_audit_events
for each row
execute function
  public.prevent_platform_feature_audit_mutation();

drop trigger if exists
  prevent_platform_feature_audit_delete
on public.platform_feature_setting_audit_events;

create trigger
  prevent_platform_feature_audit_delete
before delete
on public.platform_feature_setting_audit_events
for each row
execute function
  public.prevent_platform_feature_audit_mutation();

-- =====================================================
-- 7. ROW LEVEL SECURITY AND PRIVILEGES
-- =====================================================

alter table
  public.platform_feature_settings
enable row level security;

alter table
  public.platform_feature_setting_audit_events
enable row level security;

-- No anon/authenticated policies are created intentionally.
-- Later application routes will read or update these tables only
-- through protected server-side code after authorization checks.

revoke all
on table
  public.platform_feature_settings
from public, anon, authenticated;

revoke all
on table
  public.platform_feature_setting_audit_events
from public, anon, authenticated;

grant
  select,
  insert,
  update
on table
  public.platform_feature_settings
to service_role;

grant select
on table
  public.platform_feature_setting_audit_events
to service_role;

-- =====================================================
-- 8. SEED THE VOICE ASSISTANT IN SAFE STANDBY MODE
-- =====================================================

insert into
  public.platform_feature_settings (
    feature_key,
    display_name,
    description,
    is_enabled,
    operational_state,
    allowed_roles,
    settings,
    maintenance_message_ro,
    maintenance_message_en,
    change_source,
    updated_by_profile_id,
    last_change_reason
  )
values (
  'voice_appointment_assistant',
  'Voice Appointment Assistant',
  'Voice-guided doctor search and appointment assistance for eligible authenticated RomDoc users.',
  false,
  'standby',
  array[
    'patient'
  ]::text[],
  jsonb_build_object(
    'provider',
      'openai',
    'voice_search_enabled',
      false,
    'appointment_draft_enabled',
      false,
    'appointment_confirmation_enabled',
      false,
    'maximum_session_minutes',
      5,
    'maximum_sessions_per_user_per_day',
      3,
    'maximum_platform_minutes_per_day',
      300,
    'automatic_pause_after_daily_limit',
      true
  ),
  'Asistentul vocal este temporar indisponibil. Puteți continua programarea folosind formularul obișnuit.',
  'The voice assistant is temporarily unavailable. You can continue using the standard appointment form.',
  'system',
  null,
  'Initial standby configuration created by migration 57.'
)
on conflict (
  feature_key
)
do nothing;

commit;

-- =====================================================
-- 9. VERIFICATION QUERIES
-- =====================================================

select
  feature_key,
  is_enabled,
  operational_state,
  allowed_roles,
  settings,
  change_source,
  updated_by_profile_id,
  updated_at
from public.platform_feature_settings
where feature_key =
  'voice_appointment_assistant';

select
  feature_key,
  event_type,
  changed_fields,
  actor_type,
  actor_profile_id,
  reason,
  created_at
from public.platform_feature_setting_audit_events
where feature_key =
  'voice_appointment_assistant'
order by created_at desc;

-- =====================================================
-- 10. OPTIONAL RLS VERIFICATION
-- =====================================================

select
  tablename as table_name,
  rowsecurity as row_security
from pg_catalog.pg_tables
where schemaname = 'public'
  and tablename in (
    'platform_feature_settings',
    'platform_feature_setting_audit_events'
  )
order by tablename;
