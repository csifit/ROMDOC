export const MEDICAL_FOLDER_SHARE_SCOPES = [
  "emergency_summary",
  "medical_profile",
  "complete_folder",
  "selected_documents",
] as const;

export type MedicalFolderShareScope =
  (typeof MEDICAL_FOLDER_SHARE_SCOPES)[number];

export const MEDICAL_FOLDER_SHARE_ACCESS_MODES = [
  "one_time",
  "multiple",
] as const;

export type MedicalFolderShareAccessMode =
  (typeof MEDICAL_FOLDER_SHARE_ACCESS_MODES)[number];

export const MEDICAL_FOLDER_SHARE_DURATION_SECONDS = [
  600,
  3_600,
  86_400,
  604_800,
] as const;

export type MedicalFolderShareDurationSeconds =
  (typeof MEDICAL_FOLDER_SHARE_DURATION_SECONDS)[number];

export const MEDICAL_FOLDER_SHARE_EVENT_TYPES = [
  "created",
  "token_issued",
  "token_rotated",
  "recipient_session_started",
  "recipient_session_closed",
  "bound_to_doctor",
  "qr_scanned",
  "link_opened",
  "folder_viewed",
  "document_viewed",
  "document_downloaded",
  "email_sent",
  "revoked",
  "expired",
  "consumed",
  "access_denied",
  "pin_failed",
] as const;

export type MedicalFolderShareEventType =
  (typeof MEDICAL_FOLDER_SHARE_EVENT_TYPES)[number];

export const MEDICAL_FOLDER_SHARE_ACTOR_ROLES = [
  "patient",
  "doctor",
  "staff",
  "system",
  "anonymous",
  "external_provider",
] as const;

export type MedicalFolderShareActorRole =
  (typeof MEDICAL_FOLDER_SHARE_ACTOR_ROLES)[number];

export const MEDICAL_FOLDER_SHARE_CHANNELS = [
  "patient_dashboard",
  "secure_link",
  "qr",
  "email",
  "nfc",
  "doctor_mobile",
  "system",
] as const;

export type MedicalFolderShareChannel =
  (typeof MEDICAL_FOLDER_SHARE_CHANNELS)[number];

export const MEDICAL_FOLDER_RECIPIENT_CHANNELS = [
  "secure_link",
  "qr",
  "email",
  "nfc",
  "doctor_mobile",
] as const;

export type MedicalFolderRecipientChannel =
  (typeof MEDICAL_FOLDER_RECIPIENT_CHANNELS)[number];

export const MEDICAL_FOLDER_RECIPIENT_TYPES = [
  "anonymous",
  "doctor",
  "external_provider",
] as const;

export type MedicalFolderRecipientType =
  (typeof MEDICAL_FOLDER_RECIPIENT_TYPES)[number];

export const MEDICAL_FOLDER_SHARE_TOKEN_PREFIX =
  "rdsh_" as const;

export const MEDICAL_FOLDER_RECIPIENT_SESSION_PREFIX =
  "rdsess_" as const;

export const MEDICAL_FOLDER_RECIPIENT_SESSION_TTL_SECONDS =
  15 * 60;

export type MedicalFolderShareGrantStatus =
  | "active"
  | "revoked"
  | "expired"
  | "consumed";

export type MedicalFolderShareGrant = {
  id: string;
  patientProfileId: string;
  shareScope: MedicalFolderShareScope;
  accessMode: MedicalFolderShareAccessMode;
  allowDocumentDownloads: boolean;
  expiresAt: string;
  boundDoctorId: string | null;
  boundAt: string | null;
  accessCount: number;
  lastAccessedAt: string | null;
  consumedAt: string | null;
  revokedAt: string | null;
  expirationRecordedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MedicalFolderShareEvent = {
  id: string;
  shareGrantId: string;
  patientProfileId: string;
  documentId: string | null;
  eventType: MedicalFolderShareEventType;
  actorProfileId: string | null;
  actorDoctorId: string | null;
  actorRole: MedicalFolderShareActorRole;
  accessChannel: MedicalFolderShareChannel;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type MedicalFolderShareSelectedDocument = {
  id: string;
  title: string;
  documentType: string;
  contentFormat: string;
  createdAt: string;
};

export type MedicalFolderShareGrantListItem =
  MedicalFolderShareGrant & {
    status: MedicalFolderShareGrantStatus;
    selectedDocuments:
      MedicalFolderShareSelectedDocument[];
  };

export type MedicalFolderShareAuditEvent =
  MedicalFolderShareEvent & {
    documentTitle: string | null;
  };

export type MedicalFolderShareTokenMetadata = {
  id: string;
  shareGrantId: string;
  tokenHint: string;
  issuedByProfileId: string | null;
  issuedAt: string;
  exchangeCount: number;
  lastExchangedAt: string | null;
  invalidatedAt: string | null;
  invalidationReason:
    | "rotated"
    | "grant_revoked"
    | "grant_expired"
    | "grant_consumed"
    | "manual"
    | null;
  updatedAt: string;
};

export type IssuedMedicalFolderShareToken = {
  shareToken: string;
  tokenHint: string;
  issuedAt: string;
};

export type MedicalFolderRecipientSessionMetadata = {
  id: string;
  shareGrantId: string;
  shareTokenId: string;
  sessionHint: string;
  recipientType: MedicalFolderRecipientType;
  actorProfileId: string | null;
  actorDoctorId: string | null;
  accessChannel: MedicalFolderRecipientChannel;
  startedAt: string;
  expiresAt: string;
  lastSeenAt: string;
  closedAt: string | null;
  closeReason:
    | "expired"
    | "grant_revoked"
    | "manual"
    | null;
  updatedAt: string;
};

export type BegunMedicalFolderRecipientSession = {
  recipientSessionToken: string;
  sessionExpiresAt: string;
  shareGrantId: string;
  shareScope: MedicalFolderShareScope;
  accessMode: MedicalFolderShareAccessMode;
  allowDocumentDownloads: boolean;
  recipientType: MedicalFolderRecipientType;
};

export type MedicalFolderRecipientAccessContext = {
  recipientSessionId: string;
  shareGrantId: string;
  patientProfileId: string;
  shareScope: MedicalFolderShareScope;
  accessMode: MedicalFolderShareAccessMode;
  allowDocumentDownloads: boolean;
  recipientType: MedicalFolderRecipientType;
  actorProfileId: string | null;
  actorDoctorId: string | null;
  accessChannel: MedicalFolderRecipientChannel;
  sessionExpiresAt: string;
  selectedDocumentIds: string[];
};

export type MedicalFolderRecipientAccessErrorCode =
  | "invalid_share_token"
  | "share_grant_revoked"
  | "share_grant_expired"
  | "share_grant_consumed"
  | "share_requires_bound_doctor"
  | "share_bound_to_another_doctor"
  | "invalid_recipient_identity"
  | "invalid_recipient_channel"
  | "invalid_recipient_session"
  | "recipient_session_expired"
  | "share_scope_excludes_documents"
  | "document_not_shared"
  | "document_not_available"
  | "document_download_not_allowed";

export type CreateMedicalFolderShareGrantInput = {
  shareScope: MedicalFolderShareScope;
  durationSeconds: MedicalFolderShareDurationSeconds;
  accessMode: MedicalFolderShareAccessMode;
  allowDocumentDownloads: boolean;
  documentIds: string[];
};

export type MedicalFolderShareValidationResult =
  | {
      ok: true;
      value: CreateMedicalFolderShareGrantInput;
    }
  | {
      ok: false;
      error:
        | "invalid_scope"
        | "invalid_duration"
        | "invalid_access_mode"
        | "downloads_not_available"
        | "selected_documents_required"
        | "too_many_selected_documents"
        | "documents_not_allowed"
        | "invalid_document_id";
    };

export type MedicalFolderShareApiErrorCode =
  | "authentication_required"
  | "active_patient_account_required"
  | "invalid_request"
  | "invalid_share_grant_id"
  | "invalid_scope"
  | "invalid_duration"
  | "invalid_access_mode"
  | "downloads_not_available"
  | "selected_documents_required"
  | "too_many_selected_documents"
  | "documents_not_allowed"
  | "invalid_document_id"
  | "selected_document_unavailable"
  | "share_grant_not_found"
  | "share_grant_create_failed"
  | "share_grant_list_failed"
  | "share_grant_revoke_failed"
  | "share_audit_load_failed";

export type MedicalFolderShareApiError = {
  error: MedicalFolderShareApiErrorCode;
  message: string;
};

export type MedicalFolderShareGrantListResponse = {
  grants: MedicalFolderShareGrantListItem[];
  options: {
    scopes: readonly MedicalFolderShareScope[];
    durations:
      readonly MedicalFolderShareDurationSeconds[];
    accessModes:
      readonly MedicalFolderShareAccessMode[];
  };
};

export type MedicalFolderShareGrantMutationResponse = {
  success: true;
  grant: MedicalFolderShareGrantListItem;
  revoked?: boolean;
};

export type MedicalFolderShareAuditResponse = {
  grant: MedicalFolderShareGrantListItem;
  events: MedicalFolderShareAuditEvent[];
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SHARE_TOKEN_PATTERN =
  /^rdsh_[a-f0-9]{64}$/;

const RECIPIENT_SESSION_TOKEN_PATTERN =
  /^rdsess_[a-f0-9]{64}$/;

export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    UUID_PATTERN.test(value.trim())
  );
}

export function isMedicalFolderShareToken(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    SHARE_TOKEN_PATTERN.test(value)
  );
}

export function isMedicalFolderRecipientSessionToken(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    RECIPIENT_SESSION_TOKEN_PATTERN.test(value)
  );
}

export function medicalFolderShareTokenHint(
  value: string
) {
  return isMedicalFolderShareToken(value)
    ? value.slice(0, 13)
    : null;
}

export function medicalFolderRecipientSessionHint(
  value: string
) {
  return isMedicalFolderRecipientSessionToken(value)
    ? value.slice(0, 15)
    : null;
}

export function isMedicalFolderShareScope(
  value: unknown
): value is MedicalFolderShareScope {
  return (
    typeof value === "string" &&
    MEDICAL_FOLDER_SHARE_SCOPES.some(
      (scope) => scope === value
    )
  );
}

export function isMedicalFolderShareAccessMode(
  value: unknown
): value is MedicalFolderShareAccessMode {
  return (
    typeof value === "string" &&
    MEDICAL_FOLDER_SHARE_ACCESS_MODES.some(
      (mode) => mode === value
    )
  );
}

export function isMedicalFolderShareDurationSeconds(
  value: unknown
): value is MedicalFolderShareDurationSeconds {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    MEDICAL_FOLDER_SHARE_DURATION_SECONDS.some(
      (duration) => duration === value
    )
  );
}

export function isMedicalFolderShareEventType(
  value: unknown
): value is MedicalFolderShareEventType {
  return (
    typeof value === "string" &&
    MEDICAL_FOLDER_SHARE_EVENT_TYPES.some(
      (eventType) => eventType === value
    )
  );
}

export function isMedicalFolderRecipientChannel(
  value: unknown
): value is MedicalFolderRecipientChannel {
  return (
    typeof value === "string" &&
    MEDICAL_FOLDER_RECIPIENT_CHANNELS.some(
      (channel) => channel === value
    )
  );
}

export function isEmergencySummaryShare(
  scope: MedicalFolderShareScope
) {
  return scope === "emergency_summary";
}

export function shareScopeContainsDocuments(
  scope: MedicalFolderShareScope
) {
  return (
    scope === "complete_folder" ||
    scope === "selected_documents"
  );
}

export function getMedicalFolderShareGrantStatus(
  grant: Pick<
    MedicalFolderShareGrant,
    "revokedAt" | "consumedAt" | "expiresAt"
  >,
  now = new Date()
): MedicalFolderShareGrantStatus {
  if (grant.revokedAt) {
    return "revoked";
  }

  if (grant.consumedAt) {
    return "consumed";
  }

  const expirationTime =
    new Date(grant.expiresAt).getTime();

  if (
    Number.isNaN(expirationTime) ||
    expirationTime <= now.getTime()
  ) {
    return "expired";
  }

  return "active";
}

export function validateMedicalFolderShareGrantInput(
  input: {
    shareScope?: unknown;
    durationSeconds?: unknown;
    accessMode?: unknown;
    allowDocumentDownloads?: unknown;
    documentIds?: unknown;
  }
): MedicalFolderShareValidationResult {
  if (!isMedicalFolderShareScope(input.shareScope)) {
    return {
      ok: false,
      error: "invalid_scope",
    };
  }

  if (
    !isMedicalFolderShareDurationSeconds(
      input.durationSeconds
    )
  ) {
    return {
      ok: false,
      error: "invalid_duration",
    };
  }

  if (
    !isMedicalFolderShareAccessMode(input.accessMode)
  ) {
    return {
      ok: false,
      error: "invalid_access_mode",
    };
  }

  if (
    typeof input.allowDocumentDownloads !== "boolean"
  ) {
    return {
      ok: false,
      error: "downloads_not_available",
    };
  }

  if (
    input.allowDocumentDownloads &&
    !shareScopeContainsDocuments(input.shareScope)
  ) {
    return {
      ok: false,
      error: "downloads_not_available",
    };
  }

  const suppliedDocumentIds =
    Array.isArray(input.documentIds)
      ? input.documentIds
      : [];

  const documentIds = Array.from(
    new Set(
      suppliedDocumentIds.flatMap((value) => {
        if (typeof value !== "string") {
          return [];
        }

        const normalizedValue = value.trim();

        return normalizedValue
          ? [normalizedValue]
          : [];
      })
    )
  );

  if (
    documentIds.some(
      (documentId) =>
        !UUID_PATTERN.test(documentId)
    )
  ) {
    return {
      ok: false,
      error: "invalid_document_id",
    };
  }

  if (
    input.shareScope === "selected_documents" &&
    documentIds.length === 0
  ) {
    return {
      ok: false,
      error: "selected_documents_required",
    };
  }

  if (documentIds.length > 50) {
    return {
      ok: false,
      error: "too_many_selected_documents",
    };
  }

  if (
    input.shareScope !== "selected_documents" &&
    documentIds.length > 0
  ) {
    return {
      ok: false,
      error: "documents_not_allowed",
    };
  }

  return {
    ok: true,
    value: {
      shareScope: input.shareScope,
      durationSeconds: input.durationSeconds,
      accessMode: input.accessMode,
      allowDocumentDownloads:
        input.allowDocumentDownloads,
      documentIds,
    },
  };
}

export function defaultMedicalFolderShareGrantInput():
  CreateMedicalFolderShareGrantInput {
  return {
    shareScope: "emergency_summary",
    durationSeconds: 86_400,
    accessMode: "multiple",
    allowDocumentDownloads: false,
    documentIds: [],
  };
}
