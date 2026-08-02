import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getMedicalFolderShareGrantStatus,
  isUuid,
  type MedicalFolderShareApiError,
  type MedicalFolderShareApiErrorCode,
  type MedicalFolderShareAuditEvent,
  type MedicalFolderShareEvent,
  type MedicalFolderShareGrant,
  type MedicalFolderShareGrantListItem,
  type MedicalFolderShareSelectedDocument,
} from "@/lib/medical-folder-share-grants";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

type GrantRow = {
  id: string;
  patient_profile_id: string;
  share_scope:
    MedicalFolderShareGrant["shareScope"];
  access_mode:
    MedicalFolderShareGrant["accessMode"];
  allow_document_downloads: boolean;
  expires_at: string;
  bound_doctor_id: string | null;
  bound_at: string | null;
  access_count: number;
  last_accessed_at: string | null;
  consumed_at: string | null;
  revoked_at: string | null;
  expiration_recorded_at: string | null;
  created_at: string;
  updated_at: string;
};

type SelectedDocumentRow = {
  document_id: string;
};

type DocumentRow = {
  id: string;
  title: string;
  document_type: string;
  content_format: string;
  created_at: string;
};

type EventRow = {
  id: string;
  share_grant_id: string;
  patient_profile_id: string;
  document_id: string | null;
  event_type:
    MedicalFolderShareEvent["eventType"];
  actor_profile_id: string | null;
  actor_doctor_id: string | null;
  actor_role:
    MedicalFolderShareEvent["actorRole"];
  access_channel:
    MedicalFolderShareEvent["accessChannel"];
  metadata: unknown;
  created_at: string;
};

const ERROR_MESSAGES:
  Record<MedicalFolderShareApiErrorCode, string> = {
    authentication_required:
      "Trebuie să fii autentificat.",
    active_patient_account_required:
      "Doar pacienții cu un cont activ și e-mail confirmat pot consulta istoricul partajării.",
    invalid_request:
      "Datele trimise nu sunt valide.",
    invalid_share_grant_id:
      "Partajarea selectată nu este validă.",
    invalid_scope:
      "Tipul informațiilor partajate nu este valid.",
    invalid_duration:
      "Perioada de acces nu este validă.",
    invalid_access_mode:
      "Modul de acces nu este valid.",
    downloads_not_available:
      "Descărcarea documentelor nu este disponibilă pentru această selecție.",
    selected_documents_required:
      "Selectează cel puțin un document.",
    too_many_selected_documents:
      "Pot fi selectate cel mult 50 de documente.",
    documents_not_allowed:
      "Documentele pot fi selectate numai pentru partajarea documentelor alese.",
    invalid_document_id:
      "Unul dintre documentele selectate nu este valid.",
    selected_document_unavailable:
      "Unul sau mai multe documente selectate nu mai sunt disponibile.",
    share_grant_not_found:
      "Partajarea nu a fost găsită.",
    share_grant_create_failed:
      "Partajarea nu a putut fi creată.",
    share_grant_list_failed:
      "Partajările nu au putut fi încărcate.",
    share_grant_revoke_failed:
      "Partajarea nu a putut fi revocată.",
    share_audit_load_failed:
      "Istoricul partajării nu a putut fi încărcat.",
  };

function apiError(
  code: MedicalFolderShareApiErrorCode,
  status: number
) {
  return NextResponse.json<MedicalFolderShareApiError>(
    {
      error: code,
      message: ERROR_MESSAGES[code],
    },
    {
      status,
    }
  );
}

function asMetadata(
  value: unknown
): Record<string, unknown> {
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return value as
      Record<string, unknown>;
  }

  return {};
}

async function requireActivePatient() {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
    error: userError,
  } = await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    return {
      supabase,
      userId: null,
      response: apiError(
        "authentication_required",
        401
      ),
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      role,
      account_status
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !user.email_confirmed_at ||
    profile?.role !== "patient" ||
    profile.account_status !== "active"
  ) {
    return {
      supabase,
      userId: null,
      response: apiError(
        "active_patient_account_required",
        403
      ),
    };
  }

  return {
    supabase,
    userId: user.id,
    response: null,
  };
}

function mapGrant(
  row: GrantRow,
  selectedDocuments:
    MedicalFolderShareSelectedDocument[]
): MedicalFolderShareGrantListItem {
  const grant:
    MedicalFolderShareGrant = {
      id: row.id,
      patientProfileId:
        row.patient_profile_id,
      shareScope:
        row.share_scope,
      accessMode:
        row.access_mode,
      allowDocumentDownloads:
        row.allow_document_downloads,
      expiresAt:
        row.expires_at,
      boundDoctorId:
        row.bound_doctor_id,
      boundAt:
        row.bound_at,
      accessCount:
        row.access_count,
      lastAccessedAt:
        row.last_accessed_at,
      consumedAt:
        row.consumed_at,
      revokedAt:
        row.revoked_at,
      expirationRecordedAt:
        row.expiration_recorded_at,
      createdAt:
        row.created_at,
      updatedAt:
        row.updated_at,
    };

  return {
    ...grant,
    status:
      getMedicalFolderShareGrantStatus(
        grant
      ),
    selectedDocuments,
  };
}

export async function GET(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requireActivePatient();

  if (authorization.response) {
    return authorization.response;
  }

  if (!authorization.userId) {
    return apiError(
      "authentication_required",
      401
    );
  }

  const shareGrantId =
    request.nextUrl.searchParams
      .get("shareGrantId")
      ?.trim() ?? "";

  if (!isUuid(shareGrantId)) {
    return apiError(
      "invalid_share_grant_id",
      400
    );
  }

  const {
    data: grantData,
    error: grantError,
  } = await authorization.supabase
    .from(
      "medical_folder_share_grants"
    )
    .select(`
      id,
      patient_profile_id,
      share_scope,
      access_mode,
      allow_document_downloads,
      expires_at,
      bound_doctor_id,
      bound_at,
      access_count,
      last_accessed_at,
      consumed_at,
      revoked_at,
      expiration_recorded_at,
      created_at,
      updated_at
    `)
    .eq(
      "id",
      shareGrantId
    )
    .eq(
      "patient_profile_id",
      authorization.userId
    )
    .maybeSingle();

  if (
    grantError ||
    !grantData
  ) {
    return apiError(
      grantError
        ? "share_audit_load_failed"
        : "share_grant_not_found",
      grantError ? 500 : 404
    );
  }

  const {
    data: membershipData,
    error: membershipError,
  } = await authorization.supabase
    .from(
      "medical_folder_share_grant_documents"
    )
    .select(`
      document_id
    `)
    .eq(
      "share_grant_id",
      shareGrantId
    );

  if (membershipError) {
    return apiError(
      "share_audit_load_failed",
      500
    );
  }

  const documentIds =
    Array.from(
      new Set(
        (
          (membershipData ?? []) as
            SelectedDocumentRow[]
        ).map(
          (membership) =>
            membership.document_id
        )
      )
    );

  const documentsById =
    new Map<
      string,
      MedicalFolderShareSelectedDocument
    >();

  if (documentIds.length > 0) {
    const {
      data: documentData,
      error: documentError,
    } = await authorization.supabase
      .from(
        "patient_medical_documents"
      )
      .select(`
        id,
        title,
        document_type,
        content_format,
        created_at
      `)
      .in(
        "id",
        documentIds
      )
      .is(
        "deleted_at",
        null
      );

    if (documentError) {
      return apiError(
        "share_audit_load_failed",
        500
      );
    }

    for (
      const document of
        (documentData ?? []) as
          DocumentRow[]
    ) {
      documentsById.set(
        document.id,
        {
          id: document.id,
          title: document.title,
          documentType:
            document.document_type,
          contentFormat:
            document.content_format,
          createdAt:
            document.created_at,
        }
      );
    }
  }

  const selectedDocuments =
    documentIds.flatMap(
      (documentId) => {
        const document =
          documentsById.get(
            documentId
          );

        return document
          ? [document]
          : [];
      }
    );

  const {
    data: eventData,
    error: eventError,
  } = await authorization.supabase
    .from(
      "medical_folder_share_events"
    )
    .select(`
      id,
      share_grant_id,
      patient_profile_id,
      document_id,
      event_type,
      actor_profile_id,
      actor_doctor_id,
      actor_role,
      access_channel,
      metadata,
      created_at
    `)
    .eq(
      "share_grant_id",
      shareGrantId
    )
    .eq(
      "patient_profile_id",
      authorization.userId
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(250);

  if (eventError) {
    return apiError(
      "share_audit_load_failed",
      500
    );
  }

  const eventRows =
    (eventData ?? []) as EventRow[];

  const missingEventDocumentIds =
    Array.from(
      new Set(
        eventRows.flatMap((event) => {
          if (
            !event.document_id ||
            documentsById.has(
              event.document_id
            )
          ) {
            return [];
          }

          return [
            event.document_id,
          ];
        })
      )
    );

  if (
    missingEventDocumentIds.length > 0
  ) {
    const {
      data: eventDocumentData,
      error: eventDocumentError,
    } = await authorization.supabase
      .from(
        "patient_medical_documents"
      )
      .select(`
        id,
        title,
        document_type,
        content_format,
        created_at
      `)
      .in(
        "id",
        missingEventDocumentIds
      );

    if (eventDocumentError) {
      return apiError(
        "share_audit_load_failed",
        500
      );
    }

    for (
      const document of
        (eventDocumentData ?? []) as
          DocumentRow[]
    ) {
      documentsById.set(
        document.id,
        {
          id: document.id,
          title: document.title,
          documentType:
            document.document_type,
          contentFormat:
            document.content_format,
          createdAt:
            document.created_at,
        }
      );
    }
  }

  const events =
    eventRows.map(
      (
        row
      ): MedicalFolderShareAuditEvent => ({
        id: row.id,
        shareGrantId:
          row.share_grant_id,
        patientProfileId:
          row.patient_profile_id,
        documentId:
          row.document_id,
        eventType:
          row.event_type,
        actorProfileId:
          row.actor_profile_id,
        actorDoctorId:
          row.actor_doctor_id,
        actorRole:
          row.actor_role,
        accessChannel:
          row.access_channel,
        metadata:
          asMetadata(
            row.metadata
          ),
        createdAt:
          row.created_at,
        documentTitle:
          row.document_id
            ? documentsById.get(
                row.document_id
              )?.title ?? null
            : null,
      })
    );

  return NextResponse.json({
    grant:
      mapGrant(
        grantData as GrantRow,
        selectedDocuments
      ),
    events,
  });
}
