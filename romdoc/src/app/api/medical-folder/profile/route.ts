import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  MEDICAL_PROFILE_FIELDS,
  emptyMedicalProfileValue,
  isClinicalMedicalProfileField,
  isMedicalProfileFieldKey,
  isPatientDeclarationField,
  type MedicalProfileEntry,
  type MedicalProfileFieldKey,
  type MedicalProfileModifierRole,
  type MedicalProfilePatientIdentity,
  type MedicalProfilePermissions,
  type MedicalProfileViewerRole,
  validateMedicalProfileValue,
} from "@/lib/patient-medical-profile";
import {
  loadStaffMedicalFolderAppointment,
  requireActiveStaffMedicalFolderAccess,
} from "@/lib/medical-folder/staff-access";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

const ALLOWED_APPOINTMENT_STATUSES =
  new Set([
    "confirmed",
    "rescheduled",
    "completed",
  ]);

type ActiveProfile = {
  id: string;
  role: MedicalProfileViewerRole;
  firstName: string | null;
  lastName: string | null;
};

type MedicalProfileRow = {
  field_key: MedicalProfileFieldKey;
  value: Record<string, string>;
  last_modified_by_profile_id: string;
  last_modified_at: string;
};

type ModifierProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeModifierRole(
  value: string
): MedicalProfileModifierRole {
  switch (value) {
    case "patient":
    case "doctor":
    case "staff":
    case "admin":
    case "manager":
    case "clinic_manager":
    case "doctor_applicant":
      return value;

    default:
      return null;
  }
}

function buildLegalName(
  firstName: string | null,
  lastName: string | null
) {
  return [
    firstName,
    lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function modifierDisplayName(
  profile: ModifierProfileRow
) {
  const name =
    buildLegalName(
      profile.first_name,
      profile.last_name
    );

  if (!name) {
    return null;
  }

  return profile.role === "doctor"
    ? `Dr. ${name}`
    : name;
}

function permissionsForRole(
  role: MedicalProfileViewerRole
): MedicalProfilePermissions {
  return {
    viewerRole: role,
    canEditClinicalFields:
      role === "doctor",
    canEditOrganDonationPreference:
      role === "patient",
  };
}

async function requireActiveProfile(): Promise<
  | {
      supabase: Awaited<ReturnType<typeof createClient>>;
      profile: ActiveProfile;
      response: null;
    }
  | {
      supabase: null;
      profile: null;
      response: NextResponse;
    }
> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase: null,
      profile: null,
      response: NextResponse.json(
        {
          error: "Trebuie să fii autentificat.",
        },
        { status: 401 }
      ),
    };
  }

  if (!user.email_confirmed_at) {
    return {
      supabase: null,
      profile: null,
      response: NextResponse.json(
        {
          error:
            "Confirmă adresa de e-mail înainte de a accesa profilul medical.",
        },
        { status: 403 }
      ),
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "id, role, account_status, first_name, last_name"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.account_status !== "active" ||
    ![
      "patient",
      "doctor",
      "staff",
    ].includes(profile.role)
  ) {
    return {
      supabase: null,
      profile: null,
      response: NextResponse.json(
        {
          error:
            "Contul nu are acces la profilul medical.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    supabase,
    profile: {
      id: profile.id,
      role:
        profile.role as
          MedicalProfileViewerRole,
      firstName:
        profile.first_name,
      lastName:
        profile.last_name,
    },
    response: null,
  };
}

async function resolveDoctorPatient(
  doctorProfileId: string,
  appointmentId: string
) {
  if (!isUuid(appointmentId)) {
    return null;
  }

  const admin = createAdminClient();

  const {
    data: doctor,
    error: doctorError,
  } = await admin
    .from("doctors")
    .select("id")
    .eq("profile_id", doctorProfileId)
    .maybeSingle();

  if (doctorError || !doctor) {
    return null;
  }

  const {
    data: appointment,
    error: appointmentError,
  } = await admin
    .from("appointments")
    .select(
      "id, patient_profile_id, status"
    )
    .eq("id", appointmentId)
    .eq("doctor_id", doctor.id)
    .maybeSingle();

  if (
    appointmentError ||
    !appointment ||
    !appointment.patient_profile_id ||
    !ALLOWED_APPOINTMENT_STATUSES.has(
      appointment.status
    )
  ) {
    return null;
  }

  return {
    patientProfileId:
      appointment.patient_profile_id,
  };
}

async function resolveStaffPatient(
  appointmentId: string
) {
  if (!isUuid(appointmentId)) {
    return null;
  }

  const staffAccess =
    await requireActiveStaffMedicalFolderAccess();

  if (staffAccess.response) {
    return null;
  }

  const appointment =
    await loadStaffMedicalFolderAppointment(
      appointmentId,
      staffAccess.authorization
    );

  if (!appointment) {
    return null;
  }

  return {
    patientProfileId:
      appointment.patient_profile_id,
  };
}

async function loadPatientIdentity(
  patientProfileId: string
): Promise<MedicalProfilePatientIdentity> {
  const admin = createAdminClient();

  const {
    data: patient,
    error,
  } = await admin
    .from("profiles")
    .select(
      "id, role, first_name, last_name"
    )
    .eq("id", patientProfileId)
    .eq("role", "patient")
    .maybeSingle();

  if (error || !patient) {
    if (error) {
      console.error(
        "Patient medical profile identity query failed:",
        error
      );
    }

    throw new Error(
      "Identitatea pacientului nu a putut fi încărcată."
    );
  }

  return {
    profileId: patient.id,
    firstName:
      patient.first_name,
    lastName:
      patient.last_name,
    legalName:
      buildLegalName(
        patient.first_name,
        patient.last_name
      ),
  };
}

async function loadEntries(
  patientProfileId: string
): Promise<MedicalProfileEntry[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from(
      "patient_medical_profile_entries"
    )
    .select(
      "field_key, value, last_modified_by_profile_id, last_modified_at"
    )
    .eq(
      "patient_profile_id",
      patientProfileId
    );

  if (error) {
    console.error(
      "Patient medical profile query failed:",
      error
    );

    throw new Error(
      "Profilul medical nu a putut fi încărcat."
    );
  }

  const rows =
    (data ?? []) as MedicalProfileRow[];

  const modifierIds = Array.from(
    new Set(
      rows.map(
        (row) =>
          row.last_modified_by_profile_id
      )
    )
  );

  const modifierNames =
    new Map<string, string>();

  const modifierRoles =
    new Map<
      string,
      MedicalProfileModifierRole
    >();

  if (modifierIds.length > 0) {
    const {
      data: profiles,
      error: profilesError,
    } = await admin
      .from("profiles")
      .select(
        "id, first_name, last_name, role"
      )
      .in("id", modifierIds);

    if (profilesError) {
      console.error(
        "Medical profile modifier query failed:",
        profilesError
      );
    } else {
      for (
        const modifier of
        (profiles ?? []) as
          ModifierProfileRow[]
      ) {
        const displayName =
          modifierDisplayName(
            modifier
          );

        if (displayName) {
          modifierNames.set(
            modifier.id,
            displayName
          );
        }

        modifierRoles.set(
          modifier.id,
          normalizeModifierRole(
            modifier.role
          )
        );
      }
    }
  }

  const rowsByKey = new Map<
    MedicalProfileFieldKey,
    MedicalProfileRow
  >(
    rows.map((row) => [
      row.field_key,
      row,
    ])
  );

  return MEDICAL_PROFILE_FIELDS.map(
    (field): MedicalProfileEntry => {
      const row =
        rowsByKey.get(field.key);

      if (!row) {
        return {
          fieldKey: field.key,
          value:
            emptyMedicalProfileValue(
              field.key
            ),
          lastModifiedByName: null,
          lastModifiedByRole: null,
          lastModifiedAt: null,
        };
      }

      const modifierName =
        modifierNames.get(
          row.last_modified_by_profile_id
        ) ?? null;

      return {
        fieldKey: field.key,
        value:
          row.value ??
          emptyMedicalProfileValue(
            field.key
          ),
        lastModifiedByName:
          modifierName,
        lastModifiedByRole:
          modifierRoles.get(
            row.last_modified_by_profile_id
          ) ?? null,
        lastModifiedAt:
          row.last_modified_at,
      };
    }
  );
}

async function loadProfileResponse(
  patientProfileId: string,
  viewerRole:
    MedicalProfileViewerRole
) {
  const [
    entries,
    patient,
  ] = await Promise.all([
    loadEntries(
      patientProfileId
    ),
    loadPatientIdentity(
      patientProfileId
    ),
  ]);

  return {
    entries,
    patient,
    permissions:
      permissionsForRole(
        viewerRole
      ),
  };
}

export async function GET(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requireActiveProfile();

  if (
    authorization.response ||
    !authorization.profile ||
    !authorization.supabase
  ) {
    return (
      authorization.response ??
      NextResponse.json(
        {
          error:
            "Contul nu are acces la profilul medical.",
        },
        { status: 403 }
      )
    );
  }

  const { profile } =
    authorization;

  let patientProfileId =
    profile.id;

  if (
    profile.role ===
    "doctor"
  ) {
    const appointmentId =
      request.nextUrl.searchParams
        .get("appointmentId")
        ?.trim() ?? "";

    const access =
      await resolveDoctorPatient(
        profile.id,
        appointmentId
      );

    if (!access) {
      return NextResponse.json(
        {
          error:
            "Nu ai acces la profilul medical pentru această programare.",
        },
        { status: 403 }
      );
    }

    patientProfileId =
      access.patientProfileId;
  }

  if (
    profile.role ===
    "staff"
  ) {
    const appointmentId =
      request.nextUrl.searchParams
        .get("appointmentId")
        ?.trim() ?? "";

    const access =
      await resolveStaffPatient(
        appointmentId
      );

    if (!access) {
      return NextResponse.json(
        {
          error:
            "Nu ai acces la profilul medical pentru această programare.",
        },
        { status: 403 }
      );
    }

    patientProfileId =
      access.patientProfileId;
  }

  try {
    const payload =
      await loadProfileResponse(
        patientProfileId,
        profile.role
      );

    return NextResponse.json(
      payload,
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Profilul medical nu a putut fi încărcat.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requireActiveProfile();

  if (
    authorization.response ||
    !authorization.profile ||
    !authorization.supabase
  ) {
    return (
      authorization.response ??
      NextResponse.json(
        {
          error:
            "Contul nu are acces la profilul medical.",
        },
        { status: 403 }
      )
    );
  }

  const {
    profile,
    supabase,
  } = authorization;

  if (
    profile.role ===
    "staff"
  ) {
    return NextResponse.json(
      {
        error:
          "Personalul autorizat poate consulta profilul medical, dar nu îl poate modifica.",
      },
      { status: 403 }
    );
  }

  let body: {
    appointmentId?: unknown;
    fieldKey?: unknown;
    value?: unknown;
  };

  try {
    body =
      (await request.json()) as {
        appointmentId?: unknown;
        fieldKey?: unknown;
        value?: unknown;
      };
  } catch {
    return NextResponse.json(
      {
        error:
          "Datele trimise nu sunt valide.",
      },
      { status: 400 }
    );
  }

  if (
    !isMedicalProfileFieldKey(
      body.fieldKey
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Secțiunea selectată nu este validă.",
      },
      { status: 400 }
    );
  }

  const fieldKey =
    body.fieldKey;

  const validation =
    validateMedicalProfileValue(
      fieldKey,
      body.value
    );

  if (validation.error) {
    return NextResponse.json(
      {
        error: validation.error,
      },
      { status: 400 }
    );
  }

  let patientProfileId =
    profile.id;

  if (
    profile.role ===
    "patient"
  ) {
    if (
      !isPatientDeclarationField(
        fieldKey
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Pacientul poate modifica numai declarațiile personale permise.",
        },
        { status: 403 }
      );
    }

    const { error: updateError } =
      await supabase.rpc(
        "update_own_organ_donation_preference",
        {
          target_value:
            validation.value,
        }
      );

    if (updateError) {
      console.error(
        "Patient organ-donation preference update failed:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Preferința privind donarea de organe nu a putut fi salvată.",
        },
        { status: 500 }
      );
    }
  }

  if (
    profile.role ===
    "doctor"
  ) {
    if (
      !isClinicalMedicalProfileField(
        fieldKey
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Această declarație aparține pacientului și nu poate fi modificată de medic.",
        },
        { status: 403 }
      );
    }

    const appointmentId =
      typeof body.appointmentId ===
        "string"
        ? body.appointmentId.trim()
        : "";

    if (!isUuid(appointmentId)) {
      return NextResponse.json(
        {
          error:
            "Programarea selectată nu este validă.",
        },
        { status: 400 }
      );
    }

    const access =
      await resolveDoctorPatient(
        profile.id,
        appointmentId
      );

    if (!access) {
      return NextResponse.json(
        {
          error:
            "Nu ai acces la profilul medical pentru această programare.",
        },
        { status: 403 }
      );
    }

    patientProfileId =
      access.patientProfileId;

    const { error: updateError } =
      await supabase.rpc(
        "update_patient_medical_profile_entry",
        {
          target_patient_profile_id:
            patientProfileId,
          target_appointment_id:
            appointmentId,
          target_field_key:
            fieldKey,
          target_value:
            validation.value,
        }
      );

    if (updateError) {
      console.error(
        "Patient medical profile update failed:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Secțiunea profilului medical nu a putut fi salvată.",
        },
        { status: 500 }
      );
    }
  }

  try {
    const payload =
      await loadProfileResponse(
        patientProfileId,
        profile.role
      );

    return NextResponse.json(
      {
        ...payload,
        message:
          "Informația profilului medical a fost salvată.",
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Profilul medical nu a putut fi reîncărcat.",
      },
      { status: 500 }
    );
  }
}
