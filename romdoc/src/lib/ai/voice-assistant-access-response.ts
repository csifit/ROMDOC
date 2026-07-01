export type VoiceAccessOperationalState =
  | "admin_testing"
  | "limited_rollout"
  | "active";

export type VoiceAccessRole =
  | "patient"
  | "doctor"
  | "staff"
  | "admin"
  | "manager";

export type VoiceAccessCapabilities = {
  voiceSearch: boolean;
  appointmentDraft: boolean;
  appointmentConfirmation:
    boolean;
};

export type VoiceAccessLimits = {
  maximumSessionMinutes:
    number;
  maximumSessionsPerUserPerDay:
    number;
  maximumPlatformMinutesPerDay:
    number;
  automaticPauseAfterDailyLimit:
    boolean;
};

export type VoiceAccessSuccess = {
  available: true;
  operationalState:
    VoiceAccessOperationalState;
  role:
    VoiceAccessRole;
  capabilities:
    VoiceAccessCapabilities;
  limits:
    VoiceAccessLimits;
  configurationUpdatedAt:
    string;
};

function isRecord(
  value: unknown
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isBoolean(
  value: unknown
): value is boolean {
  return typeof value ===
    "boolean";
}

function isPositiveInteger(
  value: unknown
): value is number {
  return (
    typeof value ===
      "number" &&
    Number.isInteger(value) &&
    value > 0
  );
}

function isOperationalState(
  value: unknown
): value is
  VoiceAccessOperationalState {
  return (
    value ===
      "admin_testing" ||
    value ===
      "limited_rollout" ||
    value ===
      "active"
  );
}

function isRole(
  value: unknown
): value is
  VoiceAccessRole {
  return (
    value ===
      "patient" ||
    value ===
      "doctor" ||
    value ===
      "staff" ||
    value ===
      "admin" ||
    value ===
      "manager"
  );
}

export function
isVoiceAccessSuccess(
  value: unknown
): value is
  VoiceAccessSuccess {
  if (
    !isRecord(value) ||
    value.available !==
      true ||
    !isOperationalState(
      value.operationalState
    ) ||
    !isRole(
      value.role
    ) ||
    !isRecord(
      value.capabilities
    ) ||
    !isRecord(
      value.limits
    ) ||
    typeof value
      .configurationUpdatedAt !==
      "string"
  ) {
    return false;
  }

  return (
    isBoolean(
      value.capabilities
        .voiceSearch
    ) &&
    isBoolean(
      value.capabilities
        .appointmentDraft
    ) &&
    isBoolean(
      value.capabilities
        .appointmentConfirmation
    ) &&
    isPositiveInteger(
      value.limits
        .maximumSessionMinutes
    ) &&
    isPositiveInteger(
      value.limits
        .maximumSessionsPerUserPerDay
    ) &&
    isPositiveInteger(
      value.limits
        .maximumPlatformMinutesPerDay
    ) &&
    isBoolean(
      value.limits
        .automaticPauseAfterDailyLimit
    )
  );
}

export function
hasEnabledVoiceCapability(
  capabilities:
    VoiceAccessCapabilities
) {
  return (
    capabilities
      .voiceSearch ||
    capabilities
      .appointmentDraft ||
    capabilities
      .appointmentConfirmation
  );
}
