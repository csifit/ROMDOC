import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  isClinicInvitedDoctorAccount,
  type DoctorAccountIdentity,
} from "@/lib/doctors/doctor-account-type";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export type DoctorClinicScopeDoctor = {
  id: string;
  profile_id?: string | null;
  account_type?: string | null;
  clinic_organization_id?: string | null;
  clinic_doctor_relationship_id?: string | null;
};

type ClinicDoctorRelationshipRow = {
  clinic_id: string | null;
};

type DoctorClinicRow = {
  doctor_id: string;
  clinic_id: string;
};

function toDoctorAccountIdentity(
  doctor: DoctorClinicScopeDoctor
): DoctorAccountIdentity | null {
  if (
    doctor.account_type !==
    "clinic_invited"
  ) {
    return null;
  }

  if (
    !doctor.profile_id ||
    !doctor.clinic_organization_id ||
    !doctor.clinic_doctor_relationship_id
  ) {
    return null;
  }

  return {
    doctorId: doctor.id,
    profileId: doctor.profile_id,
    accountType: "clinic_invited",
    clinicOrganizationId:
      doctor.clinic_organization_id,
    clinicDoctorRelationshipId:
      doctor.clinic_doctor_relationship_id,
  };
}

/**
 * Compatibility export.
 *
 * The function name is preserved so existing imports do not break.
 * The final database account type is now `clinic_invited`.
 */
export function isClinicSubAccountDoctor(
  doctor: DoctorClinicScopeDoctor
): boolean {
  const account =
    toDoctorAccountIdentity(doctor);

  return (
    account !== null &&
    isClinicInvitedDoctorAccount(
      account
    )
  );
}

async function getClinicInvitedRelationshipClinicIds(
  doctorId: string
): Promise<string[]> {
  const admin =
    createAdminClient();

  const {
    data,
    error,
  } = await admin
    .from(
      "clinic_doctor_relationships"
    )
    .select("clinic_id")
    .eq("doctor_id", doctorId)
    .eq(
      "invitation_status",
      "accepted"
    )
    .eq(
      "payment_responsibility",
      "clinic_paid"
    )
    .eq(
      "coverage_status",
      "active"
    )
    .not("clinic_id", "is", null);

  if (error) {
    throw new Error(
      `Clinic doctor relationship lookup failed: ${error.message}`
    );
  }

  const rows =
    (data ??
      []) as ClinicDoctorRelationshipRow[];

  const clinicIds = rows
    .map(
      (relationship) =>
        relationship.clinic_id
    )
    .filter(
      (
        clinicId
      ): clinicId is string =>
        Boolean(clinicId)
    );

  return Array.from(
    new Set(clinicIds)
  );
}

async function getDoctorClinicLinkIds(
  doctorId: string
): Promise<string[]> {
  const admin =
    createAdminClient();

  const {
    data,
    error,
  } = await admin
    .from("doctor_clinics")
    .select(
      "doctor_id, clinic_id"
    )
    .eq("doctor_id", doctorId);

  if (error) {
    throw new Error(
      `Doctor clinic lookup failed: ${error.message}`
    );
  }

  const rows =
    (data ?? []) as DoctorClinicRow[];

  const clinicIds = rows.map(
    (row) => row.clinic_id
  );

  return Array.from(
    new Set(clinicIds)
  );
}

export async function getAllowedClinicIdsForDoctor(
  _supabase: SupabaseClient,
  doctor: DoctorClinicScopeDoctor
): Promise<string[] | null> {
  if (
    !isClinicSubAccountDoctor(
      doctor
    )
  ) {
    return null;
  }

  const relationshipClinicIds =
    await getClinicInvitedRelationshipClinicIds(
      doctor.id
    );

  if (
    relationshipClinicIds.length >
    0
  ) {
    return relationshipClinicIds;
  }

  /*
   * Repair-tolerant fallback.
   *
   * Older rows or RLS-restricted sessions can make the relationship
   * lookup appear empty even when doctor_clinics is synchronized.
   */
  return getDoctorClinicLinkIds(
    doctor.id
  );
}

export async function doctorCanUseClinic(
  supabase: SupabaseClient,
  doctor: DoctorClinicScopeDoctor,
  clinicId: string
): Promise<boolean> {
  if (
    isClinicSubAccountDoctor(
      doctor
    )
  ) {
    const allowedClinicIds =
      await getAllowedClinicIdsForDoctor(
        supabase,
        doctor
      );

    return (
      allowedClinicIds?.includes(
        clinicId
      ) ?? false
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("doctor_clinics")
    .select(
      "doctor_id, clinic_id"
    )
    .eq("doctor_id", doctor.id)
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Doctor clinic lookup failed: ${error.message}`
    );
  }

  return Boolean(
    (data as DoctorClinicRow | null) ??
      null
  );
}
