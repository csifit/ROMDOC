import {
  createHash,
  randomUUID,
} from "node:crypto";

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
import {
  consumeRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
} from "@/lib/security/upload-policy";

export const runtime = "nodejs";

const BUCKET_NAME =
  "patient-medical-folder";

const allowedMimeTypes =
  ALLOWED_DOCUMENT_MIME_TYPES;

const allowedDocumentTypes =
  new Set([
    "consultation_note",
    "prescription",
    "laboratory_result",
    "imaging_result",
    "referral",
    "medical_certificate",
    "discharge_summary",
    "other",
  ]);

function normalizeString(
  value:
    FormDataEntryValue | null
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function getExtension(
  file: File
) {
  switch (file.type) {
    case "application/pdf":
      return "pdf";

    case "image/jpeg":
      return "jpg";

    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    default:
      return "bin";
  }
}

export async function GET(
  request: NextRequest
): Promise<Response> {
  const result =
    await requireActiveStaffMedicalFolderAccess();

  if (result.response) {
    return result.response;
  }

  const appointmentId =
    request.nextUrl.searchParams
      .get("appointmentId")
      ?.trim() ?? "";

  if (!isUuid(appointmentId)) {
    return NextResponse.json(
      {
        error:
          "Programarea nu este validă.",
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
          "Nu ai acces la Dosarul medical pentru această programare.",
      },
      { status: 403 }
    );
  }

  const admin =
    createAdminClient();

  const {
    data: activeShares,
    error: shareError,
  } = await admin
    .from(
      "patient_medical_document_shares"
    )
    .select("document_id")
    .eq(
      "doctor_id",
      appointment.doctor_id
    )
    .is("revoked_at", null)
    .or(
      `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`
    );

  if (shareError) {
    return NextResponse.json(
      {
        error:
          "Partajările nu au putut fi verificate.",
      },
      { status: 500 }
    );
  }

  const sharedDocumentIds =
    (activeShares ?? []).map(
      (share) =>
        share.document_id
    );

  let documentQuery = admin
    .from(
      "patient_medical_documents"
    )
    .select(`
      id,
      document_type,
      title,
      description,
      content_format,
      content_text,
      original_file_name,
      mime_type,
      file_size_bytes,
      created_at,
      uploaded_by_doctor_id
    `)
    .eq(
      "patient_profile_id",
      appointment.patient_profile_id
    )
    .is("deleted_at", null);

  if (
    sharedDocumentIds.length > 0
  ) {
    documentQuery =
      documentQuery.or(
        `uploaded_by_doctor_id.eq.${appointment.doctor_id},id.in.(${sharedDocumentIds.join(
          ","
        )})`
      );
  } else {
    documentQuery =
      documentQuery.eq(
        "uploaded_by_doctor_id",
        appointment.doctor_id
      );
  }

  const {
    data,
    error,
  } =
    await documentQuery.order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (error) {
    console.error(
      "Staff medical-folder query failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Documentele nu au putut fi încărcate.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    documents:
      (data ?? []).map(
        (document) => ({
          ...document,
          can_delete:
            document.uploaded_by_doctor_id ===
            appointment.doctor_id,
        })
      ),
  });
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  const result =
    await requireActiveStaffMedicalFolderAccess();

  if (result.response) {
    return result.response;
  }

  const rateLimit =
    await consumeRateLimit({
      namespace:
        "staff-medical-folder-upload",
      identifier:
        result.authorization.userId,
      limit: 30,
      windowSeconds:
        60 * 60,
    });

  if (!rateLimit.allowed) {
    return rateLimitResponse(
      rateLimit
    );
  }

  let formData: FormData;

  try {
    formData =
      await request.formData();
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
    normalizeString(
      formData.get("appointmentId")
    );

  const documentType =
    normalizeString(
      formData.get("documentType")
    );

  const title =
    normalizeString(
      formData.get("title")
    );

  const description =
    normalizeString(
      formData.get("description")
    );

  const contentText =
    normalizeString(
      formData.get("contentText")
    );

  const fileValue =
    formData.get("file");

  if (
    !isUuid(appointmentId) ||
    !allowedDocumentTypes.has(
      documentType
    ) ||
    title.length < 2 ||
    title.length > 250 ||
    description.length > 5000
  ) {
    return NextResponse.json(
      {
        error:
          "Completează corect datele documentului.",
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
          "Nu ai permisiunea de a adăuga documente pentru această programare.",
      },
      { status: 403 }
    );
  }

  const hasFile =
    fileValue instanceof File &&
    fileValue.size > 0;

  const hasText =
    contentText.length > 0;

  if (hasFile === hasText) {
    return NextResponse.json(
      {
        error:
          "Trimite fie un fișier, fie o notă medicală text.",
      },
      { status: 400 }
    );
  }

  if (
    hasText &&
    (
      documentType !==
        "consultation_note" ||
      contentText.length > 20000
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Nota medicală nu este validă.",
      },
      { status: 400 }
    );
  }

  const admin =
    createAdminClient();

  const documentId =
    randomUUID();

  if (hasText) {
    const {
      data,
      error,
    } = await admin
      .from(
        "patient_medical_documents"
      )
      .insert({
        id: documentId,
        patient_profile_id:
          appointment.patient_profile_id,
        appointment_id:
          appointment.id,
        uploaded_by_profile_id:
          result.authorization.userId,
        uploaded_by_doctor_id:
          appointment.doctor_id,
        document_type:
          "consultation_note",
        title,
        description:
          description || null,
        storage_bucket:
          BUCKET_NAME,
        storage_path: "",
        original_file_name: "",
        mime_type: "text/plain",
        file_size_bytes: 0,
        checksum_sha256: null,
        content_format: "text",
        content_text:
          contentText,
      })
      .select(`
        id,
        document_type,
        title,
        description,
        content_format,
        content_text,
        created_at
      `)
      .single();

    if (error) {
      console.error(
        "Staff medical note insert failed:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Nota medicală nu a putut fi salvată.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        document: data,
      },
      { status: 201 }
    );
  }

  const file =
    fileValue as File;

  if (
    !allowedMimeTypes.has(
      file.type
    ) ||
    file.size <= 0 ||
    file.size > MAX_UPLOAD_BYTES
  ) {
    return NextResponse.json(
      {
        error:
          `Sunt acceptate fișiere PDF, JPEG, PNG sau WebP de maximum ${MAX_UPLOAD_LABEL}.`,
      },
      { status: 400 }
    );
  }

  const buffer =
    Buffer.from(
      await file.arrayBuffer()
    );

  const checksum =
    createHash("sha256")
      .update(buffer)
      .digest("hex");

  const generatedName =
    `${randomUUID()}.${getExtension(
      file
    )}`;

  const storagePath =
    `${appointment.patient_profile_id}/${documentId}/${generatedName}`;

  const {
    error: uploadError,
  } = await admin.storage
    .from(BUCKET_NAME)
    .upload(
      storagePath,
      buffer,
      {
        contentType:
          file.type,
        upsert: false,
      }
    );

  if (uploadError) {
    console.error(
      "Staff medical upload failed:",
      uploadError
    );

    return NextResponse.json(
      {
        error:
          "Fișierul nu a putut fi încărcat.",
      },
      { status: 500 }
    );
  }

  const {
    data,
    error: metadataError,
  } = await admin
    .from(
      "patient_medical_documents"
    )
    .insert({
      id: documentId,
      patient_profile_id:
        appointment.patient_profile_id,
      appointment_id:
        appointment.id,
      uploaded_by_profile_id:
        result.authorization.userId,
      uploaded_by_doctor_id:
        appointment.doctor_id,
      document_type:
        documentType,
      title,
      description:
        description || null,
      storage_bucket:
        BUCKET_NAME,
      storage_path:
        storagePath,
      original_file_name:
        file.name.slice(0, 255),
      mime_type:
        file.type,
      file_size_bytes:
        file.size,
      checksum_sha256:
        checksum,
      content_format: "file",
      content_text: null,
    })
    .select(`
      id,
      document_type,
      title,
      description,
      content_format,
      original_file_name,
      mime_type,
      file_size_bytes,
      created_at
    `)
    .single();

  if (metadataError) {
    await admin.storage
      .from(BUCKET_NAME)
      .remove([storagePath]);

    console.error(
      "Staff medical metadata insert failed:",
      metadataError
    );

    return NextResponse.json(
      {
        error:
          "Fișierul a fost încărcat, dar nu a putut fi înregistrat.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      document: data,
    },
    { status: 201 }
  );
}

export async function DELETE(
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

  const canRead =
    await staffCanReadMedicalDocument(
      documentId,
      appointment
    );

  if (!canRead) {
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
    error,
  } = await admin
    .from(
      "patient_medical_documents"
    )
    .select(`
      id,
      patient_profile_id,
      appointment_id,
      uploaded_by_doctor_id,
      content_format,
      storage_bucket,
      storage_path
    `)
    .eq("id", documentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (
    error ||
    !medicalDocument
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
    medicalDocument.patient_profile_id !==
      appointment.patient_profile_id ||
    medicalDocument.uploaded_by_doctor_id !==
      appointment.doctor_id
  ) {
    return NextResponse.json(
      {
        error:
          "Personalul poate șterge numai documentele medicului pentru care are atribuirea activă.",
      },
      { status: 403 }
    );
  }

  const deletedAt =
    new Date().toISOString();

  const {
    error: softDeleteError,
  } = await admin
    .from(
      "patient_medical_documents"
    )
    .update({
      deleted_at:
        deletedAt,
      deleted_by_profile_id:
        result.authorization.userId,
    })
    .eq(
      "id",
      medicalDocument.id
    )
    .is("deleted_at", null);

  if (softDeleteError) {
    return NextResponse.json(
      {
        error:
          "Documentul nu a putut fi șters.",
      },
      { status: 500 }
    );
  }

  if (
    medicalDocument.content_format ===
      "file" &&
    medicalDocument.storage_path
  ) {
    const {
      error: removalError,
    } = await admin.storage
      .from(
        medicalDocument.storage_bucket
      )
      .remove([
        medicalDocument.storage_path,
      ]);

    if (removalError) {
      console.error(
        "Staff medical Storage removal failed:",
        removalError
      );

      await admin
        .from(
          "patient_medical_documents"
        )
        .update({
          storage_cleanup_attempted_at:
            new Date().toISOString(),
          storage_removal_error:
            removalError.message.slice(
              0,
              2000
            ),
        })
        .eq(
          "id",
          medicalDocument.id
        );
    } else {
      const removedAt =
        new Date().toISOString();

      await admin
        .from(
          "patient_medical_documents"
        )
        .update({
          storage_removed_at:
            removedAt,
          storage_cleanup_attempted_at:
            removedAt,
          storage_removal_error:
            null,
        })
        .eq(
          "id",
          medicalDocument.id
        );

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
            "storage_removed",
          actor_profile_id:
            result.authorization.userId,
          actor_role:
            "staff",
          metadata: {},
        });
    }
  }

  return NextResponse.json({
    success: true,
  });
}
