begin;

create extension if not exists pg_cron
with schema extensions;

create or replace function public.cleanup_old_paid_clinic_invoices()
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
  deleted_count integer;
begin
  delete from public.clinic_invoices
  where status = 'paid'
    and paid_on is not null
    and paid_on <
      (
        current_date -
        interval '1 year'
      )::date;

  get diagnostics
    deleted_count =
      row_count;

  return deleted_count;
end;
$function$;

revoke all
on function public.cleanup_old_paid_clinic_invoices()
from public, anon, authenticated;

grant execute
on function public.cleanup_old_paid_clinic_invoices()
to service_role;

do $block$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname =
    'romdoc-cleanup-old-paid-clinic-invoices'
  order by jobid desc
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(
      existing_job_id
    );
  end if;

  perform cron.schedule(
    'romdoc-cleanup-old-paid-clinic-invoices',
    '17 2 * * *',
    $cron$
      select
        public.cleanup_old_paid_clinic_invoices();
    $cron$
  );
end;
$block$;

comment on function public.cleanup_old_paid_clinic_invoices() is
  'Deletes temporary RomDoc clinic invoice CRM records only when status is paid and paid_on is more than one year old. SAGA remains the accounting source of truth.';

commit;
