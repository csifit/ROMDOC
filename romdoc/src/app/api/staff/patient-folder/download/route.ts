import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isUuid,
  loadStaffMedicalFolderAppointment,
  requireActiveStaffMedicalFolderAccess,
  staffCanReadMedicalDocument,
} from "@/lib/medical-folder/staff-access";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";

const URL_TTL_SECONDS = 60;

export async function POST(
  request: NextRequest
): Promise<Response> {
  const result =
    await requireActiveStaffMedicalFolderAccess();

  if (result.response) {
    return result.response;
  }

  let body: {
    documentId?: unknown;
    appointmentId?: unknown;
  };

  try {
    body =
      await request.json() as {
        documentId?: unknown;
        appointmentId?: unknown;
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

  const documentId =
    typeof body.documentId ===
      "string"
      ? body.documentId.trim()
      : "";

  const appointmentId =
    typeof body.appointmentId ===
      "string"
      ? body.appointmentId.trim()
      : "";

  if (
    !isUuid(documentId) ||
    !isUuid(appointmentId)
  ) {
    return NextResponse.json(
      {
        error:
          "Documentul sau programarea nu este validă.",
      },
      { status: 400 }
    );
  }

  const appointment =
    await loadStaffMedicalFolderAppointment(
      appointmentId,
      result.authorization
    );

  if (!appointment) {
    return NextResponse.json(
      {
        error:
          "Nu ai acces la această programare.",
      },
      { status: 403 }
    );
  }

  const allowed =
    await staffCanReadMedicalDocument(
      documentId,
      appointment
    );

  if (!allowed) {
    return NextResponse.json(
      {
        error:
          "Nu ai acces la acest document.",
      },
      { status: 403 }
    );
  }

  const admin =
    createAdminClient();

  const {
    data: medicalDocument,
    error: documentError,
  } = await admin
    .from(
      "patient_medical_documents"
    )
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
    documentError ||
    !medicalDocument ||
    medicalDocument.content_format !==
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
    .from(
      medicalDocument.storage_bucket
    )
    .createSignedUrl(
      medicalDocument.storage_path,
      URL_TTL_SECONDS,
      {
        download:
          medicalDocument.original_file_name ||
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
        medicalDocument.id,
      patient_profile_id:
        medicalDocument.patient_profile_id,
      appointment_id:
        medicalDocument.appointment_id,
      event_type:
        "downloaded",
      actor_profile_id:
        result.authorization.userId,
      actor_role:
        "staff",
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
