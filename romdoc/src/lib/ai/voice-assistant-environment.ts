import "server-only";

export const VOICE_ASSISTANT_EMERGENCY_ENV_NAME =
  "VOICE_ASSISTANT_EMERGENCY_DISABLED";

export const VOICE_ASSISTANT_PROVIDER_ENV_NAME =
  "OPENAI_API_KEY";

export type VoiceAssistantEmergencyLockState =
  | "engaged"
  | "released"
  | "missing"
  | "invalid";

export type VoiceAssistantDeploymentEnvironment =
  | "production"
  | "preview"
  | "development"
  | "test"
  | "unknown";

export type VoiceAssistantEnvironmentStatus = {
  providerConfigured: boolean;
  emergencyLockActive: boolean;
  emergencyLockState:
    VoiceAssistantEmergencyLockState;
  emergencyVariableConfigured:
    boolean;
  deploymentEnvironment:
    VoiceAssistantDeploymentEnvironment;
};

function normalizedEnvironmentValue(
  value:
    | string
    | undefined
) {
  return value
    ?.trim()
    .toLowerCase();
}

export function getVoiceAssistantEmergencyLockState():
  VoiceAssistantEmergencyLockState {
  const value =
    normalizedEnvironmentValue(
      process.env[
        VOICE_ASSISTANT_EMERGENCY_ENV_NAME
      ]
    );

  if (!value) {
    return "missing";
  }

  if (value === "true") {
    return "engaged";
  }

  if (value === "false") {
    return "released";
  }

  return "invalid";
}

export function isVoiceAssistantProviderConfigured() {
  return Boolean(
    process.env[
      VOICE_ASSISTANT_PROVIDER_ENV_NAME
    ]?.trim()
  );
}

export function isVoiceAssistantEmergencyLockActive() {
  return (
    getVoiceAssistantEmergencyLockState() !==
    "released"
  );
}

export function getVoiceAssistantDeploymentEnvironment():
  VoiceAssistantDeploymentEnvironment {
  const vercelEnvironment =
    normalizedEnvironmentValue(
      process.env.VERCEL_ENV
    );

  if (
    vercelEnvironment ===
      "production" ||
    vercelEnvironment ===
      "preview" ||
    vercelEnvironment ===
      "development"
  ) {
    return vercelEnvironment;
  }

  const nodeEnvironment =
    normalizedEnvironmentValue(
      process.env.NODE_ENV
    );

  if (
    nodeEnvironment ===
      "production"
  ) {
    return "production";
  }

  if (
    nodeEnvironment ===
      "development"
  ) {
    return "development";
  }

  if (
    nodeEnvironment ===
      "test"
  ) {
    return "test";
  }

  return "unknown";
}

export function getVoiceAssistantEnvironmentStatus():
  VoiceAssistantEnvironmentStatus {
  const emergencyLockState =
    getVoiceAssistantEmergencyLockState();

  return {
    providerConfigured:
      isVoiceAssistantProviderConfigured(),

    emergencyLockActive:
      emergencyLockState !==
      "released",

    emergencyLockState,

    emergencyVariableConfigured:
      emergencyLockState ===
        "engaged" ||
      emergencyLockState ===
        "released",

    deploymentEnvironment:
      getVoiceAssistantDeploymentEnvironment(),
  };
}
