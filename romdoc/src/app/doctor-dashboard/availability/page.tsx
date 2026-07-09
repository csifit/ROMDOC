import { redirect } from "next/navigation";
import DoctorAvailabilityManager, {
  type AvailabilityItem,
  type DayOffItem,
} from "@/components/doctor/doctor-availability-manager";
import { getAllowedClinicIdsForDoctor } from "@/lib/doctors/clinic-subaccount-scope";
import { createClient } from "@/lib/supabase/server";

type ClinicTranslation = {
  locale: string;
  name: string;
};

type ClinicRelation = {
  id: string;
  slug: string;
  clinic_translations: ClinicTranslation[] | null;
};

type DoctorClinicRow = {
  clinic_id: string;
  clinics: ClinicRelation | ClinicRelation[] | null;
};

type DoctorRow = {
  id: string;
  account_type: string | null;
};

type BreakRow = {
  id: string;
  start_time: string;
  end_time: string;
  label: string | null;
};

type AvailabilityRow = {
  id: string;
  clinic_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  appointment_duration_minutes: number;
  is_active: boolean;
  availability_breaks: BreakRow[] | null;
};

type DayOffRow = {
  id: string;
  clinic_id: string | null;
  date: string;
  is_all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
};

function getFirstRelation<T>(relation: T | T[] | null | undefined): T | null {
  if (!relation) {
    return null;
  }

  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function getClinicName(clinic: ClinicRelation) {
  const romanian = clinic.clinic_translations?.find(
    (translation) => translation.locale === "ro"
  );

  const fallback = clinic.clinic_translations?.[0];

  return romanian?.name ?? fallback?.name ?? clinic.slug;
}

export default async function DoctorAvailabilityPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: doctor, error: doctorError } = await supabase
    .from("doctors")
    .select("id, account_type")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (doctorError || !doctor) {
    redirect("/dashboard");
  }

  const typedDoctor = doctor as DoctorRow;
  const isClinicSubAccount = typedDoctor.account_type === "clinic_sub_account";

  let allowedClinicIds: string[] | null = null;

  try {
    allowedClinicIds = await getAllowedClinicIdsForDoctor(supabase, typedDoctor);
  } catch (scopeError) {
    console.error("Availability clinic scope lookup failed:", scopeError);
    allowedClinicIds = isClinicSubAccount ? [] : null;
  }

  let clinicsQuery = supabase
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
    .eq("doctor_id", typedDoctor.id);

  let availabilityQuery = supabase
    .from("availability")
    .select(
      `
        id,
        clinic_id,
        weekday,
        start_time,
        end_time,
        appointment_duration_minutes,
        is_active,
        availability_breaks (
          id,
          start_time,
          end_time,
          label
        )
      `
    )
    .eq("doctor_id", typedDoctor.id)
    .order("weekday")
    .order("start_time");

  let daysOffQuery = supabase
    .from("doctor_days_off")
    .select(
      `
        id,
        clinic_id,
        date,
        is_all_day,
        start_time,
        end_time,
        reason
      `
    )
    .eq("doctor_id", typedDoctor.id)
    .order("date");

  if (allowedClinicIds) {
    if (allowedClinicIds.length > 0) {
      clinicsQuery = clinicsQuery.in("clinic_id", allowedClinicIds);
      availabilityQuery = availabilityQuery.in("clinic_id", allowedClinicIds);
      daysOffQuery = daysOffQuery.in("clinic_id", allowedClinicIds);
    } else {
      const impossibleClinicId = "00000000-0000-0000-0000-000000000000";

      clinicsQuery = clinicsQuery.eq("clinic_id", impossibleClinicId);
      availabilityQuery = availabilityQuery.eq("clinic_id", impossibleClinicId);
      daysOffQuery = daysOffQuery.eq("clinic_id", impossibleClinicId);
    }
  }

  const [clinicsResult, availabilityResult, daysOffResult] = await Promise.all([
    clinicsQuery,
    availabilityQuery,
    daysOffQuery,
  ]);

  if (clinicsResult.error) {
    console.error("Availability clinic query failed:", clinicsResult.error);
  }

  if (availabilityResult.error) {
    console.error("Availability schedule query failed:", availabilityResult.error);
  }

  if (daysOffResult.error) {
    console.error("Availability days-off query failed:", daysOffResult.error);
  }

  const clinicRows =
    (clinicsResult.data as unknown as DoctorClinicRow[] | null) ?? [];

  const clinics = clinicRows.flatMap((row) => {
    const clinic = getFirstRelation(row.clinics);

    if (!clinic) {
      return [];
    }

    return [
      {
        id: clinic.id,
        name: getClinicName(clinic),
      },
    ];
  });

  const clinicNameMap = new Map(
    clinics.map((clinic) => [clinic.id, clinic.name])
  );

  const scheduleRows =
    (availabilityResult.data as unknown as AvailabilityRow[] | null) ?? [];

  const availability: AvailabilityItem[] = scheduleRows.map((row) => ({
    id: row.id,
    clinicId: row.clinic_id,
    clinicName: clinicNameMap.get(row.clinic_id) ?? "Clinică",
    weekday: row.weekday,
    startTime: row.start_time,
    endTime: row.end_time,
    durationMinutes: row.appointment_duration_minutes,
    isActive: row.is_active,
    breaks:
      row.availability_breaks?.map((item) => ({
        id: item.id,
        startTime: item.start_time,
        endTime: item.end_time,
        label: item.label,
      })) ?? [],
  }));

  const dayOffRows =
    (daysOffResult.data as unknown as DayOffRow[] | null) ?? [];

  const daysOff: DayOffItem[] = dayOffRows.map((row) => ({
    id: row.id,
    clinicId: row.clinic_id,
    clinicName: row.clinic_id ? clinicNameMap.get(row.clinic_id) ?? "Clinică" : null,
    date: row.date,
    isAllDay: row.is_all_day,
    startTime: row.start_time,
    endTime: row.end_time,
    reason: row.reason,
  }));

  return (
    <main className="px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-sm font-medium text-gray-500">
            {isClinicSubAccount ? "Panou medic clinică" : "Panou medic"}
          </p>

          <h1 className="mt-2 text-4xl font-bold text-gray-900">
            Program și disponibilitate
          </h1>

          <p className="mt-3 max-w-3xl text-gray-600">
            {isClinicSubAccount
              ? "Configurează disponibilitatea doar pentru locația aprobată atribuită de Clinic Manager."
              : "Configurează zilele de lucru, intervalele orare, durata consultațiilor, pauzele și perioadele indisponibile."}
          </p>
        </header>

        <section className="mt-10">
          {clinics.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
              {isClinicSubAccount
                ? "Clinic Manager nu a atribuit încă o locație aprobată acestui cont de medic. Programul nu poate fi configurat până la atribuirea locației."
                : "Profilul tău nu este asociat unei clinici. Programul nu poate fi configurat încă."}
            </div>
          ) : (
            <DoctorAvailabilityManager
              clinics={clinics}
              availability={availability}
              daysOff={daysOff}
            />
          )}
        </section>
      </div>
    </main>
  );
}
