export const VOICE_ASSISTANT_FEATURE_KEY =
  "voice_appointment_assistant";

export const
VOICE_ASSISTANT_OPERATIONAL_STATES =
  [
    "standby",
    "admin_testing",
    "limited_rollout",
    "active",
  ] as const;

export const
VOICE_ASSISTANT_ALLOWED_ROLES =
  [
    "patient",
    "doctor",
    "staff",
    "admin",
    "manager",
  ] as const;

export type VoiceAssistantOperationalState =
  (typeof VOICE_ASSISTANT_OPERATIONAL_STATES)[number];

export type VoiceAssistantAllowedRole =
  (typeof VOICE_ASSISTANT_ALLOWED_ROLES)[number];

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
isVoiceAssistantOperationalState(
  value: unknown
): value is
  VoiceAssistantOperationalState {
  return (
    typeof value ===
      "string" &&
    VOICE_ASSISTANT_OPERATIONAL_STATES.includes(
      value as
        VoiceAssistantOperationalState
    )
  );
}

export function
isVoiceAssistantAllowedRole(
  value: unknown
): value is
  VoiceAssistantAllowedRole {
  return (
    typeof value ===
      "string" &&
    VOICE_ASSISTANT_ALLOWED_ROLES.includes(
      value as
        VoiceAssistantAllowedRole
    )
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
  return isVoiceAssistantOperationalState(
    value
  )
    ? value
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
      isVoiceAssistantAllowedRole
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
