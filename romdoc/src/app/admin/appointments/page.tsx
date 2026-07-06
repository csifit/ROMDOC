import AdminAppointmentsAccordion, {
  type AdminAppointmentListItem,
} from "@/components/admin/admin-appointments-accordion";
import { createClient } from "@/lib/supabase/server";

type DoctorRelation = {
  slug: string;
};

type ClinicTranslation = {
  locale: string;
  name: string;
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

function getFirstRelation<T>(relation: T | T[] | null | undefined): T | null {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function formatNameFromSlug(slug: string) {
  return slug
    .split("-")
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getClinicName(clinic: ClinicRelation | null) {
  if (!clinic) {
    return "Clinică indisponibilă";
  }

  return (
    clinic.clinic_translations?.find(
      (translation) => translation.locale === "ro"
    )?.name ??
    clinic.clinic_translations?.[0]?.name ??
    formatNameFromSlug(clinic.slug)
  );
}

export default async function AdminAppointmentsPage() {
  const supabase = await createClient();

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
        slug
      ),
      clinics (
        slug,
        clinic_translations (
          locale,
          name
        )
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error("Admin appointments query failed:", error);
  }

  const appointments =
    (data as unknown as Appointment[] | null) ?? [];

  const appointmentListItems: AdminAppointmentListItem[] = appointments.map(
    (appointment) => {
      const doctor = getFirstRelation(appointment.doctors);
      const clinic = getFirstRelation(appointment.clinics);

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
        doctorName: doctor ? formatNameFromSlug(doctor.slug) : "Medic indisponibil",
        clinicName: getClinicName(clinic),
      };
    }
  );

  return (
    <main className="px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-sm font-medium text-gray-500">
            Panou administrator
          </p>

          <h1 className="mt-2 text-4xl font-bold text-gray-900">
            Programări
          </h1>

          <p className="mt-3 text-gray-600">
            Caută, filtrează și gestionează programările din platformă.
          </p>
        </header>

        {error ? (
          <section className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-8 text-red-800 shadow-sm">
            Programările nu au putut fi încărcate.
          </section>
        ) : (
          <AdminAppointmentsAccordion appointments={appointmentListItems} />
        )}
      </div>
    </main>
  );
}
