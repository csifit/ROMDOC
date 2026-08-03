import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  MEDICAL_FOLDER_SHARE_ACCESS_MODES,
  MEDICAL_FOLDER_SHARE_DURATION_SECONDS,
  MEDICAL_FOLDER_TEMPORARY_SHARE_SCOPES,
  getMedicalFolderShareGrantStatus,
  isUuid,
  type MedicalFolderShareApiError,
  type MedicalFolderShareApiErrorCode,
  type MedicalFolderShareGrant,
  type MedicalFolderShareGrantListItem,
  type MedicalFolderShareSelectedDocument,
  validateMedicalFolderShareGrantInput,
} from "@/lib/medical-folder-share-grants";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

type SupabaseServerClient =
  Awaited<ReturnType<typeof createClient>>;

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
  share_grant_id: string;
  document_id: string;
};

type MedicalDocumentRow = {
  id: string;
  title: string;
  document_type: string;
  content_format: string;
  created_at: string;
};

const ERROR_MESSAGES:
  Record<MedicalFolderShareApiErrorCode, string> = {
    authentication_required:
      "Trebuie să fii autentificat.",
    active_patient_account_required:
      "Doar pacienții cu un cont activ și e-mail confirmat pot administra partajarea.",
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

function mapGrantRow(
  row: GrantRow
): MedicalFolderShareGrant {
  return {
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
}

async function loadGrantItems(
  supabase: SupabaseServerClient,
  userId: string,
  grantId?: string
) {
  let grantQuery =
    supabase
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
        "patient_profile_id",
        userId
      )
      .eq(
        "is_permanent",
        false
      );

  if (grantId) {
    grantQuery =
      grantQuery.eq(
        "id",
        grantId
      );
  }

  const {
    data: grantRows,
    error: grantsError,
  } = await grantQuery
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(
      grantId ? 1 : 100
    );

  if (grantsError) {
    throw new Error(
      "share_grant_list_failed"
    );
  }

  const grants =
    (grantRows ?? []) as GrantRow[];

  if (grants.length === 0) {
    return [];
  }

  const grantIds =
    grants.map(
      (grant) => grant.id
    );

  const {
    data: membershipRows,
    error: membershipError,
  } = await supabase
    .from(
      "medical_folder_share_grant_documents"
    )
    .select(`
      share_grant_id,
      document_id
    `)
    .in(
      "share_grant_id",
      grantIds
    );

  if (membershipError) {
    throw new Error(
      "share_grant_list_failed"
    );
  }

  const memberships =
    (membershipRows ?? []) as
      SelectedDocumentRow[];

  const documentIds =
    Array.from(
      new Set(
        memberships.map(
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
      data: documentRows,
      error: documentsError,
    } = await supabase
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

    if (documentsError) {
      throw new Error(
        "share_grant_list_failed"
      );
    }

    for (
      const document of
        (documentRows ?? []) as
          MedicalDocumentRow[]
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

  const selectedDocumentsByGrant =
    new Map<
      string,
      MedicalFolderShareSelectedDocument[]
    >();

  for (
    const membership of memberships
  ) {
    const document =
      documentsById.get(
        membership.document_id
      );

    if (!document) {
      continue;
    }

    const current =
      selectedDocumentsByGrant.get(
        membership.share_grant_id
      ) ?? [];

    current.push(document);

    selectedDocumentsByGrant.set(
      membership.share_grant_id,
      current
    );
  }

  return grants.map(
    (row): MedicalFolderShareGrantListItem => {
      const grant =
        mapGrantRow(row);

      return {
        ...grant,
        status:
          getMedicalFolderShareGrantStatus(
            grant
          ),
        selectedDocuments:
          selectedDocumentsByGrant.get(
            grant.id
          ) ?? [],
      };
    }
  );
}

function databaseErrorCode(
  message: string | undefined
): MedicalFolderShareApiErrorCode {
  switch (message) {
    case "invalid_medical_folder_share_scope":
    case "emergency_summary_requires_permanent_share":
      return "invalid_scope";

    case "invalid_medical_folder_share_duration":
      return "invalid_duration";

    case "invalid_medical_folder_share_access_mode":
      return "invalid_access_mode";

    case "download_permission_must_be_boolean":
    case "downloads_are_not_available_for_this_scope":
      return "downloads_not_available";

    case "selected_documents_are_required":
      return "selected_documents_required";

    case "too_many_selected_documents":
      return "too_many_selected_documents";

    case "document_selection_requires_selected_documents_scope":
      return "documents_not_allowed";

    case "one_or_more_selected_documents_are_unavailable":
      return "selected_document_unavailable";

    case "medical_folder_share_grant_not_found":
      return "share_grant_not_found";

    default:
      return "share_grant_create_failed";
  }
}

export async function GET():
Promise<Response> {
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

  try {
    const grants =
      await loadGrantItems(
        authorization.supabase,
        authorization.userId
      );

    return NextResponse.json({
      grants,
      options: {
        scopes:
          MEDICAL_FOLDER_TEMPORARY_SHARE_SCOPES,
        durations:
          MEDICAL_FOLDER_SHARE_DURATION_SECONDS,
        accessModes:
          MEDICAL_FOLDER_SHARE_ACCESS_MODES,
      },
    });
  } catch {
    return apiError(
      "share_grant_list_failed",
      500
    );
  }
}

export async function POST(
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

  let body: {
    shareScope?: unknown;
    durationSeconds?: unknown;
    accessMode?: unknown;
    allowDocumentDownloads?: unknown;
    documentIds?: unknown;
  };

  try {
    body =
      await request.json();
  } catch {
    return apiError(
      "invalid_request",
      400
    );
  }

  const validation =
    validateMedicalFolderShareGrantInput(
      body
    );

  if (!validation.ok) {
    return apiError(
      validation.error,
      400
    );
  }

  const {
    data: grantId,
    error: createError,
  } = await authorization.supabase
    .rpc(
      "create_own_medical_folder_share_grant",
      {
        target_scope:
          validation.value.shareScope,
        target_duration_seconds:
          validation.value.durationSeconds,
        target_access_mode:
          validation.value.accessMode,
        target_allow_document_downloads:
          validation.value
            .allowDocumentDownloads,
        target_document_ids:
          validation.value.documentIds,
      }
    );

  if (
    createError ||
    !isUuid(grantId)
  ) {
    const code =
      databaseErrorCode(
        createError?.message
      );

    const status =
      code ===
        "selected_document_unavailable"
        ? 409
        : code ===
            "share_grant_create_failed"
          ? 500
          : 400;

    return apiError(
      code,
      status
    );
  }

  try {
    const [grant] =
      await loadGrantItems(
        authorization.supabase,
        authorization.userId,
        grantId
      );

    if (!grant) {
      return apiError(
        "share_grant_not_found",
        404
      );
    }

    return NextResponse.json(
      {
        success: true,
        grant,
      },
      {
        status: 201,
      }
    );
  } catch {
    return apiError(
      "share_grant_create_failed",
      500
    );
  }
}

export async function DELETE(
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

  let body: {
    shareGrantId?: unknown;
  };

  try {
    body =
      await request.json();
  } catch {
    return apiError(
      "invalid_request",
      400
    );
  }

  if (
    !isUuid(
      body.shareGrantId
    )
  ) {
    return apiError(
      "invalid_share_grant_id",
      400
    );
  }

  const shareGrantId =
    body.shareGrantId.trim();

  const {
    data: revoked,
    error: revokeError,
  } = await authorization.supabase
    .rpc(
      "revoke_own_medical_folder_share_grant",
      {
        target_share_grant_id:
          shareGrantId,
      }
    );

  if (revokeError) {
    const code =
      databaseErrorCode(
        revokeError.message
      );

    return apiError(
      code ===
        "share_grant_not_found"
        ? code
        : "share_grant_revoke_failed",
      code ===
        "share_grant_not_found"
        ? 404
        : 500
    );
  }

  try {
    const [grant] =
      await loadGrantItems(
        authorization.supabase,
        authorization.userId,
        shareGrantId
      );

    if (!grant) {
      return apiError(
        "share_grant_not_found",
        404
      );
    }

    return NextResponse.json({
      success: true,
      revoked:
        Boolean(revoked),
      grant,
    });
  } catch {
    return apiError(
      "share_grant_revoke_failed",
      500
    );
  }
}
