import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  MEDICAL_PROFILE_FIELDS,
  emptyMedicalProfileValue,
  type MedicalProfileEntry,
  type MedicalProfileFieldKey,
  validateMedicalProfileValue,
} from "@/lib/patient-medical-profile";
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
  role: "patient" | "doctor";
};

type MedicalProfileRow = {
  field_key: MedicalProfileFieldKey;
  value: Record<string, string>;
  last_modified_by_profile_id: string;
  last_modified_at: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isMedicalProfileFieldKey(
  value: unknown
): value is MedicalProfileFieldKey {
  return (
    typeof value === "string" &&
    MEDICAL_PROFILE_FIELDS.some(
      (field) =>
        field.key === value
    )
  );
}

async function requireActiveProfile():
  Promise<
    | {
        supabase:
          Awaited<
            ReturnType<
              typeof createClient
            >
          >;
        profile: ActiveProfile;
        response: null;
      }
    | {
        supabase: null;
        profile: null;
        response: NextResponse;
      }
  > {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase: null,
      profile: null,
      response:
        NextResponse.json(
          {
            error:
              "Trebuie să fii autentificat.",
          },
          { status: 401 }
        ),
    };
  }

  if (!user.email_confirmed_at) {
    return {
      supabase: null,
      profile: null,
      response:
        NextResponse.json(
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
      "id, role, account_status"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.account_status !==
      "active" ||
    (
      profile.role !== "patient" &&
      profile.role !== "doctor"
    )
  ) {
    return {
      supabase: null,
      profile: null,
      response:
        NextResponse.json(
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
      role: profile.role,
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

  const admin =
    createAdminClient();

  const {
    data: doctor,
    error: doctorError,
  } = await admin
    .from("doctors")
    .select("id")
    .eq(
      "profile_id",
      doctorProfileId
    )
    .maybeSingle();

  if (
    doctorError ||
    !doctor
  ) {
    return null;
  }

  const {
    data: appointment,
    error: appointmentError,
  } = await admin
    .from("appointments")
    .select(`
      id,
      patient_profile_id,
      status
    `)
    .eq("id", appointmentId)
    .eq(
      "doctor_id",
      doctor.id
    )
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

function doctorDisplayName(
  firstName: string | null,
  lastName: string | null
) {
  const name =
    [
      firstName,
      lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  return name
    ? `Dr. ${name}`
    : "Medic RomDoc";
}

async function loadEntries(
  patientProfileId: string
): Promise<MedicalProfileEntry[]> {
  const admin =
    createAdminClient();

  const {
    data,
    error,
  } = await admin
    .from(
      "patient_medical_profile_entries"
    )
    .select(`
      field_key,
      value,
      last_modified_by_profile_id,
      last_modified_at
    `)
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
    (data ?? []) as
      MedicalProfileRow[];

  const modifierIds =
    Array.from(
      new Set(
        rows.map(
          (row) =>
            row.last_modified_by_profile_id
        )
      )
    );

  const modifierNames =
    new Map<string, string>();

  if (modifierIds.length > 0) {
    const {
      data: profiles,
      error: profilesError,
    } = await admin
      .from("profiles")
      .select(`
        id,
        first_name,
        last_name
      `)
      .in("id", modifierIds);

    if (profilesError) {
      console.error(
        "Medical profile modifier query failed:",
        profilesError
      );
    } else {
      for (
        const modifier of
          profiles ?? []
      ) {
        modifierNames.set(
          modifier.id,
          doctorDisplayName(
            modifier.first_name,
            modifier.last_name
          )
        );
      }
    }
  }

  const rowsByKey =
    new Map<
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
        rowsByKey.get(
          field.key
        );

      if (!row) {
        return {
          fieldKey: field.key,
          value:
            emptyMedicalProfileValue(
              field.key
            ),
          lastModifiedByDoctor:
            null,
          lastModifiedAt: null,
        };
      }

      return {
        fieldKey: field.key,
        value:
          row.value ??
          emptyMedicalProfileValue(
            field.key
          ),
        lastModifiedByDoctor:
          modifierNames.get(
            row.last_modified_by_profile_id
          ) ??
          "Medic RomDoc",
        lastModifiedAt:
          row.last_modified_at,
      };
    }
  );
}

export async function GET(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requireActiveProfile();

  if (authorization.response) {
    return authorization.response;
  }

  let patientProfileId =
    authorization.profile.id;

  if (
    authorization.profile.role ===
      "doctor"
  ) {
    const appointmentId =
      request.nextUrl.searchParams
        .get("appointmentId")
        ?.trim() ?? "";

    const access =
      await resolveDoctorPatient(
        authorization.profile.id,
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
    const entries =
      await loadEntries(
        patientProfileId
      );

    return NextResponse.json(
      { entries },
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

  if (authorization.response) {
    return authorization.response;
  }

  if (
    authorization.profile.role !==
      "doctor"
  ) {
    return NextResponse.json(
      {
        error:
          "Numai medicii autorizați pot modifica profilul medical.",
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
      await request.json() as {
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

  const appointmentId =
    typeof body.appointmentId ===
      "string"
      ? body.appointmentId.trim()
      : "";

  if (
    !isUuid(appointmentId) ||
    !isMedicalProfileFieldKey(
      body.fieldKey
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Programarea sau secțiunea selectată nu este validă.",
      },
      { status: 400 }
    );
  }

  const validation =
    validateMedicalProfileValue(
      body.fieldKey,
      body.value
    );

  if (validation.error) {
    return NextResponse.json(
      {
        error:
          validation.error,
      },
      { status: 400 }
    );
  }

  const access =
    await resolveDoctorPatient(
      authorization.profile.id,
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

  const {
    error: updateError,
  } =
    await authorization.supabase.rpc(
      "update_patient_medical_profile_entry",
      {
        target_patient_profile_id:
          access.patientProfileId,
        target_appointment_id:
          appointmentId,
        target_field_key:
          body.fieldKey,
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

  try {
    const entries =
      await loadEntries(
        access.patientProfileId
      );

    return NextResponse.json(
      {
        entries,
        message:
          "Informația medicală a fost salvată.",
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
