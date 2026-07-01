export const VOICE_ASSISTANT_FEATURE_KEY =
  "voice_appointment_assistant";

export type VoiceAssistantOperationalState =
  | "standby"
  | "admin_testing"
  | "limited_rollout"
  | "active";

export type VoiceAssistantAllowedRole =
  | "patient"
  | "doctor"
  | "staff"
  | "admin"
  | "manager";

export type VoiceAssistantSettings = {
  provider: string;
  voiceSearchEnabled: boolean;
  appointmentDraftEnabled:
    boolean;
  appointmentConfirmationEnabled:
    boolean;
  maximumSessionMinutes:
    number;
  maximumSessionsPerUserPerDay:
    number;
  maximumPlatformMinutesPerDay:
    number;
  automaticPauseAfterDailyLimit:
    boolean;
};

const operationalStates:
  VoiceAssistantOperationalState[] =
  [
    "standby",
    "admin_testing",
    "limited_rollout",
    "active",
  ];

const allowedRoles:
  VoiceAssistantAllowedRole[] =
  [
    "patient",
    "doctor",
    "staff",
    "admin",
    "manager",
  ];

const defaultSettings:
  VoiceAssistantSettings = {
    provider:
      "openai",
    voiceSearchEnabled:
      false,
    appointmentDraftEnabled:
      false,
    appointmentConfirmationEnabled:
      false,
    maximumSessionMinutes:
      5,
    maximumSessionsPerUserPerDay:
      3,
    maximumPlatformMinutesPerDay:
      300,
    automaticPauseAfterDailyLimit:
      true,
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

function booleanValue(
  value: unknown,
  fallback: boolean
) {
  return typeof value ===
    "boolean"
    ? value
    : fallback;
}

function positiveInteger(
  value: unknown,
  fallback: number,
  maximum: number
) {
  if (
    typeof value !==
      "number" ||
    !Number.isInteger(value) ||
    value < 1
  ) {
    return fallback;
  }

  return Math.min(
    value,
    maximum
  );
}

export function
normalizeVoiceAssistantSettings(
  value: unknown
): VoiceAssistantSettings {
  if (!isRecord(value)) {
    return {
      ...defaultSettings,
    };
  }

  return {
    provider:
      typeof value.provider ===
        "string" &&
      value.provider.trim()
        ? value.provider
            .trim()
            .slice(0, 100)
        : defaultSettings.provider,

    voiceSearchEnabled:
      booleanValue(
        value.voice_search_enabled,
        defaultSettings
          .voiceSearchEnabled
      ),

    appointmentDraftEnabled:
      booleanValue(
        value.appointment_draft_enabled,
        defaultSettings
          .appointmentDraftEnabled
      ),

    appointmentConfirmationEnabled:
      booleanValue(
        value
          .appointment_confirmation_enabled,
        defaultSettings
          .appointmentConfirmationEnabled
      ),

    maximumSessionMinutes:
      positiveInteger(
        value.maximum_session_minutes,
        defaultSettings
          .maximumSessionMinutes,
        60
      ),

    maximumSessionsPerUserPerDay:
      positiveInteger(
        value
          .maximum_sessions_per_user_per_day,
        defaultSettings
          .maximumSessionsPerUserPerDay,
        100
      ),

    maximumPlatformMinutesPerDay:
      positiveInteger(
        value
          .maximum_platform_minutes_per_day,
        defaultSettings
          .maximumPlatformMinutesPerDay,
        100000
      ),

    automaticPauseAfterDailyLimit:
      booleanValue(
        value
          .automatic_pause_after_daily_limit,
        defaultSettings
          .automaticPauseAfterDailyLimit
      ),
  };
}

export function
normalizeOperationalState(
  value: unknown
): VoiceAssistantOperationalState {
  return operationalStates.includes(
    value as
      VoiceAssistantOperationalState
  )
    ? (value as
        VoiceAssistantOperationalState)
    : "standby";
}

export function
normalizeAllowedRoles(
  value: unknown
): VoiceAssistantAllowedRole[] {
  if (!Array.isArray(value)) {
    return [
      "patient",
    ];
  }

  const normalized =
    value.filter(
      (
        item
      ): item is
        VoiceAssistantAllowedRole =>
        typeof item ===
          "string" &&
        allowedRoles.includes(
          item as
            VoiceAssistantAllowedRole
        )
    );

  return normalized.length > 0
    ? Array.from(
        new Set(normalized)
      )
    : [
        "patient",
      ];
}

export function
getOperationalStateLabel(
  value:
    VoiceAssistantOperationalState
) {
  switch (value) {
    case "standby":
      return "În așteptare";

    case "admin_testing":
      return "Testare administrator";

    case "limited_rollout":
      return "Lansare limitată";

    case "active":
      return "Activ";
  }
}

export function getRoleLabel(
  role: VoiceAssistantAllowedRole
) {
  switch (role) {
    case "patient":
      return "Pacienți";

    case "doctor":
      return "Medici";

    case "staff":
      return "Personal";

    case "admin":
      return "Administratori";

    case "manager":
      return "Manageri";
  }
}
