import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isAnyMedicalFolderShareToken,
  isMedicalFolderDirectShareChannel,
  isMedicalFolderShareScope,
  isPermanentEmergencyShareToken,
  type DirectMedicalFolderShareErrorCode,
  type DirectMedicalFolderShareResponse,
  type MedicalFolderDirectShareChannel,
  type MedicalFolderShareScope,
  type SharedMedicalDocument,
} from "@/lib/medical-folder-share-grants";
import {
  verifyPermanentEmergencyShareToken,
} from "@/lib/medical-folder/permanent-emergency-share-token";
import {
  MEDICAL_PROFILE_FIELDS,
  emptyMedicalProfileValue,
  type MedicalProfileEntry,
  type MedicalProfileFieldKey,
} from "@/lib/patient-medical-profile";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";

const SIGNED_URL_TTL_SECONDS =
  10 * 60;

const EMERGENCY_FIELD_KEYS =
  new Set<MedicalProfileFieldKey>([
    "date_of_birth",
    "sex",
    "blood_group",
    "medical_alerts",
    "allergies",
    "current_medications",
    "chronic_conditions",
    "implants_and_medical_devices",
    "emergency_contact",
    "family_doctor",
    "organ_donation_preference",
  ]);

type OpenShareRow = {
  share_grant_id: string;
  patient_profile_id: string;
  share_scope: string;
  access_mode: string;
  allow_document_downloads: boolean;
  expires_at: string | null;
  token_hint: string;
  is_permanent?: boolean;
  selected_document_ids:
    string[] |
    null;
};

type MedicalProfileRow = {
  field_key:
    MedicalProfileFieldKey;
  value:
    Record<string, string> |
    null;
};

type DoctorProfileRelation = {
  first_name:
    string |
    null;
  last_name:
    string |
    null;
};

type DoctorRelation = {
  slug:
    string;
  profiles:
    DoctorProfileRelation |
    DoctorProfileRelation[] |
    null;
};

type AppointmentRelation = {
  scheduled_date:
    string |
    null;
  requested_date:
    string;
};

type ShareEventInsert = {
  share_grant_id: string;
  patient_profile_id: string;
  document_id: string | null;
  event_type:
    | "folder_viewed"
    | "document_viewed"
    | "document_downloaded";
  actor_profile_id: null;
  actor_doctor_id: null;
  actor_role: "anonymous";
  access_channel:
    MedicalFolderDirectShareChannel;
  metadata:
    Record<string, unknown>;
};

type DocumentRow = {
  id: string;
  document_type: string;
  title: string;
  description:
    string |
    null;
  content_format:
    "file" |
    "text";
  content_text:
    string |
    null;
  storage_bucket:
    string;
  storage_path:
    string;
  original_file_name:
    string;
  mime_type:
    string;
  file_size_bytes:
    number;
  created_at:
    string;
  doctors:
    DoctorRelation |
    DoctorRelation[] |
    null;
  appointments:
    AppointmentRelation |
    AppointmentRelation[] |
    null;
};

function noStoreHeaders() {
  return {
    "Cache-Control":
      "private, no-store, max-age=0",
    Pragma:
      "no-cache",
    "Referrer-Policy":
      "no-referrer",
    "X-Content-Type-Options":
      "nosniff",
  };
}

function errorResponse(
  error:
    DirectMedicalFolderShareErrorCode,
  message:
    string,
  status:
    number
) {
  return NextResponse.json(
    {
      error,
      message,
    },
    {
      status,
      headers:
        noStoreHeaders(),
    }
  );
}

function mapDatabaseError(
  message:
    string
): {
  error:
    DirectMedicalFolderShareErrorCode;
  message:
    string;
  status:
    number;
} {
  if (
    message.includes(
      "medical_folder_share_grant_revoked"
    )
  ) {
    return {
      error:
        "share_grant_revoked",
      message:
        "Partajarea a fost revocată de pacient.",
      status:
        410,
    };
  }

  if (
    message.includes(
      "medical_folder_share_grant_expired"
    )
  ) {
    return {
      error:
        "share_grant_expired",
      message:
        "Partajarea a expirat.",
      status:
        410,
    };
  }

  if (
    message.includes(
      "medical_folder_share_grant_consumed"
    )
  ) {
    return {
      error:
        "share_grant_consumed",
      message:
        "Linkul cu o singură utilizare a fost deja deschis.",
      status:
        410,
    };
  }

  if (
    message.includes(
      "permanent_emergency_share_disabled"
    )
  ) {
    return {
      error:
        "share_disabled",
      message:
        "Pacientul a dezactivat temporar codul QR de urgență.",
      status:
        410,
    };
  }

  if (
    message.includes(
      "permanent_emergency_share_not_found"
    )
  ) {
    return {
      error:
        "share_grant_not_found",
      message:
        "Codul QR permanent de urgență nu a fost găsit.",
      status:
        404,
    };
  }

  if (
    message.includes(
      "medical_folder_share_grant_not_found"
    )
  ) {
    return {
      error:
        "share_grant_not_found",
      message:
        "Partajarea nu a fost găsită.",
      status:
        404,
    };
  }

  return {
    error:
      "invalid_share_token",
    message:
      "Linkul securizat nu este valid.",
    status:
      403,
  };
}

function firstRelation<T>(
  value:
    T |
    T[] |
    null
) {
  return Array.isArray(
    value
  )
    ? value[0] ??
        null
    : value;
}

function legalName(
  firstName:
    string |
    null,
  lastName:
    string |
    null
) {
  return [
    firstName,
    lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function doctorName(
  relation:
    DoctorRelation |
    DoctorRelation[] |
    null
) {
  const doctor =
    firstRelation(
      relation
    );

  const profile =
    firstRelation(
      doctor?.profiles ??
        null
    );

  const name =
    legalName(
      profile?.first_name ??
        null,
      profile?.last_name ??
        null
    );

  if (name) {
    return `Dr. ${name}`;
  }

  return (
    doctor?.slug
      ?.split("-")
      .filter(Boolean)
      .map(
        (part) =>
          part
            .charAt(0)
            .toUpperCase() +
          part.slice(1)
      )
      .join(" ") ||
    "Medic"
  );
}

function fieldsForScope(
  scope:
    MedicalFolderShareScope
) {
  if (
    scope ===
      "selected_documents"
  ) {
    return [];
  }

  if (
    scope ===
      "emergency_summary"
  ) {
    return MEDICAL_PROFILE_FIELDS
      .filter(
        (field) =>
          EMERGENCY_FIELD_KEYS
            .has(
              field.key
            )
      );
  }

  return [
    ...MEDICAL_PROFILE_FIELDS,
  ];
}

async function loadEntries(
  patientProfileId:
    string,
  scope:
    MedicalFolderShareScope
): Promise<
  MedicalProfileEntry[]
> {
  const fields =
    fieldsForScope(
      scope
    );

  if (
    fields.length === 0
  ) {
    return [];
  }

  const admin =
    createAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        "patient_medical_profile_entries"
      )
      .select(`
        field_key,
        value
      `)
      .eq(
        "patient_profile_id",
        patientProfileId
      );

  if (error) {
    throw new Error(
      "medical_profile_load_failed"
    );
  }

  const rows =
    (
      data ??
      []
    ) as
      MedicalProfileRow[];

  const byKey =
    new Map<
      MedicalProfileFieldKey,
      MedicalProfileRow
    >(
      rows.map(
        (row) => [
          row.field_key,
          row,
        ]
      )
    );

  return fields.map(
    (
      field
    ): MedicalProfileEntry => ({
      fieldKey:
        field.key,
      value:
        byKey.get(
          field.key
        )?.value ??
        emptyMedicalProfileValue(
          field.key
        ),
      lastModifiedByName:
        null,
      lastModifiedByRole:
        null,
      lastModifiedAt:
        null,
    })
  );
}

async function loadDocuments(
  patientProfileId:
    string,
  scope:
    MedicalFolderShareScope,
  selectedDocumentIds:
    string[],
  allowDownloads:
    boolean
): Promise<
  SharedMedicalDocument[]
> {
  if (
    scope !==
      "complete_folder" &&
    scope !==
      "selected_documents"
  ) {
    return [];
  }

  if (
    scope ===
      "selected_documents" &&
    selectedDocumentIds
      .length === 0
  ) {
    return [];
  }

  const admin =
    createAdminClient();

  let query =
    admin
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
        storage_bucket,
        storage_path,
        original_file_name,
        mime_type,
        file_size_bytes,
        created_at,
        doctors:uploaded_by_doctor_id (
          slug,
          profiles!doctors_profile_id_fkey (
            first_name,
            last_name
          )
        ),
        appointments (
          scheduled_date,
          requested_date
        )
      `)
      .eq(
        "patient_profile_id",
        patientProfileId
      )
      .is(
        "deleted_at",
        null
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );

  if (
    scope ===
      "selected_documents"
  ) {
    query =
      query.in(
        "id",
        selectedDocumentIds
      );
  }

  const {
    data,
    error,
  } =
    await query;

  if (error) {
    throw new Error(
      "medical_documents_load_failed"
    );
  }

  const rows =
    (
      data ??
      []
    ) as unknown as
      DocumentRow[];

  return Promise.all(
    rows.map(
      async (
        document
      ): Promise<
        SharedMedicalDocument
      > => {
        const appointment =
          firstRelation(
            document.appointments
          );

        let downloadUrl:
          string |
          null =
            null;

        if (
          allowDownloads &&
          document.content_format ===
            "file" &&
          document.storage_path
        ) {
          const {
            data:
              signedUrl,
          } =
            await admin
              .storage
              .from(
                document.storage_bucket
              )
              .createSignedUrl(
                document.storage_path,
                SIGNED_URL_TTL_SECONDS,
                {
                  download:
                    document.original_file_name ||
                    true,
                }
              );

          downloadUrl =
            signedUrl
              ?.signedUrl ??
            null;
        }

        return {
          id:
            document.id,
          documentType:
            document.document_type,
          title:
            document.title,
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
          doctorName:
            doctorName(
              document.doctors
            ),
          appointmentDate:
            appointment
              ?.scheduled_date ??
            appointment
              ?.requested_date ??
            null,
          downloadUrl,
        };
      }
    )
  );
}

export async function POST(
  request:
    NextRequest
): Promise<Response> {
  let body: {
    token?:
      unknown;
    channel?:
      unknown;
  };

  try {
    body =
      await request.json() as {
        token?:
          unknown;
        channel?:
          unknown;
      };
  } catch {
    return errorResponse(
      "invalid_share_token",
      "Linkul securizat nu este valid.",
      400
    );
  }

  if (
    !isAnyMedicalFolderShareToken(
      body.token
    )
  ) {
    return errorResponse(
      "invalid_share_token",
      "Linkul securizat nu este valid.",
      400
    );
  }

  const channel:
    MedicalFolderDirectShareChannel =
      body.channel ===
        undefined
        ? "secure_link"
        : isMedicalFolderDirectShareChannel(
              body.channel
            )
          ? body.channel
          : "secure_link";

  const admin =
    createAdminClient();

  let rpcData:
    unknown;
  let rpcError:
    { message: string } |
    null =
      null;

  if (
    isPermanentEmergencyShareToken(
      body.token
    )
  ) {
    let verified:
      ReturnType<
        typeof verifyPermanentEmergencyShareToken
      >;

    try {
      verified =
        verifyPermanentEmergencyShareToken(
          body.token
        );
    } catch {
      return errorResponse(
        "share_open_failed",
        "Serviciul pentru codul QR permanent nu este configurat.",
        503
      );
    }

    if (!verified) {
      return errorResponse(
        "invalid_share_token",
        "Linkul securizat nu este valid.",
        403
      );
    }

    const result =
      await admin.rpc(
        "open_permanent_emergency_share_grant",
        {
          target_share_grant_id:
            verified.grantId,
          target_channel:
            channel,
        }
      );

    rpcData =
      result.data;
    rpcError =
      result.error;
  } else {
    const result =
      await admin.rpc(
        "open_medical_folder_share_token",
        {
          target_share_token:
            body.token,
          target_channel:
            channel,
        }
      );

    rpcData =
      result.data;
    rpcError =
      result.error;
  }

  if (rpcError) {
    const mapped =
      mapDatabaseError(
        rpcError.message
      );

    return errorResponse(
      mapped.error,
      mapped.message,
      mapped.status
    );
  }

  const opened =
    (
      Array.isArray(
        rpcData
      )
        ? rpcData[0]
        : rpcData
    ) as
      OpenShareRow |
      null;

  if (
    !opened ||
    !isMedicalFolderShareScope(
      opened.share_scope
    )
  ) {
    return errorResponse(
      "share_open_failed",
      "Informațiile partajate nu au putut fi încărcate.",
      500
    );
  }

  const {
    data:
      patient,
    error:
      patientError,
  } =
    await admin
      .from(
        "profiles"
      )
      .select(`
        id,
        first_name,
        last_name
      `)
      .eq(
        "id",
        opened.patient_profile_id
      )
      .eq(
        "role",
        "patient"
      )
      .maybeSingle();

  if (
    patientError ||
    !patient
  ) {
    return errorResponse(
      "share_open_failed",
      "Informațiile partajate nu au putut fi încărcate.",
      500
    );
  }

  try {
    const [
      entries,
      documents,
    ] =
      await Promise.all([
        loadEntries(
          opened.patient_profile_id,
          opened.share_scope
        ),
        loadDocuments(
          opened.patient_profile_id,
          opened.share_scope,
          opened.selected_document_ids ??
            [],
          opened.allow_document_downloads
        ),
      ]);

    const accessEvents:
      ShareEventInsert[] = [
      {
        share_grant_id:
          opened.share_grant_id,
        patient_profile_id:
          opened.patient_profile_id,
        document_id:
          null,
        event_type:
          "folder_viewed",
        actor_profile_id:
          null,
        actor_doctor_id:
          null,
        actor_role:
          "anonymous",
        access_channel:
          channel,
        metadata: {
          token_hint:
            opened.token_hint,
          direct_access:
            true,
        },
      },
      ...documents.flatMap(
        (
          document
        ) => {
          const events:
            ShareEventInsert[] = [
            {
              share_grant_id:
                opened.share_grant_id,
              patient_profile_id:
                opened.patient_profile_id,
              document_id:
                document.id,
              event_type:
                "document_viewed",
              actor_profile_id:
                null,
              actor_doctor_id:
                null,
              actor_role:
                "anonymous",
              access_channel:
                channel,
              metadata: {
                token_hint:
                  opened.token_hint,
                direct_access:
                  true,
              },
            },
          ];

          if (
            document.downloadUrl
          ) {
            events.push({
              share_grant_id:
                opened.share_grant_id,
              patient_profile_id:
                opened.patient_profile_id,
              document_id:
                document.id,
              event_type:
                "document_downloaded",
              actor_profile_id:
                null,
              actor_doctor_id:
                null,
              actor_role:
                "anonymous",
              access_channel:
                channel,
              metadata: {
                token_hint:
                  opened.token_hint,
                direct_access:
                  true,
                signed_url_issued:
                  true,
                expires_in_seconds:
                  SIGNED_URL_TTL_SECONDS,
              },
            });
          }

          return events;
        }
      ),
    ];

    const {
      error:
        accessEventError,
    } =
      await admin
        .from(
          "medical_folder_share_events"
        )
        .insert(
          accessEvents
        );

    if (
      accessEventError
    ) {
      console.error(
        "Shared Medical Folder access audit failed:",
        accessEventError
      );
    }

    const response:
      DirectMedicalFolderShareResponse = {
        shareGrantId:
          opened.share_grant_id,
        shareScope:
          opened.share_scope,
        accessMode:
          opened.access_mode ===
            "one_time"
            ? "one_time"
            : "multiple",
        allowDocumentDownloads:
          opened.allow_document_downloads,
        expiresAt:
          opened.expires_at,
        isPermanent:
          opened.is_permanent ===
            true,
        patient: {
          profileId:
            patient.id,
          firstName:
            patient.first_name,
          lastName:
            patient.last_name,
          legalName:
            legalName(
              patient.first_name,
              patient.last_name
            ),
        },
        entries,
        documents,
      };

    return NextResponse.json(
      response,
      {
        headers:
          noStoreHeaders(),
      }
    );
  } catch {
    return errorResponse(
      "share_open_failed",
      "Informațiile partajate nu au putut fi încărcate.",
      500
    );
  }
}
