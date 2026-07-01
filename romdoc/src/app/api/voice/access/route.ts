import {
  NextResponse,
} from "next/server";

import {
  requireVoiceAssistantAccess,
} from "@/lib/ai/require-voice-assistant-access";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export async function GET() {
  const access =
    await requireVoiceAssistantAccess();

  if (access.response) {
    return access.response;
  }

  return NextResponse.json(
    {
      available:
        true,
      operationalState:
        access
          .operationalState,
      role:
        access.role,
      capabilities: {
        voiceSearch:
          access.settings
            .voiceSearchEnabled,
        appointmentDraft:
          access.settings
            .appointmentDraftEnabled,
        appointmentConfirmation:
          access.settings
            .appointmentConfirmationEnabled,
      },
      limits: {
        maximumSessionMinutes:
          access.settings
            .maximumSessionMinutes,
        maximumSessionsPerUserPerDay:
          access.settings
            .maximumSessionsPerUserPerDay,
        maximumPlatformMinutesPerDay:
          access.settings
            .maximumPlatformMinutesPerDay,
        automaticPauseAfterDailyLimit:
          access.settings
            .automaticPauseAfterDailyLimit,
      },
      configurationUpdatedAt:
        access
          .featureUpdatedAt,
    },
    {
      status:
        200,
      headers: {
        "Cache-Control":
          "no-store, max-age=0",
        Pragma:
          "no-cache",
        Vary:
          "Cookie",
      },
    }
  );
}
