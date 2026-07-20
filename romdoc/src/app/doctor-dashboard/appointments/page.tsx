import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import ConfirmedAppointmentsWeeklyCalendar, {
  type ConfirmedWeeklyAppointment,
} from "@/components/doctor/confirmed-appointments-weekly-calendar";
import CreateAppointmentForm from "@/components/doctor/create-appointment-form";
import DoctorAppointmentsFilteredList, {
  type DoctorAppointmentListItem,
} from "@/components/doctor/doctor-appointments-filtered-list";
import { getAllowedClinicIdsForDoctor } from "@/lib/doctors/clinic-subaccount-scope";
import { type AppLocale, selectTranslation } from "@/lib/i18n/app-locale";
import { getStoredAppLocale } from "@/lib/i18n/server-app-locale";
import { createClient } from "@/lib/supabase/server";

type ClinicTranslation = {
  locale: string;
  name: string;
};

type ClinicRelation = {
  id?: string;
  slug: string;
  clinic_translations: ClinicTranslation[] | null;
};

type DoctorClinicRow = {
  clinic_id: string;
  clinics: ClinicRelation | ClinicRelation[] | null;
};

type ClinicOption = {
  id: string;
  name: string;
};

type DoctorAccount = {
  id: string;
  slug: string;
  status: string | null;
  account_type: string | null;
  clinic_organization_id: string | null;
};

type Appointment = {
  id: string;
  patient_profile_id: string | null;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  requested_date: string;
  requested_time: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  reschedule_reason: string | null;
  notes: string | null;
  source: string;
  status: string;
  created_at: string;
  updated_at: string;
  clinics: ClinicRelation | ClinicRelation[] | null;
};

function getFirstRelation<T>(
  relation: T | T[] | null | undefined
): T | null {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function formatDoctorName(slug: string) {
  return slug
    .split("-")
    .map(
      (part: string) =>
        part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join(" ");
}

function getClinicName(
  clinic: ClinicRelation | null,
  locale: AppLocale,
  fallback: string
) {
  if (!clinic) {
    return fallback;
  }

  return (
    selectTranslation(
      clinic.clinic_translations,
      locale
    )?.name ??
    formatDoctorName(clinic.slug)
  );
}

export default async function DoctorAppointmentsPage() {
  const locale = await getStoredAppLocale();
  const t = await getTranslations({
    locale,
    namespace: "DoctorAppointmentOperations.appointments.page",
  });
  const commonT = await getTranslations({
    locale,
    namespace: "DoctorAppointmentOperations.common",
  });
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(
      `/login?locale=${locale}&next=/doctor-dashboard/appointments`
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Doctor dashboard profile query failed:",
      profileError
    );
  }

  if (!profile || profile.role !== "doctor") {
    redirect("/dashboard");
  }

  const {
    data: doctorData,
    error: doctorError,
  } = await supabase
    .from("doctors")
    .select(
      `
        id,
        slug,
        status,
        account_type,
        clinic_organization_id
      `
    )
    .eq("profile_id", user.id)
    .maybeSingle();

  if (doctorError) {
    console.error(
      "Doctor dashboard ownership query failed:",
      doctorError
    );
  }

  const doctor = doctorData as DoctorAccount | null;
  const isClinicSubAccount =
    doctor?.account_type === "clinic_sub_account";

  const displayName =
    profile.first_name || profile.last_name
      ? [profile.first_name, profile.last_name]
          .filter(Boolean)
          .join(" ")
      : doctor
        ? formatDoctorName(doctor.slug)
        : commonT("doctorFallback");

  if (!doctor) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <header>
            <p className="text-sm font-medium text-gray-500">
              {commonT("doctorDashboard")}
            </p>

            <h1 className="mt-2 text-4xl font-bold text-gray-900">
              {t("title")}
            </h1>
          </header>

          <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-8">
            <h2 className="text-xl font-semibold text-amber-900">
              {t("missingTitle")}
            </h2>

            <p className="mt-3 leading-7 text-amber-800">
              {t("missingDescription")}
            </p>

            <p className="mt-3 leading-7 text-amber-800">
              {t("missingHelp")}
            </p>
          </section>
        </div>
      </main>
    );
  }

  let allowedClinicIds: string[] | null = null;

  try {
    allowedClinicIds = await getAllowedClinicIdsForDoctor(
      supabase,
      doctor
    );
  } catch (scopeError) {
    console.error(
      "Doctor appointment clinic scope lookup failed:",
      scopeError
    );

    allowedClinicIds = isClinicSubAccount ? [] : null;
  }

  let doctorClinicQuery = supabase
    .from("doctor_clinics")
    .select(
      `
        clinic_id,
        clinics (
          id,
          slug,
          clinic_translations (
            locale,
            name
          )
        )
      `
    )
    .eq("doctor_id", doctor.id);

  if (allowedClinicIds) {
    doctorClinicQuery = allowedClinicIds.length
      ? doctorClinicQuery.in("clinic_id", allowedClinicIds)
      : doctorClinicQuery.eq(
          "clinic_id",
          "00000000-0000-0000-0000-000000000000"
        );
  }

  const {
    data: doctorClinicData,
    error: doctorClinicsError,
  } = await doctorClinicQuery;

  if (doctorClinicsError) {
    console.error(
      "Doctor dashboard clinic query failed:",
      doctorClinicsError
    );
  }

  const doctorClinicRows =
    (doctorClinicData as unknown as DoctorClinicRow[] | null) ?? [];

  const clinicOptions: ClinicOption[] = doctorClinicRows
    .map(
      (doctorClinic: DoctorClinicRow): ClinicOption | null => {
        const clinic = getFirstRelation(doctorClinic.clinics);

        if (!clinic) {
          return null;
        }

        return {
          id: doctorClinic.clinic_id,
          name: getClinicName(
            clinic,
            locale,
            commonT("clinicUnavailable")
          ),
        };
      }
    )
    .filter(
      (clinic: ClinicOption | null): clinic is ClinicOption =>
        clinic !== null
    )
    .sort((firstClinic: ClinicOption, secondClinic: ClinicOption) =>
      firstClinic.name.localeCompare(secondClinic.name, locale)
    );

  let appointmentsQuery = supabase
    .from("appointments")
    .select(
      `
        id,
        patient_profile_id,
        patient_name,
        patient_email,
        patient_phone,
        requested_date,
        requested_time,
        scheduled_date,
        scheduled_time,
        reschedule_reason,
        notes,
        source,
        status,
        created_at,
        updated_at,
        clinics (
          id,
          slug,
          clinic_translations (
            locale,
            name
          )
        )
      `
    )
    .eq("doctor_id", doctor.id)
    .order("created_at", {
      ascending: false,
    });

  if (allowedClinicIds) {
    appointmentsQuery = allowedClinicIds.length
      ? appointmentsQuery.in("clinic_id", allowedClinicIds)
      : appointmentsQuery.eq(
          "clinic_id",
          "00000000-0000-0000-0000-000000000000"
        );
  }

  const {
    data: appointmentsData,
    error: appointmentsError,
  } = await appointmentsQuery;

  if (appointmentsError) {
    console.error(
      "Doctor appointments query failed:",
      appointmentsError
    );
  }

  const appointments =
    (appointmentsData as unknown as Appointment[] | null) ?? [];

  const appointmentListItems: DoctorAppointmentListItem[] =
    appointments.map((appointment: Appointment) => {
      const clinic = getFirstRelation(appointment.clinics);

      return {
        id: appointment.id,
        patientProfileId: appointment.patient_profile_id,
        patientName: appointment.patient_name,
        patientEmail: appointment.patient_email,
        patientPhone: appointment.patient_phone,
        requestedDate: appointment.requested_date,
        requestedTime: appointment.requested_time,
        scheduledDate: appointment.scheduled_date,
        scheduledTime: appointment.scheduled_time,
        rescheduleReason: appointment.reschedule_reason,
        notes: appointment.notes,
        source: appointment.source,
        status: appointment.status,
        createdAt: appointment.created_at,
        clinicName: getClinicName(
          clinic,
          locale,
          commonT("clinicUnavailable")
        ),
      };
    });

  const confirmedCalendarAppointments: ConfirmedWeeklyAppointment[] =
    appointments.flatMap((appointment: Appointment) => {
      if (appointment.status !== "confirmed") {
        return [];
      }

      const date =
        appointment.scheduled_date ?? appointment.requested_date;
      const time =
        appointment.scheduled_time ?? appointment.requested_time;

      if (!date || !time) {
        return [];
      }

      const clinic = getFirstRelation(appointment.clinics);

      return [
        {
          id: appointment.id,
          patientProfileId: appointment.patient_profile_id,
          patientName: appointment.patient_name,
          patientEmail: appointment.patient_email,
          patientPhone: appointment.patient_phone,
          requestedDate: appointment.requested_date,
          requestedTime: appointment.requested_time,
          scheduledDate: appointment.scheduled_date,
          scheduledTime: appointment.scheduled_time,
          rescheduleReason: appointment.reschedule_reason,
          notes: appointment.notes,
          source: appointment.source,
          status: appointment.status,
          createdAt: appointment.created_at,
          clinicName: getClinicName(
          clinic,
          locale,
          commonT("clinicUnavailable")
        ),
        },
      ];
    });

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-sm font-medium text-gray-500">
            {isClinicSubAccount
              ? commonT("clinicDoctorDashboard")
              : commonT("doctorDashboard")}
          </p>

          <h1 className="mt-2 text-4xl font-bold text-gray-900">
            {t("title")}
          </h1>

          <p className="mt-3 text-gray-600">
            {t("welcome", {name: displayName})}
          </p>
        </header>

        {isClinicSubAccount && (
          <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-5 text-green-900">
            {t("clinicScope")}
          </div>
        )}

        {doctor.status === "suspended" && (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            {t("suspended")}
          </div>
        )}

        {isClinicSubAccount && clinicOptions.length === 0 && (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            {t("noAssignedClinic")}
          </div>
        )}

        <CreateAppointmentForm
          doctorId={doctor.id}
          clinics={clinicOptions}
        />

        <ConfirmedAppointmentsWeeklyCalendar
          appointments={confirmedCalendarAppointments}
        />

        <section className="mt-10">
          {appointmentsError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-800 shadow-sm">
              {t("loadError")}
            </div>
          ) : (
            <DoctorAppointmentsFilteredList
              appointments={appointmentListItems}
            />
          )}
        </section>
      </div>
    </main>
  );
}
