"use server";

import Link from "next/link";

import {
  getAllowedClinicIdsForDoctor,
} from "@/lib/doctors/clinic-subaccount-scope";
import {
  createClient,
} from "@/lib/supabase/server";

type Props = {
  doctor: {
    id: string;
    status: string | null;
    account_type: string | null;
    clinic_organization_id: string | null;
  };
  profileCompletionPercent: number;
};

type ClinicTranslation = {
  locale: string;
  name: string;
};

type ClinicRelation = {
  slug: string;
  clinic_translations:
    | ClinicTranslation[]
    | null;
};

type AppointmentRow = {
  id: string;
  patient_name: string;
  requested_date: string;
  requested_time: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string;
  created_at: string;
  clinics:
    | ClinicRelation
    | ClinicRelation[]
    | null;
};

function firstRelation<T>(
  relation: T | T[] | null
): T | null {
  if (!relation) return null;
  return Array.isArray(relation)
    ? relation[0] ?? null
    : relation;
}

function clinicName(
  clinic: ClinicRelation | null
) {
  return (
    clinic?.clinic_translations?.find(
      (item) => item.locale === "ro"
    )?.name ??
    clinic?.clinic_translations?.[0]?.name ??
    "Clinică indisponibilă"
  );
}

function todayInRomania() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Europe/Bucharest",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(new Date());
}

function effectiveDate(
  appointment: AppointmentRow
) {
  return (
    appointment.scheduled_date ??
    appointment.requested_date
  );
}

function effectiveTime(
  appointment: AppointmentRow
) {
  return (
    appointment.scheduled_time ??
    appointment.requested_time
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      weekday: "short",
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    }
  ).format(
    new Date(`${date}T12:00:00Z`)
  );
}

function formatTime(
  time: string | null
) {
  return time
    ? time.slice(0, 5)
    : "Ora neconfirmată";
}

function statusLabel(
  status: string
) {
  const labels: Record<string, string> = {
    pending: "Cerere nouă",
    confirmed: "Confirmată",
    rescheduled: "Reprogramată",
  };

  return labels[status] ?? status;
}

function statusClasses(
  status: string
) {
  if (status === "pending") {
    return "bg-amber-100 text-amber-800";
  }

  if (status === "confirmed") {
    return "bg-emerald-100 text-emerald-800";
  }

  return "bg-blue-100 text-blue-800";
}

function CounterCard({
  label,
  value,
  helper,
  href,
  attention = false,
}: {
  label: string;
  value: number | string;
  helper: string;
  href: string;
  attention?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`romdoc-focus-ring block rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        attention
          ? "border-amber-200 bg-amber-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold text-gray-900">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-gray-500">
        {helper}
      </p>
    </Link>
  );
}

function AppointmentItem({
  appointment,
  showDate,
}: {
  appointment: AppointmentRow;
  showDate: boolean;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-gray-900">
            {appointment.patient_name}
          </p>

          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(
              appointment.status
            )}`}
          >
            {statusLabel(
              appointment.status
            )}
          </span>
        </div>

        <p className="mt-1 truncate text-sm text-gray-600">
          {clinicName(
            firstRelation(
              appointment.clinics
            )
          )}
        </p>
      </div>

      <div className="shrink-0 sm:text-right">
        {showDate && (
          <p className="text-xs font-medium text-gray-500">
            {formatDate(
              effectiveDate(
                appointment
              )
            )}
          </p>
        )}

        <p className="mt-1 text-sm font-bold text-gray-900">
          {formatTime(
            effectiveTime(
              appointment
            )
          )}
        </p>
      </div>
    </article>
  );
}

export default async function DoctorDashboardOperationalOverview({
  doctor,
  profileCompletionPercent,
}: Props) {
  const supabase =
    await createClient();

  let allowedClinicIds:
    | string[]
    | null = null;

  try {
    allowedClinicIds =
      await getAllowedClinicIdsForDoctor(
        supabase,
        doctor
      );
  } catch (scopeError) {
    console.error(
      "Doctor dashboard clinic scope failed:",
      scopeError
    );

    allowedClinicIds =
      doctor.account_type ===
      "clinic_sub_account"
        ? []
        : null;
  }

  let query =
    supabase
      .from("appointments")
      .select(`
        id,
        patient_name,
        requested_date,
        requested_time,
        scheduled_date,
        scheduled_time,
        status,
        created_at,
        clinics (
          slug,
          clinic_translations (
            locale,
            name
          )
        )
      `)
      .eq("doctor_id", doctor.id)
      .in(
        "status",
        [
          "pending",
          "confirmed",
          "rescheduled",
        ]
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(100);

  if (allowedClinicIds) {
    query =
      allowedClinicIds.length > 0
        ? query.in(
            "clinic_id",
            allowedClinicIds
          )
        : query.eq(
            "clinic_id",
            "00000000-0000-0000-0000-000000000000"
          );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    console.error(
      "Doctor dashboard operational appointments failed:",
      error
    );
  }

  const appointments =
    (data ?? []) as unknown as
      AppointmentRow[];

  const today =
    todayInRomania();

  const pending =
    appointments
      .filter(
        (item) =>
          item.status ===
          "pending"
      )
      .slice(0, 5);

  const todayAppointments =
    appointments
      .filter(
        (item) =>
          effectiveDate(item) ===
            today &&
          item.status !==
            "pending"
      )
      .sort(
        (first, second) =>
          (
            effectiveTime(first) ??
            "99:99"
          ).localeCompare(
            effectiveTime(second) ??
              "99:99"
          )
      )
      .slice(0, 6);

  const upcomingConfirmed =
    appointments.filter(
      (item) =>
        item.status ===
          "confirmed" &&
        effectiveDate(item) >
          today
    ).length;

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#036661]">
            Acțiuni și program
          </p>

          <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
            Ce necesită atenție acum
          </h2>
        </div>

        <Link
          href="/doctor-dashboard/appointments"
          className="romdoc-button romdoc-button-secondary romdoc-button-sm"
        >
          Toate programările
        </Link>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Datele operaționale nu au putut fi încărcate complet.
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CounterCard
          label="Cereri noi"
          value={
            appointments.filter(
              (item) =>
                item.status ===
                "pending"
            ).length
          }
          helper="Așteaptă confirmarea"
          href="/doctor-dashboard/appointments"
          attention={
            pending.length > 0
          }
        />

        <CounterCard
          label="Astăzi"
          value={
            todayAppointments.length
          }
          helper="Confirmate sau reprogramate"
          href="/doctor-dashboard/calendar"
        />

        <CounterCard
          label="Confirmate"
          value={
            upcomingConfirmed
          }
          helper="Programări viitoare"
          href="/doctor-dashboard/calendar"
        />

        <CounterCard
          label="Profil"
          value={`${profileCompletionPercent}%`}
          helper="Grad de completare"
          href="/doctor-dashboard/profile"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Necesită atenție
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Cele mai noi cereri
              </p>
            </div>

            {pending.length >
              0 && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                {pending.length} noi
              </span>
            )}
          </div>

          {pending.length >
          0 ? (
            <div className="mt-4 space-y-3">
              {pending.map(
                (appointment) => (
                  <AppointmentItem
                    key={
                      appointment.id
                    }
                    appointment={
                      appointment
                    }
                    showDate
                  />
                )
              )}

              <Link
                href="/doctor-dashboard/appointments"
                className="romdoc-button romdoc-button-primary romdoc-button-full mt-4"
              >
                Gestionează cererile
              </Link>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="font-semibold text-emerald-900">
                Nu există cereri noi.
              </p>

              <p className="mt-1 text-sm text-emerald-800">
                Toate solicitările au fost procesate.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Programul de astăzi
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                În ordine cronologică
              </p>
            </div>

            <Link
              href="/doctor-dashboard/calendar"
              className="text-sm font-semibold text-[#036661] underline-offset-4 hover:underline"
            >
              Calendar
            </Link>
          </div>

          {todayAppointments.length >
          0 ? (
            <div className="mt-4 space-y-3">
              {todayAppointments.map(
                (appointment) => (
                  <AppointmentItem
                    key={
                      appointment.id
                    }
                    appointment={
                      appointment
                    }
                    showDate={
                      false
                    }
                  />
                )
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
              <p className="font-semibold text-gray-900">
                Nu sunt programări astăzi.
              </p>

              <p className="mt-1 text-sm text-gray-600">
                Verifică următoarele zile în calendar.
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <p className="mr-1 text-sm font-bold text-gray-900">
            Acțiuni rapide
          </p>

          <Link
            href="/doctor-dashboard/appointments"
            className="romdoc-button romdoc-button-primary romdoc-button-sm"
          >
            Adaugă programare
          </Link>

          <Link
            href="/doctor-dashboard/calendar"
            className="romdoc-button romdoc-button-secondary romdoc-button-sm"
          >
            Deschide calendarul
          </Link>

          <Link
            href="/doctor-dashboard/availability"
            className="romdoc-button romdoc-button-secondary romdoc-button-sm"
          >
            Disponibilitate
          </Link>

          <Link
            href="/doctor-dashboard/profile"
            className="romdoc-button romdoc-button-muted romdoc-button-sm"
          >
            Editează profilul
          </Link>
        </div>
      </section>
    </section>
  );
}
