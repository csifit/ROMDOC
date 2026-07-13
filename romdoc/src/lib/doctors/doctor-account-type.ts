import type {
  SupabaseClient,
} from "@supabase/supabase-js";

export const DOCTOR_ACCOUNT_TYPES = [
  "independent",
  "clinic_invited",
] as const;

export type DoctorAccountType =
  (typeof DOCTOR_ACCOUNT_TYPES)[number];

export type DoctorAccountIdentity = {
  doctorId: string;
  profileId: string;
  accountType: DoctorAccountType;
  clinicOrganizationId: string | null;
  clinicDoctorRelationshipId: string | null;
};

type DoctorAccountRow = {
  id: string;
  profile_id: string;
  account_type: unknown;
  clinic_organization_id: string | null;
  clinic_doctor_relationship_id: string | null;
};

type DoctorLookupColumn =
  | "id"
  | "profile_id";

export type DoctorAccountModelErrorCode =
  | "doctor_account_not_found"
  | "invalid_doctor_account_type"
  | "invalid_independent_doctor_linkage"
  | "invalid_clinic_invited_doctor_linkage"
  | "independent_doctor_required"
  | "clinic_invited_doctor_required";

export class DoctorAccountModelError
  extends Error {
  readonly code:
    DoctorAccountModelErrorCode;

  constructor(
    code: DoctorAccountModelErrorCode
  ) {
    super(code);
    this.name =
      "DoctorAccountModelError";
    this.code = code;
  }
}

export function isDoctorAccountType(
  value: unknown
): value is DoctorAccountType {
  return (
    typeof value === "string" &&
    DOCTOR_ACCOUNT_TYPES.includes(
      value as DoctorAccountType
    )
  );
}

export function isIndependentDoctorAccount(
  account: DoctorAccountIdentity
): boolean {
  return (
    account.accountType ===
    "independent"
  );
}

export function isClinicInvitedDoctorAccount(
  account: DoctorAccountIdentity
): boolean {
  return (
    account.accountType ===
    "clinic_invited"
  );
}

function normalizeDoctorAccount(
  row: DoctorAccountRow
): DoctorAccountIdentity {
  if (
    !isDoctorAccountType(
      row.account_type
    )
  ) {
    throw new DoctorAccountModelError(
      "invalid_doctor_account_type"
    );
  }

  if (
    row.account_type ===
    "independent"
  ) {
    if (
      row.clinic_organization_id !==
        null ||
      row.clinic_doctor_relationship_id !==
        null
    ) {
      throw new DoctorAccountModelError(
        "invalid_independent_doctor_linkage"
      );
    }
  }

  if (
    row.account_type ===
    "clinic_invited"
  ) {
    if (
      row.clinic_organization_id ===
        null ||
      row.clinic_doctor_relationship_id ===
        null
    ) {
      throw new DoctorAccountModelError(
        "invalid_clinic_invited_doctor_linkage"
      );
    }
  }

  return {
    doctorId: row.id,
    profileId: row.profile_id,
    accountType: row.account_type,
    clinicOrganizationId:
      row.clinic_organization_id,
    clinicDoctorRelationshipId:
      row.clinic_doctor_relationship_id,
  };
}

async function loadDoctorAccount(
  supabase: SupabaseClient,
  column: DoctorLookupColumn,
  value: string
): Promise<
  DoctorAccountIdentity | null
> {
  const {
    data,
    error,
  } = await supabase
    .from("doctors")
    .select(`
      id,
      profile_id,
      account_type,
      clinic_organization_id,
      clinic_doctor_relationship_id
    `)
    .eq(column, value)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return normalizeDoctorAccount(
    data as unknown as DoctorAccountRow
  );
}

export async function getDoctorAccountById(
  supabase: SupabaseClient,
  doctorId: string
): Promise<
  DoctorAccountIdentity | null
> {
  return loadDoctorAccount(
    supabase,
    "id",
    doctorId
  );
}

export async function getDoctorAccountByProfileId(
  supabase: SupabaseClient,
  profileId: string
): Promise<
  DoctorAccountIdentity | null
> {
  return loadDoctorAccount(
    supabase,
    "profile_id",
    profileId
  );
}

export async function requireDoctorAccountById(
  supabase: SupabaseClient,
  doctorId: string
): Promise<DoctorAccountIdentity> {
  const account =
    await getDoctorAccountById(
      supabase,
      doctorId
    );

  if (!account) {
    throw new DoctorAccountModelError(
      "doctor_account_not_found"
    );
  }

  return account;
}

export async function requireDoctorAccountByProfileId(
  supabase: SupabaseClient,
  profileId: string
): Promise<DoctorAccountIdentity> {
  const account =
    await getDoctorAccountByProfileId(
      supabase,
      profileId
    );

  if (!account) {
    throw new DoctorAccountModelError(
      "doctor_account_not_found"
    );
  }

  return account;
}

export function requireIndependentDoctorAccount(
  account: DoctorAccountIdentity
): DoctorAccountIdentity {
  if (
    !isIndependentDoctorAccount(
      account
    )
  ) {
    throw new DoctorAccountModelError(
      "independent_doctor_required"
    );
  }

  return account;
}

export function requireClinicInvitedDoctorAccount(
  account: DoctorAccountIdentity
): DoctorAccountIdentity {
  if (
    !isClinicInvitedDoctorAccount(
      account
    )
  ) {
    throw new DoctorAccountModelError(
      "clinic_invited_doctor_required"
    );
  }

  return account;
}
