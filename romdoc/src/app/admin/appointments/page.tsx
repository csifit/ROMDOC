import { redirect } from "next/navigation";

import AdminAppointmentsAccordion, {
  type AdminAppointmentListItem,
} from "@/components/admin/admin-appointments-accordion";
import { selectTranslation } from "@/lib/i18n/app-locale";
import { getPlatformOperatorBilling } from "@/lib/i18n/platform-operator-billing";
import { getStoredAppLocale } from "@/lib/i18n/server-app-locale";
import { createClient } from "@/lib/supabase/server";

type DoctorTranslation = {
  locale: string;
  title: string | null;
};

type DoctorRelation = {
  slug: string;
  doctor_translations: DoctorTranslation[] | null;
};

type ClinicTranslation = {
  locale: string;
  name: string | null;
};

type ClinicRelation = {
  slug: string;
  clinic_translations: ClinicTranslation[] | null;
};

type Appointment = {
  id: string;
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
  doctors: DoctorRelation | DoctorRelation[] | null;
  clinics: ClinicRelation | ClinicRelation[] | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined): T | null {
  if (!relation) return null;
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function nameFromSlug(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function AdminAppointmentsPage() {
  const locale = await getStoredAppLocale();
  const copy = getPlatformOperatorBilling(locale);
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const parameters = new URLSearchParams({
      locale,
      next: "/admin/appointments",
    });
    redirect(`/login?${parameters.toString()}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    profile?.role !== "admin" ||
    profile.account_status !== "active"
  ) {
    redirect("/dashboard");
  }

  const { data, error } = await supabase
    .from("appointments")
    .select(`
      id,
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
      doctors (
        slug,
        doctor_translations (
          locale,
          title
        )
      ),
      clinics (
        slug,
        clinic_translations (
          locale,
          name
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Admin appointments query failed:", error);
  }

  const appointments = (data as unknown as Appointment[] | null) ?? [];
  const items: AdminAppointmentListItem[] = appointments.map((appointment) => {
    const doctor = firstRelation(appointment.doctors);
    const clinic = firstRelation(appointment.clinics);
    const doctorTranslation = selectTranslation(
      doctor?.doctor_translations,
      locale
    )?.title;
    const clinicTranslation = selectTranslation(
      clinic?.clinic_translations,
      locale
    )?.name;

    return {
      id: appointment.id,
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
      updatedAt: appointment.updated_at,
      doctorName:
        doctorTranslation ||
        (doctor ? nameFromSlug(doctor.slug) : copy.common.none),
      clinicName:
        clinicTranslation ||
        (clinic ? nameFromSlug(clinic.slug) : copy.common.none),
    };
  });

  return (
    <div className="space-y-[34px]">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          {copy.pages.appointments.eyebrow}
        </p>
        <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
          {copy.pages.appointments.title}
        </h1>
        <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
          {copy.pages.appointments.description}
        </p>
      </header>

      <section className="rounded-[21px] border border-blue-200 bg-blue-50 p-[21px] text-blue-950">
        <h2 className="font-bold">{copy.pages.appointments.privacyTitle}</h2>
        <p className="mt-[8px] text-sm leading-6">
          {copy.pages.appointments.privacyDescription}
        </p>
      </section>

      {error ? (
        <section className="rounded-[21px] border border-red-200 bg-red-50 p-[21px] text-sm text-red-800">
          {copy.appointments.empty}
        </section>
      ) : (
        <AdminAppointmentsAccordion appointments={items} locale={locale} />
      )}
    </div>
  );
}
