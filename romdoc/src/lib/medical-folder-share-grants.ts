export const MEDICAL_FOLDER_SHARE_SCOPES = [
  "emergency_summary",
  "medical_profile",
  "complete_folder",
  "selected_documents",
] as const;

export type MedicalFolderShareScope =
  (typeof MEDICAL_FOLDER_SHARE_SCOPES)[number];

export const MEDICAL_FOLDER_TEMPORARY_SHARE_SCOPES = [
  "medical_profile",
  "complete_folder",
  "selected_documents",
] as const;

export type MedicalFolderTemporaryShareScope =
  (typeof MEDICAL_FOLDER_TEMPORARY_SHARE_SCOPES)[number];

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
  "deactivated",
  "reactivated",
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

export const MEDICAL_FOLDER_DIRECT_SHARE_CHANNELS = [
  "secure_link",
  "qr",
  "email",
  "nfc",
] as const;

export type MedicalFolderDirectShareChannel =
  (typeof MEDICAL_FOLDER_DIRECT_SHARE_CHANNELS)[number];

export const MEDICAL_FOLDER_SHARE_TOKEN_PREFIX =
  "rdsh_" as const;

export const PERMANENT_EMERGENCY_SHARE_TOKEN_PREFIX =
  "rdem_" as const;

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

export type MedicalFolderShareTokenIssueResponse = {
  success: true;
  shareToken: string;
  tokenHint: string;
  issuedAt: string;
};

export type SharedMedicalDocument = {
  id: string;
  documentType: string;
  title: string;
  description: string | null;
  contentFormat: "file" | "text";
  contentText: string | null;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  createdAt: string;
  doctorName: string;
  appointmentDate: string | null;
  downloadUrl: string | null;
};

export type DirectMedicalFolderShareResponse = {
  shareGrantId: string;
  shareScope: MedicalFolderShareScope;
  accessMode: MedicalFolderShareAccessMode;
  allowDocumentDownloads: boolean;
  expiresAt: string | null;
  isPermanent: boolean;
  patient: {
    profileId: string;
    firstName: string | null;
    lastName: string | null;
    legalName: string;
  };
  entries: import("@/lib/patient-medical-profile").MedicalProfileEntry[];
  documents: SharedMedicalDocument[];
};

export type DirectMedicalFolderShareErrorCode =
  | "invalid_share_token"
  | "invalid_channel"
  | "share_grant_not_found"
  | "share_grant_revoked"
  | "share_grant_expired"
  | "share_grant_consumed"
  | "share_disabled"
  | "share_open_failed";

export type DirectMedicalFolderShareError = {
  error: DirectMedicalFolderShareErrorCode;
  message: string;
};


export type PermanentEmergencyShareStatus =
  | "active"
  | "disabled";

export type PermanentEmergencyShareCredential = {
  grantId: string;
  status: PermanentEmergencyShareStatus;
  shareToken: string;
  tokenHint: string;
  shareUrl: string;
  qrUrl: string;
  accessCount: number;
  lastAccessedAt: string | null;
  createdAt: string;
  disabledAt: string | null;
};

export type PermanentEmergencyShareResponse = {
  credential: PermanentEmergencyShareCredential | null;
};

export type PermanentEmergencyShareAction =
  | "activate"
  | "replace"
  | "deactivate"
  | "reactivate";

export type PermanentEmergencyShareApiError = {
  error: string;
  message: string;
};

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

const PERMANENT_EMERGENCY_SHARE_TOKEN_PATTERN =
  /^rdem_[a-f0-9]{32}_[a-f0-9]{64}$/;


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

export function isPermanentEmergencyShareToken(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    PERMANENT_EMERGENCY_SHARE_TOKEN_PATTERN.test(value)
  );
}

export function isAnyMedicalFolderShareToken(
  value: unknown
): value is string {
  return (
    isMedicalFolderShareToken(value) ||
    isPermanentEmergencyShareToken(value)
  );
}

export function permanentEmergencyShareTokenHint(
  value: string
) {
  return isPermanentEmergencyShareToken(value)
    ? value.slice(0, 13)
    : null;
}

export function medicalFolderShareTokenHint(
  value: string
) {
  return isMedicalFolderShareToken(value)
    ? value.slice(0, 13)
    : null;
}


export function isMedicalFolderTemporaryShareScope(
  value: unknown
): value is MedicalFolderTemporaryShareScope {
  return (
    typeof value === "string" &&
    MEDICAL_FOLDER_TEMPORARY_SHARE_SCOPES.some(
      (scope) => scope === value
    )
  );
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

export function isMedicalFolderDirectShareChannel(
  value: unknown
): value is MedicalFolderDirectShareChannel {
  return (
    typeof value === "string" &&
    MEDICAL_FOLDER_DIRECT_SHARE_CHANNELS.some(
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
  if (!isMedicalFolderTemporaryShareScope(input.shareScope)) {
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
    shareScope: "medical_profile",
    durationSeconds: 86_400,
    accessMode: "multiple",
    allowDocumentDownloads: false,
    documentIds: [],
  };
}
