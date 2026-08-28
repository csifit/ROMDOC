import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";
export const runtime = "nodejs";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function doctorDisplayName({
  publicName,
  slug,
}: {
  publicName:
    | string
    | null
    | undefined;
  slug: string;
}) {
  const normalized =
    publicName?.trim();

  if (normalized) {
    return normalized;
  }

  return slug
    .split("-")
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

async function requirePatient() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Trebuie să fii autentificat." },
        { status: 401 }
      ),
    };
  }

  const {
    data: profile,
  } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !user.email_confirmed_at ||
    profile?.role !== "patient" ||
    profile.account_status !== "active"
  ) {
    return {
      user: null,
      response: NextResponse.json(
        {
          error:
            "Doar pacienții cu un cont activ și e-mail confirmat pot administra partajarea.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    user,
    response: null,
  };
}

async function patientOwnsDocument(
  patientId: string,
  documentId: string
) {
  const admin = createAdminClient();

  const {
    data,
  } = await admin
    .from("patient_medical_documents")
    .select("id, uploaded_by_doctor_id")
    .eq("id", documentId)
    .eq("patient_profile_id", patientId)
    .is("deleted_at", null)
    .maybeSingle();

  return data;
}

export async function GET(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requirePatient();

  if (authorization.response) {
    return authorization.response;
  }

  const documentId =
    request.nextUrl.searchParams
      .get("documentId")
      ?.trim() ?? "";

  if (!isUuid(documentId)) {
    return NextResponse.json(
      { error: "Documentul nu este valid." },
      { status: 400 }
    );
  }

  const document =
    await patientOwnsDocument(
      authorization.user.id,
      documentId
    );

  if (!document) {
    return NextResponse.json(
      { error: "Documentul nu a fost găsit." },
      { status: 404 }
    );
  }

  const admin = createAdminClient();

  const {
    data: appointments,
    error: appointmentError,
  } = await admin
    .from("appointments")
    .select(`
      doctor_id,
      doctors (
        id,
        slug,
        public_name,
        status
      )
    `)
    .eq(
      "patient_profile_id",
      authorization.user.id
    )
    .in("status", [
      "confirmed",
      "rescheduled",
      "completed",
    ]);

  if (appointmentError) {
    return NextResponse.json(
      {
        error:
          "Lista medicilor nu a putut fi încărcată.",
      },
      { status: 500 }
    );
  }

  const doctorMap =
    new Map<string, {
      id: string;
      name: string;
    }>();

  for (const appointment of appointments ?? []) {
    const relation = Array.isArray(
      appointment.doctors
    )
      ? appointment.doctors[0]
      : appointment.doctors;

    if (
      relation?.status === "active"
    ) {
      doctorMap.set(
        relation.id,
        {
          id: relation.id,
          name:
            doctorDisplayName({
              publicName:
                relation.public_name,
              slug:
                relation.slug,
            }),
        }
      );
    }
  }

  const {
    data: shares,
    error: sharesError,
  } = await admin
    .from(
      "patient_medical_document_shares"
    )
    .select(`
      id,
      doctor_id,
      expires_at,
      revoked_at,
      created_at
    `)
    .eq("document_id", documentId)
    .eq(
      "patient_profile_id",
      authorization.user.id
    )
    .order("created_at", {
      ascending: false,
    });

  if (sharesError) {
    return NextResponse.json(
      {
        error:
          "Partajările nu au putut fi încărcate.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    doctors:
      Array.from(doctorMap.values()),
    shares:
      (shares ?? []).map(
        (share) => ({
          ...share,
          doctor_name:
            doctorMap.get(
              share.doctor_id
            )?.name ??
            "Medic",
          active:
            !share.revoked_at &&
            (
              !share.expires_at ||
              new Date(
                share.expires_at
              ).getTime() >
                Date.now()
            ),
        })
      ),
    uploaderDoctorId:
      document.uploaded_by_doctor_id,
  });
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requirePatient();

  if (authorization.response) {
    return authorization.response;
  }
  let body: {
    documentId?: unknown;
    doctorId?: unknown;
    expiresAt?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Datele trimise nu sunt valide." },
      { status: 400 }
    );
  }

  const documentId =
    typeof body.documentId === "string"
      ? body.documentId.trim()
      : "";

  const doctorId =
    typeof body.doctorId === "string"
      ? body.doctorId.trim()
      : "";

  const expiresAt =
    typeof body.expiresAt === "string" &&
    body.expiresAt.trim()
      ? body.expiresAt.trim()
      : null;

  if (
    !isUuid(documentId) ||
    !isUuid(doctorId)
  ) {
    return NextResponse.json(
      {
        error:
          "Documentul sau medicul selectat nu este valid.",
      },
      { status: 400 }
    );
  }

  const document =
    await patientOwnsDocument(
      authorization.user.id,
      documentId
    );

  if (!document) {
    return NextResponse.json(
      { error: "Documentul nu a fost găsit." },
      { status: 404 }
    );
  }

  if (
    doctorId ===
    document.uploaded_by_doctor_id
  ) {
    return NextResponse.json(
      {
        error:
          "Medicul care a încărcat documentul are deja acces.",
      },
      { status: 409 }
    );
  }

  let parsedExpiry: string | null =
    null;

  if (expiresAt) {
    const date =
      new Date(expiresAt);

    const maximum =
      Date.now() +
      365 * 24 * 60 * 60 * 1000;

    if (
      Number.isNaN(
        date.getTime()
      ) ||
      date.getTime() <= Date.now() ||
      date.getTime() > maximum
    ) {
      return NextResponse.json(
        {
          error:
            "Data expirării trebuie să fie în următoarele 365 de zile.",
        },
        { status: 400 }
      );
    }

    parsedExpiry =
      date.toISOString();
  }

  const admin = createAdminClient();

  const {
    data: eligibleAppointment,
  } = await admin
    .from("appointments")
    .select("id")
    .eq(
      "patient_profile_id",
      authorization.user.id
    )
    .eq("doctor_id", doctorId)
    .in("status", [
      "confirmed",
      "rescheduled",
      "completed",
    ])
    .limit(1)
    .maybeSingle();

  if (!eligibleAppointment) {
    return NextResponse.json(
      {
        error:
          "Poți partaja documentul numai cu un medic asociat unei consultații din contul tău.",
      },
      { status: 403 }
    );
  }

  const {
    data: doctor,
  } = await admin
    .from("doctors")
    .select(
      "id, slug, public_name, status"
    )
    .eq("id", doctorId)
    .eq("status", "active")
    .maybeSingle();

  if (!doctor) {
    return NextResponse.json(
      {
        error:
          "Medicul selectat nu este disponibil.",
      },
      { status: 404 }
    );
  }

  const now =
    new Date().toISOString();

  const {
    data: share,
    error: shareError,
  } = await admin
    .from(
      "patient_medical_document_shares"
    )
    .upsert(
      {
        document_id: documentId,
        patient_profile_id:
          authorization.user.id,
        doctor_id: doctorId,
        granted_by_profile_id:
          authorization.user.id,
        expires_at: parsedExpiry,
        revoked_at: null,
        revoked_by_profile_id:
          null,
        updated_at: now,
      },
      {
        onConflict:
          "document_id,doctor_id",
      }
    )
    .select(`
      id,
      doctor_id,
      expires_at,
      created_at
    `)
    .single();

  if (shareError) {
    console.error(
      "Medical document share failed:",
      shareError
    );

    return NextResponse.json(
      {
        error:
          "Documentul nu a putut fi partajat.",
      },
      { status: 500 }
    );
  }

  await admin
    .from(
      "patient_medical_document_events"
    )
    .insert({
      document_id: documentId,
      patient_profile_id:
        authorization.user.id,
      appointment_id: null,
      event_type: "shared",
      actor_profile_id:
        authorization.user.id,
      actor_role: "patient",
      metadata: {
        share_id: share.id,
        doctor_id: doctorId,
        doctor_name:
          doctorDisplayName({
            publicName:
              doctor.public_name,
            slug:
              doctor.slug,
          }),
        expires_at:
          parsedExpiry,
      },
    });

  return NextResponse.json({
    success: true,
    share,
  });
}

export async function DELETE(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requirePatient();

  if (authorization.response) {
    return authorization.response;
  }
  let body: {
    shareId?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Datele trimise nu sunt valide." },
      { status: 400 }
    );
  }

  const shareId =
    typeof body.shareId === "string"
      ? body.shareId.trim()
      : "";

  if (!isUuid(shareId)) {
    return NextResponse.json(
      { error: "Partajarea nu este validă." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const {
    data: share,
  } = await admin
    .from(
      "patient_medical_document_shares"
    )
    .select(`
      id,
      document_id,
      doctor_id,
      revoked_at,
      doctors (
        slug,
        public_name
      )
    `)
    .eq("id", shareId)
    .eq(
      "patient_profile_id",
      authorization.user.id
    )
    .maybeSingle();

  if (!share) {
    return NextResponse.json(
      { error: "Partajarea nu a fost găsită." },
      { status: 404 }
    );
  }

  if (share.revoked_at) {
    return NextResponse.json({
      success: true,
    });
  }

  const revokedAt =
    new Date().toISOString();

  const {
    error,
  } = await admin
    .from(
      "patient_medical_document_shares"
    )
    .update({
      revoked_at: revokedAt,
      revoked_by_profile_id:
        authorization.user.id,
      updated_at: revokedAt,
    })
    .eq("id", shareId);

  if (error) {
    return NextResponse.json(
      {
        error:
          "Partajarea nu a putut fi revocată.",
      },
      { status: 500 }
    );
  }

  const doctorRelation =
    Array.isArray(share.doctors)
      ? share.doctors[0]
      : share.doctors;

  await admin
    .from(
      "patient_medical_document_events"
    )
    .insert({
      document_id:
        share.document_id,
      patient_profile_id:
        authorization.user.id,
      appointment_id: null,
      event_type:
        "share_revoked",
      actor_profile_id:
        authorization.user.id,
      actor_role: "patient",
      metadata: {
        share_id: share.id,
        doctor_id:
          share.doctor_id,
        doctor_name:
          doctorRelation?.slug
            ? doctorDisplayName({
                publicName:
                  doctorRelation.public_name,
                slug:
                  doctorRelation.slug,
              })
            : "Medic",
      },
    });

  return NextResponse.json({
    success: true,
  });
}
