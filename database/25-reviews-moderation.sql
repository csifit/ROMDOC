-- =====================================================
-- ROMDOC DATABASE MIGRATION
-- Step 55C: Reviews moderation and patient ownership
--
-- File:
-- ROMDOC/database/25-reviews-moderation.sql
-- =====================================================

begin;

-- =====================================================
-- 1. REVIEW OWNERSHIP
-- =====================================================

alter table public.reviews
  add column if not exists patient_profile_id uuid
    references public.profiles(id)
    on delete set null;

alter table public.reviews
  add column if not exists appointment_id uuid
    references public.appointments(id)
    on delete set null;

-- =====================================================
-- 2. MODERATION WORKFLOW
-- =====================================================

alter table public.reviews
  add column if not exists status text;

alter table public.reviews
  add column if not exists moderation_reason text;

alter table public.reviews
  add column if not exists moderated_by_profile_id uuid
    references public.profiles(id)
    on delete set null;

alter table public.reviews
  add column if not exists moderated_at timestamptz;

alter table public.reviews
  add column if not exists updated_at timestamptz
    not null default now();

-- Preserve the behavior of the former approved column.
update public.reviews
set status =
  case
    when approved = true then 'published'
    else 'hidden'
  end
where status is null;

alter table public.reviews
  alter column status
  set default 'published';

alter table public.reviews
  alter column status
  set not null;

alter table public.reviews
  drop constraint if exists reviews_status_check;

alter table public.reviews
  add constraint reviews_status_check
  check (
    status in (
      'published',
      'hidden',
      'removed'
    )
  );

-- Keep the legacy approved column synchronized for compatibility.
update public.reviews
set approved = (
  status = 'published'
);

-- =====================================================
-- 3. ONE REVIEW PER APPOINTMENT
-- =====================================================

create unique index if not exists
  idx_reviews_unique_appointment
on public.reviews (
  appointment_id
)
where appointment_id is not null;

create index if not exists
  idx_reviews_doctor_status_created
on public.reviews (
  doctor_id,
  status,
  created_at desc
);

create index if not exists
  idx_reviews_patient_created
on public.reviews (
  patient_profile_id,
  created_at desc
);

create index if not exists
  idx_reviews_status_created
on public.reviews (
  status,
  created_at desc
);

-- =====================================================
-- 4. UPDATED_AT TRIGGER
-- =====================================================

drop trigger if exists
  set_reviews_updated_at
on public.reviews;

create trigger set_reviews_updated_at
before update
on public.reviews
for each row
execute function public.handle_updated_at();

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

alter table public.reviews
  enable row level security;

drop policy if exists
  "Anyone can view approved reviews"
on public.reviews;

drop policy if exists
  "Anyone can view published reviews"
on public.reviews;

drop policy if exists
  "Patients can view their reviews"
on public.reviews;

drop policy if exists
  "Patients can create reviews"
on public.reviews;

drop policy if exists
  "Admins can view all reviews"
on public.reviews;

create policy
  "Anyone can view published reviews"
on public.reviews
for select
using (
  status = 'published'
  and approved = true
);

create policy
  "Patients can view their reviews"
on public.reviews
for select
to authenticated
using (
  patient_profile_id = auth.uid()
);

create policy
  "Admins can view all reviews"
on public.reviews
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

-- Review creation and moderation are intentionally handled
-- by secure server routes using the service-role client.

grant select
on public.reviews
to anon, authenticated;

commit;

-- =====================================================
-- VERIFICATION
-- =====================================================

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'reviews'
order by ordinal_position;