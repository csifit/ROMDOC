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

const SIGNED_URL_TTL_SECONDS = 60;

type DoctorProfileRelation = {
  first_name: string | null;
  last_name: string | null;
};

type DoctorRelation = {
  id: string;
  slug: string;
  profiles:
    | DoctorProfileRelation
    | DoctorProfileRelation[]
    | null;
};

type AppointmentRelation = {
  id: string;
  scheduled_date: string | null;
  requested_date: string;
};

type PatientDocumentRow = {
  id: string;
  appointment_id: string | null;
  uploaded_by_doctor_id: string;
  document_type: string;
  title: string;
  description: string | null;
  content_format: "file" | "text";
  content_text: string | null;
  storage_bucket: string;
  storage_path: string;
  original_file_name: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
  doctors:
    | DoctorRelation
    | DoctorRelation[]
    | null;
  appointments:
    | AppointmentRelation
    | AppointmentRelation[]
    | null;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function firstRelation<T>(
  value: T | T[] | null
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

async function requirePatient() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError || !user) {
    return {
      user: null,
      response: NextResponse.json(
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
      user: null,
      response: NextResponse.json(
        {
          error:
            "Confirmă adresa de e-mail înainte de a accesa Dosarul medical.",
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
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    profile?.role !== "patient" ||
    profile.account_status !== "active"
  ) {
    return {
      user: null,
      response: NextResponse.json(
        {
          error:
            "Doar pacienții cu un cont activ pot accesa Dosarul medical.",
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

export async function GET(): Promise<Response> {
  const authorization =
    await requirePatient();

  if (authorization.response) {
    return authorization.response;
  }

  const admin =
    createAdminClient();

  const {
    data,
    error,
  } = await admin
    .from("patient_medical_documents")
    .select(`
      id,
      appointment_id,
      uploaded_by_doctor_id,
      document_type,
      title,
      description,
      content_format,
      content_text,
      storage_bucket,
      storage_path,
      original_file_name,
      mime_type,
      file_size_bytes,
      created_at,
      doctors:uploaded_by_doctor_id (
        id,
        slug,
        profiles (
          first_name,
          last_name
        )
      ),
      appointments (
        id,
        scheduled_date,
        requested_date
      )
    `)
    .eq(
      "patient_profile_id",
      authorization.user.id
    )
    .is("deleted_at", null)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Patient medical folder query failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Dosarul medical nu a putut fi încărcat.",
      },
      { status: 500 }
    );
  }

  const documents =
    ((data ?? []) as unknown as PatientDocumentRow[])
      .map((document) => {
        const doctor =
          firstRelation(document.doctors);

        const doctorProfile =
          firstRelation(
            doctor?.profiles ?? null
          );

        const doctorName =
          [
            doctorProfile?.first_name,
            doctorProfile?.last_name,
          ]
            .filter(Boolean)
            .join(" ")
            .trim() ||
          doctor?.slug
            ?.split("-")
            .map(
              (part) =>
                part.charAt(0).toUpperCase() +
                part.slice(1)
            )
            .join(" ") ||
          "Medic";

        const appointment =
          firstRelation(
            document.appointments
          );

        return {
          id: document.id,
          appointmentId:
            document.appointment_id,
          documentType:
            document.document_type,
          title: document.title,
          description:
            document.description,
          contentFormat:
            document.content_format,
          contentText:
            document.content_text,
          originalFileName:
            document.original_file_name,
          mimeType:
            document.mime_type,
          fileSizeBytes:
            document.file_size_bytes,
          createdAt:
            document.created_at,
          doctorName,
          appointmentDate:
            appointment?.scheduled_date ??
            appointment?.requested_date ??
            null,
          canDownload:
            document.content_format ===
              "file",
        };
      });

  return NextResponse.json(
    { documents },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
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
  };

  try {
    body =
      await request.json() as {
        documentId?: unknown;
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
    typeof body.documentId !==
      "string" ||
    !isUuid(body.documentId)
  ) {
    return NextResponse.json(
      {
        error:
          "Documentul selectat nu este valid.",
      },
      { status: 400 }
    );
  }

  const admin =
    createAdminClient();

  const {
    data: document,
    error: documentError,
  } = await admin
    .from("patient_medical_documents")
    .select(`
      id,
      patient_profile_id,
      content_format,
      storage_bucket,
      storage_path,
      original_file_name
    `)
    .eq("id", body.documentId)
    .eq(
      "patient_profile_id",
      authorization.user.id
    )
    .is("deleted_at", null)
    .maybeSingle();

  if (
    documentError ||
    !document
  ) {
    return NextResponse.json(
      {
        error:
          "Documentul nu a fost găsit.",
      },
      { status: 404 }
    );
  }

  if (
    document.content_format !==
      "file" ||
    !document.storage_path
  ) {
    return NextResponse.json(
      {
        error:
          "Acest element nu conține un fișier descărcabil.",
      },
      { status: 409 }
    );
  }

  const {
    data: signedUrlData,
    error: signedUrlError,
  } = await admin.storage
    .from(document.storage_bucket)
    .createSignedUrl(
      document.storage_path,
      SIGNED_URL_TTL_SECONDS,
      {
        download:
          document.original_file_name ||
          true,
      }
    );

  if (
    signedUrlError ||
    !signedUrlData?.signedUrl
  ) {
    console.error(
      "Patient medical document signed URL failed:",
      signedUrlError
    );

    return NextResponse.json(
      {
        error:
          "Linkul securizat nu a putut fi creat.",
      },
      { status: 500 }
    );
  }

  await admin
    .from(
      "patient_medical_document_events"
    )
    .insert({
      document_id:
        document.id,
      patient_profile_id:
        authorization.user.id,
      appointment_id: null,
      event_type:
        "downloaded",
      actor_profile_id:
        authorization.user.id,
      actor_role:
        "patient",
      metadata: {},
    });

  return NextResponse.json(
    {
      signedUrl:
        signedUrlData.signedUrl,
      expiresIn:
        SIGNED_URL_TTL_SECONDS,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
