import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  normalizeAppLocale,
  selectTranslation,
} from "@/lib/i18n/app-locale";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

const ELIGIBLE_STATUSES = [
  "confirmed",
  "rescheduled",
  "completed",
] as const;

type DoctorProfileRelation = {
  first_name: string | null;
  last_name: string | null;
  account_status: string;
};

type DoctorRow = {
  id: string;
  slug: string;
  phone: string | null;
  status: string;
  profiles:
    | DoctorProfileRelation
    | DoctorProfileRelation[]
    | null;
};

type AppointmentRow = {
  doctor_id: string;
  clinic_id: string | null;
  created_at: string;
};

type ClinicTranslation = {
  locale: string;
  name: string;
};

type ClinicRow = {
  id: string;
  clinic_translations:
    ClinicTranslation[] | null;
};

function first<T>(
  value:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function cleanText(
  value: unknown,
  maximumLength: number
) {
  return typeof value === "string"
    ? value.trim().slice(
        0,
        maximumLength
      )
    : "";
}

function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function doctorName(
  doctor: DoctorRow
) {
  const profile =
    first(
      doctor.profiles
    );

  const name = [
    profile?.first_name,
    profile?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (name) {
    return `Dr. ${name}`;
  }

  return doctor.slug
    .split("-")
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0)
          .toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

async function requireActivePatient() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth
    .getUser();

  if (
    userError ||
    !user
  ) {
    return {
      supabase: null,
      userId: null,
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
      userId: null,
      response:
        NextResponse.json(
          {
            error:
              "Confirmă adresa de e-mail înainte de a modifica medicul de familie.",
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
      "role, account_status"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    profile?.role !== "patient" ||
    profile.account_status !== "active"
  ) {
    return {
      supabase: null,
      userId: null,
      response:
        NextResponse.json(
          {
            error:
              "Doar pacienții cu un cont activ pot desemna medicul de familie.",
          },
          { status: 403 }
        ),
    };
  }

  return {
    supabase,
    userId: user.id,
    response: null,
  };
}

async function loadPayload(
  patientProfileId: string,
  localeInput: string | null
) {
  const locale =
    normalizeAppLocale(
      localeInput
    );

  const admin =
    createAdminClient();

  const [
    appointmentsResult,
    familyLinkResult,
    familyEntryResult,
  ] = await Promise.all([
    admin
      .from("appointments")
      .select(
        "doctor_id, clinic_id, created_at"
      )
      .eq(
        "patient_profile_id",
        patientProfileId
      )
      .in(
        "status",
        [...ELIGIBLE_STATUSES]
      )
      .order(
        "created_at",
        { ascending: false }
      ),

    admin
      .from(
        "patient_family_doctors"
      )
      .select("doctor_id")
      .eq(
        "patient_profile_id",
        patientProfileId
      )
      .maybeSingle(),

    admin
      .from(
        "patient_medical_profile_entries"
      )
      .select("value")
      .eq(
        "patient_profile_id",
        patientProfileId
      )
      .eq(
        "field_key",
        "family_doctor"
      )
      .maybeSingle(),
  ]);

  if (appointmentsResult.error) {
    throw appointmentsResult.error;
  }

  if (familyLinkResult.error) {
    throw familyLinkResult.error;
  }

  if (familyEntryResult.error) {
    throw familyEntryResult.error;
  }

  const appointments =
    (appointmentsResult.data ?? []) as
      AppointmentRow[];

  const doctorIds =
    Array.from(
      new Set(
        appointments.map(
          (appointment) =>
            appointment.doctor_id
        )
      )
    );

  const clinicIds =
    Array.from(
      new Set(
        appointments
          .map(
            (appointment) =>
              appointment.clinic_id
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(value)
          )
      )
    );

  let doctors: DoctorRow[] = [];
  let clinics: ClinicRow[] = [];

  if (doctorIds.length > 0) {
    const {
      data,
      error,
    } = await admin
      .from("doctors")
      .select(`
        id,
        slug,
        phone,
        status,
        profiles!doctors_profile_id_fkey (
          first_name,
          last_name,
          account_status
        )
      `)
      .in("id", doctorIds)
      .eq("status", "active");

    if (error) {
      throw error;
    }

    doctors =
      (data ?? []) as unknown as
        DoctorRow[];
  }

  if (clinicIds.length > 0) {
    const {
      data,
      error,
    } = await admin
      .from("clinics")
      .select(`
        id,
        clinic_translations (
          locale,
          name
        )
      `)
      .in("id", clinicIds);

    if (error) {
      throw error;
    }

    clinics =
      (data ?? []) as unknown as
        ClinicRow[];
  }

  const clinicById =
    new Map(
      clinics.map(
        (clinic) => [
          clinic.id,
          clinic,
        ]
      )
    );

  const latestAppointmentByDoctor =
    new Map<string, AppointmentRow>();

  for (const appointment of appointments) {
    if (
      !latestAppointmentByDoctor.has(
        appointment.doctor_id
      )
    ) {
      latestAppointmentByDoctor.set(
        appointment.doctor_id,
        appointment
      );
    }
  }

  const options =
    doctors
      .filter((doctor) => {
        const profile =
          first(
            doctor.profiles
          );

        return (
          profile?.account_status ===
          "active"
        );
      })
      .map((doctor) => {
        const appointment =
          latestAppointmentByDoctor.get(
            doctor.id
          );

        const clinic =
          appointment?.clinic_id
            ? clinicById.get(
                appointment.clinic_id
              ) ?? null
            : null;

        return {
          doctorId: doctor.id,
          name: doctorName(doctor),
          clinic:
            selectTranslation(
              clinic?.clinic_translations,
              locale
            )?.name ?? "",
          phone:
            doctor.phone ?? "",
        };
      })
      .sort((left, right) =>
        left.name.localeCompare(
          right.name,
          locale === "ro"
            ? "ro-RO"
            : locale === "de"
              ? "de-DE"
              : "en-GB",
          {
            sensitivity: "base",
          }
        )
      );

  const linkedDoctorId =
    familyLinkResult.data
      ?.doctor_id ?? null;

  const rawValue =
    familyEntryResult.data
      ?.value as
      | Record<string, unknown>
      | undefined;

  const linkedOption =
    linkedDoctorId
      ? options.find(
          (option) =>
            option.doctorId ===
            linkedDoctorId
        ) ?? null
      : null;

  return {
    current: {
      doctorId:
        linkedDoctorId,
      name:
        linkedOption?.name ??
        cleanText(
          rawValue?.name,
          200
        ),
      clinic:
        linkedOption?.clinic ??
        cleanText(
          rawValue?.clinic,
          200
        ),
      phone:
        linkedOption?.phone ??
        cleanText(
          rawValue?.phone,
          50
        ),
    },
    options,
  };
}

export async function GET(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requireActivePatient();

  if (
    authorization.response ||
    !authorization.userId
  ) {
    return (
      authorization.response ??
      NextResponse.json(
        { error: "Acces neautorizat." },
        { status: 403 }
      )
    );
  }

  try {
    const payload =
      await loadPayload(
        authorization.userId,
        request.nextUrl.searchParams
          .get("locale")
      );

    return NextResponse.json(
      payload,
      {
        headers: {
          "Cache-Control":
            "private, no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "Patient family doctor load failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Medicul de familie nu a putut fi încărcat.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requireActivePatient();

  if (
    authorization.response ||
    !authorization.userId ||
    !authorization.supabase
  ) {
    return (
      authorization.response ??
      NextResponse.json(
        { error: "Acces neautorizat." },
        { status: 403 }
      )
    );
  }

  let body: {
    doctorId?: unknown;
    name?: unknown;
    clinic?: unknown;
    phone?: unknown;
    locale?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error:
          "Datele trimise nu sunt valide.",
      },
      { status: 400 }
    );
  }

  const doctorId =
    cleanText(
      body.doctorId,
      64
    );

  if (
    doctorId &&
    !isUuid(doctorId)
  ) {
    return NextResponse.json(
      {
        error:
          "Medicul selectat nu este valid.",
      },
      { status: 400 }
    );
  }

  const name =
    cleanText(
      body.name,
      200
    );

  const clinic =
    cleanText(
      body.clinic,
      200
    );

  const phone =
    cleanText(
      body.phone,
      50
    );

  const {
    error: updateError,
  } = await authorization.supabase
    .rpc(
      "set_own_family_doctor",
      {
        target_doctor_id:
          doctorId || null,
        target_name:
          name || null,
        target_clinic:
          clinic || null,
        target_phone:
          phone || null,
      }
    );

  if (updateError) {
    console.error(
      "Patient family doctor update failed:",
      updateError
    );

    return NextResponse.json(
      {
        error:
          updateError.message.includes(
            "family_doctor_must_be_treating_romdoc_doctor"
          )
            ? "Poți desemna ca medic de familie doar un medic RomDoc cu care ai o programare eligibilă."
            : "Medicul de familie nu a putut fi salvat.",
      },
      { status: 400 }
    );
  }

  try {
    const locale =
      typeof body.locale === "string"
        ? body.locale
        : null;

    const payload =
      await loadPayload(
        authorization.userId,
        locale
      );

    return NextResponse.json({
      success: true,
      ...payload,
    });
  } catch (error) {
    console.error(
      "Patient family doctor reload failed:",
      error
    );

    return NextResponse.json({
      success: true,
    });
  }
}
