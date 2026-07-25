import type {
  SupabaseClient,
} from "@supabase/supabase-js";

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
  invitation_status: string;
  coverage_status: string;
};

type DoctorClinicRow = {
  doctor_id: string;
  clinic_id: string;
};

type ClinicInvitedRelationshipScope = {
  hasAcceptedRelationships: boolean;
  activeClinicIds: string[];
};

/**
 * Compatibility export.
 *
 * The historical function name is preserved so existing imports do not break.
 * The final database account type is `clinic_invited`.
 */
export function isClinicSubAccountDoctor(
  doctor: DoctorClinicScopeDoctor
): boolean {
  return doctor.account_type === "clinic_invited";
}

async function getClinicInvitedRelationshipScope(
  doctorId: string
): Promise<ClinicInvitedRelationshipScope> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clinic_doctor_relationships")
    .select("clinic_id, invitation_status, coverage_status")
    .eq("doctor_id", doctorId);

  if (error) {
    throw new Error(
      `Clinic Doctor relationship lookup failed: ${error.message}`
    );
  }

  const rows = (data ?? []) as ClinicDoctorRelationshipRow[];
  const acceptedRows = rows.filter(
    (relationship) => relationship.invitation_status === "accepted"
  );
  const activeClinicIds = acceptedRows
    .filter(
      (relationship) =>
        relationship.coverage_status === "active" &&
        Boolean(relationship.clinic_id)
    )
    .map((relationship) => relationship.clinic_id)
    .filter((clinicId): clinicId is string => Boolean(clinicId));

  return {
    hasAcceptedRelationships: acceptedRows.length > 0,
    activeClinicIds: Array.from(new Set(activeClinicIds)),
  };
}

async function getDoctorClinicLinkIds(
  doctorId: string
): Promise<string[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("doctor_clinics")
    .select("doctor_id, clinic_id")
    .eq("doctor_id", doctorId);

  if (error) {
    throw new Error(`Doctor clinic lookup failed: ${error.message}`);
  }

  const rows = (data ?? []) as DoctorClinicRow[];
  return Array.from(new Set(rows.map((row) => row.clinic_id)));
}

export async function getAllowedClinicIdsForDoctor(
  _supabase: SupabaseClient,
  doctor: DoctorClinicScopeDoctor
): Promise<string[] | null> {
  if (!isClinicSubAccountDoctor(doctor)) {
    return null;
  }

  try {
    const relationshipScope =
      await getClinicInvitedRelationshipScope(doctor.id);

    /*
     * An accepted relationship is authoritative. A paused, cancelled, ended,
     * or otherwise inactive relationship returns an empty clinic list. This
     * prevents doctor_clinics from bypassing an organisation suspension.
     */
    if (relationshipScope.hasAcceptedRelationships) {
      return relationshipScope.activeClinicIds;
    }

    /*
     * Legacy repair fallback. Use doctor_clinics only when no accepted
     * organisation relationship exists at all.
     */
    return await getDoctorClinicLinkIds(doctor.id);
  } catch (scopeError) {
    /*
     * Clinic-invited Doctor scope must fail closed. Returning an empty list
     * prevents an organisation-scoped Doctor from seeing or editing data from
     * unrelated clinic locations when a scope lookup fails.
     */
    console.error(
      "Clinic-invited Doctor scope lookup failed; access was closed:",
      scopeError
    );
    return [];
  }
}

export async function doctorCanUseClinic(
  supabase: SupabaseClient,
  doctor: DoctorClinicScopeDoctor,
  clinicId: string
): Promise<boolean> {
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
