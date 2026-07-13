"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  hasEnabledVoiceCapability,
  isVoiceAccessSuccess,
} from "@/lib/ai/voice-assistant-access-response";
import {
  dispatchVoiceAssistantOpenEvent,
} from "@/lib/ai/voice-assistant-browser-events";

type PublicVoiceMicrophoneProps = {
  isAuthenticated: boolean;
};

function MicrophoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect
        x="9"
        y="3"
        width="6"
        height="11"
        rx="3"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6"
      />
    </svg>
  );
}

export default function
PublicVoiceMicrophone({
  isAuthenticated,
}: PublicVoiceMicrophoneProps) {
  const [
    isAvailable,
    setIsAvailable,
  ] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      const timerId = window.setTimeout(() => {
        setIsAvailable(false);
      }, 0);

      return () => {
        window.clearTimeout(timerId);
      };
    }

    const controller =
      new AbortController();

    async function
    checkVoiceAccess() {
      try {
        const response =
          await fetch(
            "/api/voice/access",
            {
              method:
                "GET",
              credentials:
                "same-origin",
              cache:
                "no-store",
              signal:
                controller.signal,
              headers: {
                Accept:
                  "application/json",
              },
            }
          );

        const payload:
          unknown =
          await response
            .json()
            .catch(
              () => null
            );

        if (
          !response.ok ||
          !isVoiceAccessSuccess(
            payload
          ) ||
          !hasEnabledVoiceCapability(
            payload.capabilities
          )
        ) {
          setIsAvailable(
            false
          );
          return;
        }

        setIsAvailable(
          true
        );
      } catch (error) {
        if (
          error instanceof
            DOMException &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        /*
         * Access-check failures are intentionally silent.
         * The microphone remains hidden.
         */
        setIsAvailable(
          false
        );
      }
    }

    void checkVoiceAccess();

    return () => {
      controller.abort();
    };
  }, [
    isAuthenticated,
  ]);

  if (
    !isAuthenticated ||
    !isAvailable
  ) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => {
        dispatchVoiceAssistantOpenEvent({
          source:
            "public_microphone",
        });
      }}
      aria-label="Deschide asistentul vocal RomDoc"
      aria-haspopup="dialog"
      aria-controls="romdoc-voice-assistant-dialog"
      title="Deschide asistentul vocal RomDoc"
      className="romdoc-focus-ring fixed bottom-5 right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/70 bg-[#036661] text-white shadow-[0_14px_35px_rgba(17,24,39,0.28)] transition hover:-translate-y-0.5 hover:bg-[#FF2800] hover:shadow-[0_18px_42px_rgba(17,24,39,0.32)] active:translate-y-0 sm:bottom-6 sm:right-6 sm:h-16 sm:w-16"
      data-romdoc-voice-trigger="public"
    >
      <MicrophoneIcon />

      <span className="sr-only">
        Deschide asistentul vocal
      </span>
    </button>
  );
}

