import { createAdminClient } from "@/lib/supabase/admin";

export type DoctorClinicScopeDoctor = {
  id: string;
  account_type?: string | null;
};

type SupabaseQueryClient = {
  from: (table: string) => any;
};

type ClinicDoctorRelationshipRow = {
  clinic_id: string | null;
};

type DoctorClinicRow = {
  doctor_id: string;
  clinic_id: string;
};

export function isClinicSubAccountDoctor(doctor: DoctorClinicScopeDoctor) {
  return doctor.account_type === "clinic_sub_account";
}

async function getClinicSubAccountRelationshipClinicIds(doctorId: string) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("clinic_doctor_relationships")
    .select("clinic_id")
    .eq("doctor_id", doctorId)
    .eq("invitation_status", "accepted")
    .eq("payment_responsibility", "clinic_paid")
    .eq("coverage_status", "active")
    .not("clinic_id", "is", null);

  if (error) {
    throw new Error(
      `Clinic doctor relationship lookup failed: ${error.message}`
    );
  }

  return Array.from(
    new Set(
      ((data ?? []) as ClinicDoctorRelationshipRow[])
        .map((relationship) => relationship.clinic_id)
        .filter((clinicId): clinicId is string => Boolean(clinicId))
    )
  );
}

async function getDoctorClinicLinkIds(doctorId: string) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("doctor_clinics")
    .select("doctor_id, clinic_id")
    .eq("doctor_id", doctorId);

  if (error) {
    throw new Error(`Doctor clinic lookup failed: ${error.message}`);
  }

  return Array.from(
    new Set(((data ?? []) as DoctorClinicRow[]).map((row) => row.clinic_id))
  );
}

export async function getAllowedClinicIdsForDoctor(
  supabase: SupabaseQueryClient,
  doctor: DoctorClinicScopeDoctor
): Promise<string[] | null> {
  if (!isClinicSubAccountDoctor(doctor)) {
    return null;
  }

  const relationshipClinicIds = await getClinicSubAccountRelationshipClinicIds(
    doctor.id
  );

  if (relationshipClinicIds.length > 0) {
    return relationshipClinicIds;
  }

  /*
   * Repair-tolerant fallback.
   *
   * Step 72R synchronizes the assigned clinic into doctor_clinics after the
   * Clinic Manager chooses an approved location. Older rows or RLS-restricted
   * sessions can make the relationship lookup appear empty even when the
   * doctor profile, clinics page, and staff flow already see the assigned
   * clinic. In that case we trust the synchronized doctor_clinics link so the
   * doctor is not locked out of availability.
   */
  return getDoctorClinicLinkIds(doctor.id);
}

export async function doctorCanUseClinic(
  supabase: SupabaseQueryClient,
  doctor: DoctorClinicScopeDoctor,
  clinicId: string
) {
  if (isClinicSubAccountDoctor(doctor)) {
    const allowedClinicIds = await getAllowedClinicIdsForDoctor(
      supabase,
      doctor
    );

    return allowedClinicIds?.includes(clinicId) ?? false;
  }

  const { data, error } = await supabase
    .from("doctor_clinics")
    .select("doctor_id, clinic_id")
    .eq("doctor_id", doctor.id)
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (error) {
    throw new Error(`Doctor clinic lookup failed: ${error.message}`);
  }

  return Boolean((data as DoctorClinicRow | null) ?? null);
}
