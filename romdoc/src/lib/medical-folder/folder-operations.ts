import {
  createHash,
  randomUUID,
} from "node:crypto";

import {
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
} from "@/lib/security/upload-policy";

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

const readableStatuses =
  new Set([
    "confirmed",
    "rescheduled",
    "completed",
  ]);

const writableStatuses =
  new Set([
    "confirmed",
    "rescheduled",
  ]);

export type MedicalFolderAppointment = {
  id: string;
  doctor_id: string;
  patient_profile_id: string;
  status: string;
};

type ActorRole =
  | "doctor"
  | "staff";

type DeletePolicy =
  | "own-profile"
  | "doctor-wide";

type MedicalFolderActor = {
  actorProfileId: string;
  actorRole: ActorRole;
  doctorId: string;
};

function normalizeString(
  value:
    FormDataEntryValue | null
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

export function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function canReadMedicalFolder(
  status: string
) {
  return readableStatuses.has(
    status
  );
}

export function canWriteMedicalFolder(
  status: string
) {
  return writableStatuses.has(
    status
  );
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

export async function listMedicalFolderDocuments(
  appointment:
    MedicalFolderAppointment,
  actor: MedicalFolderActor,
  deletePolicy: DeletePolicy
): Promise<Response> {
  if (
    !canReadMedicalFolder(
      appointment.status
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Dosarul medical nu este disponibil pentru această programare.",
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
      uploaded_by_doctor_id,
      uploaded_by_profile_id
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
      "Medical-folder document query failed:",
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

  const writable =
    canWriteMedicalFolder(
      appointment.status
    );

  return NextResponse.json({
    documents:
      (data ?? []).map(
        (document) => {
          const {
            uploaded_by_profile_id,
            ...visibleDocument
          } = document;

          return {
            ...visibleDocument,
            can_delete:
              writable &&
              document.uploaded_by_doctor_id ===
                actor.doctorId &&
              (deletePolicy ===
                "doctor-wide" ||
                uploaded_by_profile_id ===
                  actor.actorProfileId),
          };
        }
      ),
  });
}

export async function createMedicalFolderDocument(
  formData: FormData,
  appointment:
    MedicalFolderAppointment,
  actor: MedicalFolderActor
): Promise<Response> {
  if (
    !canWriteMedicalFolder(
      appointment.status
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Programarea este finalizată. Nu mai pot fi adăugate note sau documente noi.",
      },
      { status: 409 }
    );
  }

  const documentType =
    normalizeString(
      formData.get(
        "documentType"
      )
    );

  const title =
    normalizeString(
      formData.get("title")
    );

  const description =
    normalizeString(
      formData.get(
        "description"
      )
    );

  const contentText =
    normalizeString(
      formData.get(
        "contentText"
      )
    );

  const fileValue =
    formData.get("file");

  if (
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
          actor.actorProfileId,
        uploaded_by_doctor_id:
          actor.doctorId,
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
        "Medical note insert failed:",
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
      "Medical document upload failed:",
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
        actor.actorProfileId,
      uploaded_by_doctor_id:
        actor.doctorId,
      document_type:
        documentType,
      title,
      description:
        description || null,
      storage_bucket:
        BUCKET_NAME,
      storage_path: storagePath,
      original_file_name:
        file.name.slice(
          0,
          255
        ),
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
      .remove([
        storagePath,
      ]);

    console.error(
      "Medical document metadata insert failed:",
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

export async function deleteMedicalFolderDocument(
  documentId: string,
  appointment:
    MedicalFolderAppointment,
  actor: MedicalFolderActor,
  deletePolicy: DeletePolicy
): Promise<Response> {
  if (
    !canWriteMedicalFolder(
      appointment.status
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Programarea este finalizată. Documentele existente nu mai pot fi șterse.",
      },
      { status: 409 }
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
      uploaded_by_profile_id,
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

  const belongsToPatient =
    medicalDocument.patient_profile_id ===
    appointment.patient_profile_id;

  const belongsToDoctor =
    medicalDocument.uploaded_by_doctor_id ===
    actor.doctorId;

  const actorCanDelete =
    deletePolicy ===
      "doctor-wide"
      ? belongsToDoctor
      : belongsToDoctor &&
        medicalDocument.uploaded_by_profile_id ===
          actor.actorProfileId;

  if (
    !belongsToPatient ||
    !actorCanDelete
  ) {
    return NextResponse.json(
      {
        error:
          deletePolicy ===
          "doctor-wide"
            ? "Nu ai permisiunea de a șterge acest document."
            : "Doar medicul care a încărcat documentul îl poate șterge.",
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
        actor.actorProfileId,
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
        "Medical Storage removal failed after soft deletion:",
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
            actor.actorProfileId,
          actor_role:
            actor.actorRole,
          metadata: {},
        });
    }
  }

  return NextResponse.json({
    success: true,
  });
}
