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

const ELIGIBLE_VISIT_STATUSES = [
  "confirmed",
  "rescheduled",
  "completed",
] as const;

type RouteContext = {
  params: Promise<{
    patientId: string;
  }>;
};

type ProfileRelation = {
  first_name: string | null;
  last_name: string | null;
};

type SpecialtyTranslation = {
  locale: string;
  name: string;
};

type SpecialtyRelation = {
  specialty_translations:
    SpecialtyTranslation[] | null;
};

type DoctorSpecialtyRelation = {
  specialties:
    | SpecialtyRelation
    | SpecialtyRelation[]
    | null;
};

type DoctorRelation = {
  id: string;
  slug: string;
  profiles:
    | ProfileRelation
    | ProfileRelation[]
    | null;
  doctor_specialties:
    DoctorSpecialtyRelation[] | null;
};

type ClinicTranslation = {
  locale: string;
  name: string;
};

type ClinicRelation = {
  id: string;
  clinic_translations:
    ClinicTranslation[] | null;
};

type VisitRow = {
  id: string;
  doctor_id: string;
  requested_date: string;
  requested_time: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string;
  created_at: string;
  doctors:
    | DoctorRelation
    | DoctorRelation[]
    | null;
  clinics:
    | ClinicRelation
    | ClinicRelation[]
    | null;
};

type ProfileHistoryRow = {
  id: string;
  field_key: string;
  previous_value:
    Record<string, unknown> | null;
  new_value:
    Record<string, unknown>;
  changed_by_profile_id: string;
  changed_at: string;
};

type DocumentRow = {
  id: string;
  title: string;
  document_type: string;
  uploaded_by_doctor_id: string;
};

type DocumentEventRow = {
  id: string;
  document_id: string;
  event_type: string;
  actor_profile_id: string;
  actor_role: string;
  created_at: string;
};

type ModifierRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
};

function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

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

function nameFromProfile(
  profile:
    | ProfileRelation
    | ModifierRow
    | null
    | undefined
) {
  return [
    profile?.first_name,
    profile?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function doctorName(
  doctor: DoctorRelation | null
) {
  if (!doctor) {
    return "Medic";
  }

  const name =
    nameFromProfile(
      first(
        doctor.profiles
      )
    );

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

function actorName(
  profile: ModifierRow | undefined
) {
  const name =
    nameFromProfile(profile);

  if (!name) {
    return profile?.role === "doctor"
      ? "Medic"
      : "Utilizator";
  }

  return profile?.role === "doctor"
    ? `Dr. ${name}`
    : name;
}

function visitTimestamp(
  visit: VisitRow
) {
  const date =
    visit.scheduled_date ??
    visit.requested_date;

  const time =
    visit.scheduled_time ??
    visit.requested_time ??
    "00:00:00";

  return new Date(
    `${date}T${time.slice(0, 8)}`
  ).getTime();
}

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const { patientId } =
    await context.params;

  if (!isUuid(patientId)) {
    return NextResponse.json(
      {
        error:
          "Pacientul selectat nu este valid.",
      },
      { status: 400 }
    );
  }

  const locale =
    normalizeAppLocale(
      request.nextUrl.searchParams
        .get("locale")
    );

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
    return NextResponse.json(
      {
        error:
          "Trebuie să fii autentificat.",
      },
      { status: 401 }
    );
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
    profile?.role !== "doctor" ||
    profile.account_status !== "active"
  ) {
    return NextResponse.json(
      {
        error:
          "Doar medicii cu un cont activ pot vedea această secțiune.",
      },
      { status: 403 }
    );
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
      user.id
    )
    .eq("status", "active")
    .maybeSingle();

  if (
    doctorError ||
    !doctor
  ) {
    return NextResponse.json(
      {
        error:
          "Profilul medicului nu a putut fi verificat.",
      },
      { status: 403 }
    );
  }

  const {
    data: patient,
    error: patientError,
  } = await admin
    .from("doctor_patients")
    .select(
      "id, patient_profile_id"
    )
    .eq("id", patientId)
    .eq(
      "doctor_id",
      doctor.id
    )
    .is(
      "archived_at",
      null
    )
    .maybeSingle();

  if (
    patientError ||
    !patient
  ) {
    return NextResponse.json(
      {
        error:
          "Pacientul nu a fost găsit în baza ta de pacienți.",
      },
      { status: 404 }
    );
  }

  if (!patient.patient_profile_id) {
    return NextResponse.json(
      {
        isFamilyDoctor: false,
        visits: [],
        clinicalHistory: [],
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store, max-age=0",
        },
      }
    );
  }

  const patientProfileId =
    patient.patient_profile_id;

  const {
    data: familyLink,
    error: familyLinkError,
  } = await admin
    .from(
      "patient_family_doctors"
    )
    .select("doctor_id")
    .eq(
      "patient_profile_id",
      patientProfileId
    )
    .eq(
      "doctor_id",
      doctor.id
    )
    .maybeSingle();

  if (familyLinkError) {
    console.error(
      "Family Doctor link lookup failed:",
      familyLinkError
    );
  }

  const isFamilyDoctor =
    Boolean(familyLink);

  let visitsQuery =
    admin
      .from("appointments")
      .select(`
        id,
        doctor_id,
        requested_date,
        requested_time,
        scheduled_date,
        scheduled_time,
        status,
        created_at,
        doctors (
          id,
          slug,
          profiles!doctors_profile_id_fkey (
            first_name,
            last_name
          ),
          doctor_specialties (
            specialties (
              specialty_translations (
                locale,
                name
              )
            )
          )
        ),
        clinics (
          id,
          clinic_translations (
            locale,
            name
          )
        )
      `)
      .eq(
        "patient_profile_id",
        patientProfileId
      )
      .in(
        "status",
        [...ELIGIBLE_VISIT_STATUSES]
      );

  if (!isFamilyDoctor) {
    visitsQuery =
      visitsQuery.eq(
        "doctor_id",
        doctor.id
      );
  }

  const {
    data: visitsData,
    error: visitsError,
  } = await visitsQuery
    .order(
      "created_at",
      { ascending: false }
    );

  if (visitsError) {
    console.error(
      "Recent doctor visits query failed:",
      visitsError
    );

    return NextResponse.json(
      {
        error:
          "Vizitele medicale recente nu au putut fi încărcate.",
      },
      { status: 500 }
    );
  }

  const visits =
    ((visitsData ?? []) as unknown as
      VisitRow[])
      .sort(
        (left, right) =>
          visitTimestamp(right) -
          visitTimestamp(left)
      )
      .map((visit) => {
        const doctorRelation =
          first(
            visit.doctors
          );

        const clinicRelation =
          first(
            visit.clinics
          );

        const specialty =
          first(
            doctorRelation
              ?.doctor_specialties
              ?.[0]
              ?.specialties
          );

        return {
          id: visit.id,
          date:
            visit.scheduled_date ??
            visit.requested_date,
          time:
            visit.scheduled_time ??
            visit.requested_time,
          status: visit.status,
          doctorName:
            doctorName(
              doctorRelation
            ),
          specialtyName:
            selectTranslation(
              specialty
                ?.specialty_translations,
              locale
            )?.name ?? "—",
          clinicName:
            selectTranslation(
              clinicRelation
                ?.clinic_translations,
              locale
            )?.name ?? "—",
          isCurrentDoctor:
            visit.doctor_id ===
            doctor.id,
        };
      });

  if (!isFamilyDoctor) {
    return NextResponse.json(
      {
        isFamilyDoctor: false,
        visits,
        clinicalHistory: [],
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store, max-age=0",
        },
      }
    );
  }

  const [
    profileHistoryResult,
    ownDocumentsResult,
    sharesResult,
  ] = await Promise.all([
    admin
      .from(
        "patient_medical_profile_history"
      )
      .select(`
        id,
        field_key,
        previous_value,
        new_value,
        changed_by_profile_id,
        changed_at
      `)
      .eq(
        "patient_profile_id",
        patientProfileId
      )
      .order(
        "changed_at",
        { ascending: false }
      )
      .limit(100),

    admin
      .from(
        "patient_medical_documents"
      )
      .select(`
        id,
        title,
        document_type,
        uploaded_by_doctor_id
      `)
      .eq(
        "patient_profile_id",
        patientProfileId
      )
      .eq(
        "uploaded_by_doctor_id",
        doctor.id
      ),

    admin
      .from(
        "patient_medical_document_shares"
      )
      .select("document_id")
      .eq(
        "patient_profile_id",
        patientProfileId
      )
      .eq(
        "doctor_id",
        doctor.id
      )
      .is(
        "revoked_at",
        null
      )
      .or(
        `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`
      ),
  ]);

  if (profileHistoryResult.error) {
    console.error(
      "Medical Profile history load failed:",
      profileHistoryResult.error
    );
  }

  if (ownDocumentsResult.error) {
    console.error(
      "Family Doctor own document lookup failed:",
      ownDocumentsResult.error
    );
  }

  if (sharesResult.error) {
    console.error(
      "Family Doctor shared document lookup failed:",
      sharesResult.error
    );
  }

  const documentById =
    new Map<string, DocumentRow>();

  for (
    const document of
      (ownDocumentsResult.data ?? []) as
        DocumentRow[]
  ) {
    documentById.set(
      document.id,
      document
    );
  }

  const sharedIds =
    (sharesResult.data ?? [])
      .map(
        (share) =>
          share.document_id
      );

  if (sharedIds.length > 0) {
    const {
      data,
      error,
    } = await admin
      .from(
        "patient_medical_documents"
      )
      .select(`
        id,
        title,
        document_type,
        uploaded_by_doctor_id
      `)
      .in("id", sharedIds)
      .eq(
        "patient_profile_id",
        patientProfileId
      )
      .is(
        "deleted_at",
        null
      );

    if (error) {
      console.error(
        "Shared medical document metadata load failed:",
        error
      );
    } else {
      for (
        const document of
          (data ?? []) as
            DocumentRow[]
      ) {
        documentById.set(
          document.id,
          document
        );
      }
    }
  }

  const accessibleDocumentIds =
    Array.from(
      documentById.keys()
    );

  let documentEvents:
    DocumentEventRow[] = [];

  if (accessibleDocumentIds.length > 0) {
    const {
      data,
      error,
    } = await admin
      .from(
        "patient_medical_document_events"
      )
      .select(`
        id,
        document_id,
        event_type,
        actor_profile_id,
        actor_role,
        created_at
      `)
      .eq(
        "patient_profile_id",
        patientProfileId
      )
      .in(
        "document_id",
        accessibleDocumentIds
      )
      .in(
        "event_type",
        [
          "created",
          "soft_deleted",
        ]
      )
      .order(
        "created_at",
        { ascending: false }
      )
      .limit(100);

    if (error) {
      console.error(
        "Medical Folder clinical history load failed:",
        error
      );
    } else {
      documentEvents =
        (data ?? []) as
          DocumentEventRow[];
    }
  }

  const profileHistory =
    (profileHistoryResult.data ?? []) as
      ProfileHistoryRow[];

  const actorIds =
    Array.from(
      new Set([
        ...profileHistory.map(
          (event) =>
            event.changed_by_profile_id
        ),
        ...documentEvents.map(
          (event) =>
            event.actor_profile_id
        ),
      ])
    );

  let modifiers: ModifierRow[] = [];

  if (actorIds.length > 0) {
    const {
      data,
      error,
    } = await admin
      .from("profiles")
      .select(
        "id, first_name, last_name, role"
      )
      .in("id", actorIds);

    if (error) {
      console.error(
        "Clinical history actor load failed:",
        error
      );
    } else {
      modifiers =
        (data ?? []) as
          ModifierRow[];
    }
  }

  const modifierById =
    new Map(
      modifiers.map(
        (modifier) => [
          modifier.id,
          modifier,
        ]
      )
    );

  const clinicalHistory = [
    ...profileHistory.map(
      (event) => ({
        id:
          `profile-${event.id}`,
        kind:
          "profile" as const,
        occurredAt:
          event.changed_at,
        actorName:
          actorName(
            modifierById.get(
              event.changed_by_profile_id
            )
          ),
        fieldKey:
          event.field_key,
        previousValue:
          event.previous_value,
        newValue:
          event.new_value,
        documentTitle:
          null,
        eventType:
          null,
      })
    ),

    ...documentEvents.map(
      (event) => ({
        id:
          `document-${event.id}`,
        kind:
          "document" as const,
        occurredAt:
          event.created_at,
        actorName:
          actorName(
            modifierById.get(
              event.actor_profile_id
            )
          ),
        fieldKey:
          null,
        previousValue:
          null,
        newValue:
          null,
        documentTitle:
          documentById.get(
            event.document_id
          )?.title ??
          "Document medical",
        eventType:
          event.event_type,
      })
    ),
  ]
    .sort(
      (left, right) =>
        Date.parse(
          right.occurredAt
        ) -
        Date.parse(
          left.occurredAt
        )
    )
    .slice(0, 100);

  return NextResponse.json(
    {
      isFamilyDoctor: true,
      visits,
      clinicalHistory,
    },
    {
      headers: {
        "Cache-Control":
          "private, no-store, max-age=0",
      },
    }
  );
}
