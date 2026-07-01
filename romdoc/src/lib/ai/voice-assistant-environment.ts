import "server-only";

export type VoiceAssistantEnvironmentStatus = {
  providerConfigured: boolean;
  emergencyLockActive: boolean;
};

export function
isVoiceAssistantProviderConfigured() {
  return Boolean(
    process.env.OPENAI_API_KEY
      ?.trim()
  );
}

export function
isVoiceAssistantEmergencyLockActive() {
  return (
    process.env
      .VOICE_ASSISTANT_EMERGENCY_DISABLED
      ?.trim()
      .toLowerCase() !==
    "false"
  );
}

export function
getVoiceAssistantEnvironmentStatus():
  VoiceAssistantEnvironmentStatus {
  return {
    providerConfigured:
      isVoiceAssistantProviderConfigured(),
    emergencyLockActive:
      isVoiceAssistantEmergencyLockActive(),
  };
}
