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

const URL_TTL_SECONDS = 60;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Trebuie să fii autentificat." },
      { status: 401 }
    );
  }

  let body: {
    documentId?: unknown;
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

  if (!isUuid(documentId)) {
    return NextResponse.json(
      { error: "Documentul nu este valid." },
      { status: 400 }
    );
  }

  const {
    data: allowed,
    error: accessError,
  } = await supabase.rpc(
    "doctor_can_read_medical_document",
    {
      target_document_id:
        documentId,
    }
  );

  if (accessError || !allowed) {
    return NextResponse.json(
      {
        error:
          "Nu ai acces la acest document.",
      },
      { status: 403 }
    );
  }

  const admin = createAdminClient();

  const {
    data: document,
  } = await admin
    .from("patient_medical_documents")
    .select(`
      id,
      patient_profile_id,
      appointment_id,
      content_format,
      storage_bucket,
      storage_path,
      original_file_name
    `)
    .eq("id", documentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (
    !document ||
    document.content_format !==
      "file"
  ) {
    return NextResponse.json(
      {
        error:
          "Documentul nu conține un fișier descărcabil.",
      },
      { status: 409 }
    );
  }

  const {
    data: signed,
    error,
  } = await admin.storage
    .from(document.storage_bucket)
    .createSignedUrl(
      document.storage_path,
      URL_TTL_SECONDS,
      {
        download:
          document.original_file_name ||
          true,
      }
    );

  if (
    error ||
    !signed?.signedUrl
  ) {
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
        document.patient_profile_id,
      appointment_id:
        document.appointment_id,
      event_type:
        "downloaded",
      actor_profile_id:
        user.id,
      actor_role:
        "doctor",
      metadata: {},
    });

  return NextResponse.json(
    {
      signedUrl:
        signed.signedUrl,
      expiresIn:
        URL_TTL_SECONDS,
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}
