export type DoctorClinicScopeDoctor = {
  id: string;
  account_type?: string | null;
};

type SupabaseQueryClient = {
  from: (table: string) => any;
};

type ClinicDoctorRelationshipRow = {
  organization_id: string;
  clinic_id: string | null;
};

type OrganizationClinicRow = {
  organization_id: string;
  clinic_id: string;
  status: string;
};

type ClinicStatusRow = {
  id: string;
  status: string | null;
};

type DoctorClinicRow = {
  doctor_id: string;
  clinic_id: string;
};

function relationshipKey(organizationId: string, clinicId: string) {
  return `${organizationId}:${clinicId}`;
}

export function isClinicSubAccountDoctor(doctor: DoctorClinicScopeDoctor) {
  return doctor.account_type === "clinic_sub_account";
}

export async function getAllowedClinicIdsForDoctor(
  supabase: SupabaseQueryClient,
  doctor: DoctorClinicScopeDoctor
): Promise<string[] | null> {
  if (!isClinicSubAccountDoctor(doctor)) {
    return null;
  }

  const { data: relationships, error: relationshipsError } = await supabase
    .from("clinic_doctor_relationships")
    .select("organization_id, clinic_id")
    .eq("doctor_id", doctor.id)
    .eq("invitation_status", "accepted")
    .eq("payment_responsibility", "clinic_paid")
    .eq("coverage_status", "active")
    .not("clinic_id", "is", null);

  if (relationshipsError) {
    throw new Error(
      `Clinic doctor relationship lookup failed: ${relationshipsError.message}`
    );
  }

  const relationshipRows =
    (relationships ?? []) as ClinicDoctorRelationshipRow[];

  const assignedRelationships = relationshipRows.filter(
    (relationship): relationship is ClinicDoctorRelationshipRow & {
      clinic_id: string;
    } => Boolean(relationship.clinic_id)
  );

  if (assignedRelationships.length === 0) {
    return [];
  }

  const organizationIds = Array.from(
    new Set(
      assignedRelationships.map((relationship) => relationship.organization_id)
    )
  );

  const clinicIds = Array.from(
    new Set(assignedRelationships.map((relationship) => relationship.clinic_id))
  );

  const [organizationClinicsResult, clinicsResult] = await Promise.all([
    supabase
      .from("clinic_organization_clinics")
      .select("organization_id, clinic_id, status")
      .in("organization_id", organizationIds)
      .in("clinic_id", clinicIds)
      .eq("status", "active"),

    supabase
      .from("clinics")
      .select("id, status")
      .in("id", clinicIds)
      .eq("status", "approved"),
  ]);

  if (organizationClinicsResult.error) {
    throw new Error(
      `Clinic organization location lookup failed: ${organizationClinicsResult.error.message}`
    );
  }

  if (clinicsResult.error) {
    throw new Error(
      `Approved clinic lookup failed: ${clinicsResult.error.message}`
    );
  }

  const activeOrganizationClinicKeys = new Set(
    ((organizationClinicsResult.data ?? []) as OrganizationClinicRow[]).map(
      (row) => relationshipKey(row.organization_id, row.clinic_id)
    )
  );

  const approvedClinicIds = new Set(
    ((clinicsResult.data ?? []) as ClinicStatusRow[]).map((clinic) => clinic.id)
  );

  return assignedRelationships
    .filter(
      (relationship) =>
        approvedClinicIds.has(relationship.clinic_id) &&
        activeOrganizationClinicKeys.has(
          relationshipKey(relationship.organization_id, relationship.clinic_id)
        )
    )
    .map((relationship) => relationship.clinic_id);
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
