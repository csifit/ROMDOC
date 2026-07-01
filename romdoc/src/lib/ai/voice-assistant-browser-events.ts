export const VOICE_ASSISTANT_OPEN_EVENT =
  "romdoc:voice-assistant-open";

export type VoiceAssistantOpenEventSource =
  "public_microphone";

export type VoiceAssistantOpenEventDetail = {
  source:
    VoiceAssistantOpenEventSource;
};

export function
dispatchVoiceAssistantOpenEvent(
  detail:
    VoiceAssistantOpenEventDetail
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return false;
  }

  return window.dispatchEvent(
    new CustomEvent<
      VoiceAssistantOpenEventDetail
    >(
      VOICE_ASSISTANT_OPEN_EVENT,
      {
        detail,
      }
    )
  );
}
