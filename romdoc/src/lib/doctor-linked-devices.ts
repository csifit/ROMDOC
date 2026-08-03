export const DOCTOR_DEVICE_LIMIT = 3;
export const DOCTOR_DEVICE_PAIRING_SECONDS = 120;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PAIRING_TOKEN_PATTERN =
  /^rdpair_[A-Za-z0-9_-]{43}$/;

const DEVICE_CREDENTIAL_PATTERN =
  /^rddv_[A-Za-z0-9_-]{43}$/;

export type DoctorLinkedDeviceStatus =
  | "active"
  | "revoked";

export type DoctorLinkedDeviceListItem = {
  id: string;
  deviceName: string;
  credentialHint: string;
  userAgentSummary: string | null;
  status: DoctorLinkedDeviceStatus;
  linkedAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export type DoctorLinkedDeviceListResponse = {
  devices: DoctorLinkedDeviceListItem[];
  activeDeviceCount: number;
  maximumActiveDevices: number;
};

export type DoctorDevicePairingResponse = {
  success: true;
  pairingUrl: string;
  tokenHint: string;
  expiresAt: string;
};

export type DoctorDevicePairingCompletionResponse = {
  success: true;
  device: DoctorLinkedDeviceListItem;
};

export type DoctorDeviceMutationResponse = {
  success: true;
  deviceId: string;
};

export type DoctorDeviceBulkMutationResponse = {
  success: true;
  revokedCount: number;
};

export type DoctorDeviceApiError = {
  error: string;
  message: string;
};

export type DoctorMobileDeviceResponse = {
  linked: true;
  device: {
    id: string;
    name: string;
    credentialHint: string;
    linkedAt: string;
    lastUsedAt: string;
  };
  doctor: {
    id: string;
    profileId: string;
    slug: string;
    name: string;
  };
};

export function isUuid(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    UUID_PATTERN.test(value.trim())
  );
}

export function isDoctorDevicePairingToken(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    PAIRING_TOKEN_PATTERN.test(value.trim())
  );
}

export function isDoctorDeviceCredential(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    DEVICE_CREDENTIAL_PATTERN.test(value.trim())
  );
}

export function normalizeDoctorDeviceName(
  value: unknown
) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .replace(/\s+/g, " ")
    .trim();

  if (
    normalized.length < 2 ||
    normalized.length > 80
  ) {
    return null;
  }

  return normalized;
}
