"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  hasEnabledVoiceCapability,
  isVoiceAccessSuccess,
  type VoiceAccessCapabilities,
  type VoiceAccessLimits,
} from "@/lib/ai/voice-assistant-access-response";
import {
  VOICE_ASSISTANT_OPEN_EVENT,
} from "@/lib/ai/voice-assistant-browser-events";

type PublicVoiceAssistantShellProps = {
  isAuthenticated: boolean;
};

type ShellAccessData = {
  capabilities:
    VoiceAccessCapabilities;
  limits:
    VoiceAccessLimits;
};

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        d="M6 6l12 12M18 6 6 18"
      />
    </svg>
  );
}

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

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3 19 6v5c0 4.6-2.7 8-7 10-4.3-2-7-5.4-7-10V6l7-3Z"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m9 12 2 2 4-4"
      />
    </svg>
  );
}

function capabilityItems(
  capabilities:
    VoiceAccessCapabilities
) {
  return [
    {
      key:
        "voice-search",
      label:
        "Căutare de medici",
      description:
        "Căutare după specialitate, oraș și alte criterii.",
      enabled:
        capabilities
          .voiceSearch,
    },
    {
      key:
        "appointment-draft",
      label:
        "Pregătirea programării",
      description:
        "Completarea unei propuneri înainte de confirmarea finală.",
      enabled:
        capabilities
          .appointmentDraft,
    },
    {
      key:
        "appointment-confirmation",
      label:
        "Confirmarea programării",
      description:
        "Confirmarea va necesita întotdeauna acordul explicit al pacientului.",
      enabled:
        capabilities
          .appointmentConfirmation,
    },
  ].filter(
    (item) =>
      item.enabled
  );
}

function getFocusableElements(
  container: HTMLElement
) {
  const selectors = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");

  return Array.from(
    container.querySelectorAll<
      HTMLElement
    >(selectors)
  ).filter(
    (element) =>
      !element.hasAttribute(
        "hidden"
      ) &&
      element.getAttribute(
        "aria-hidden"
      ) !==
        "true"
  );
}

export default function
PublicVoiceAssistantShell({
  isAuthenticated,
}: PublicVoiceAssistantShellProps) {
  const [
    accessData,
    setAccessData,
  ] = useState<
    ShellAccessData | null
  >(null);

  const panelRef =
    useRef<
      HTMLDivElement | null
    >(null);

  const requestControllerRef =
    useRef<
      AbortController | null
    >(null);

  const triggerRef =
    useRef<
      HTMLElement | null
    >(null);

  const closeShell =
    useCallback(() => {
      requestControllerRef
        .current
        ?.abort();

      requestControllerRef.current =
        null;

      setAccessData(
        null
      );

      window.setTimeout(
        () => {
          triggerRef.current
            ?.focus();
        },
        0
      );
    }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setAccessData(
        null
      );
      return;
    }

    async function
    handleOpenEvent() {
      requestControllerRef
        .current
        ?.abort();

      const controller =
        new AbortController();

      requestControllerRef.current =
        controller;

      triggerRef.current =
        document.querySelector<
          HTMLElement
        >(
          '[data-romdoc-voice-trigger="public"]'
        );

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
          setAccessData(
            null
          );
          return;
        }

        setAccessData({
          capabilities:
            payload.capabilities,
          limits:
            payload.limits,
        });
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
         * Any access-check failure leaves the shell closed.
         */
        setAccessData(
          null
        );
      } finally {
        if (
          requestControllerRef
            .current ===
          controller
        ) {
          requestControllerRef.current =
            null;
        }
      }
    }

    window.addEventListener(
      VOICE_ASSISTANT_OPEN_EVENT,
      handleOpenEvent
    );

    return () => {
      window.removeEventListener(
        VOICE_ASSISTANT_OPEN_EVENT,
        handleOpenEvent
      );

      requestControllerRef
        .current
        ?.abort();
    };
  }, [
    isAuthenticated,
  ]);

  useEffect(() => {
    if (!accessData) {
      return;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    panelRef.current?.focus();

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        event.preventDefault();
        closeShell();
        return;
      }

      if (
        event.key !==
          "Tab" ||
        !panelRef.current
      ) {
        return;
      }

      const focusable =
        getFocusableElements(
          panelRef.current
        );

      if (
        focusable.length ===
        0
      ) {
        event.preventDefault();
        panelRef.current
          .focus();
        return;
      }

      const first =
        focusable[0];
      const last =
        focusable[
          focusable.length - 1
        ];
      const active =
        document.activeElement;

      if (
        event.shiftKey &&
        (
          active === first ||
          active ===
            panelRef.current
        )
      ) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (
        !event.shiftKey &&
        active === last
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    accessData,
    closeShell,
  ]);

  if (
    !isAuthenticated ||
    !accessData
  ) {
    return null;
  }

  const enabledCapabilities =
    capabilityItems(
      accessData.capabilities
    );

  return (
    <div
      className="fixed inset-0 z-50"
      data-romdoc-voice-shell="open"
    >
      <button
        type="button"
        aria-label="Închide asistentul vocal"
        onClick={
          closeShell
        }
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
      />

      <div className="absolute inset-x-0 bottom-0 flex max-h-[92vh] justify-center px-0 sm:inset-0 sm:items-center sm:px-5">
        <div
          id="romdoc-voice-assistant-dialog"
          ref={
            panelRef
          }
          role="dialog"
          aria-modal="true"
          aria-labelledby="romdoc-voice-assistant-title"
          aria-describedby="romdoc-voice-assistant-description"
          tabIndex={-1}
          className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl outline-none sm:max-w-2xl sm:rounded-3xl"
        >
          <header className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-5 sm:px-7">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#036661] text-white">
                <MicrophoneIcon />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#036661]">
                  RomDoc
                </p>

                <h2
                  id="romdoc-voice-assistant-title"
                  className="mt-1 text-2xl font-bold text-gray-900"
                >
                  Asistent vocal
                </h2>

                <span className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                  Interfață pregătită — conexiune vocală inactivă
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={
                closeShell
              }
              aria-label="Închide asistentul vocal"
              className="romdoc-focus-ring rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
              <CloseIcon />
            </button>
          </header>

          <div className="overflow-y-auto px-5 py-6 sm:px-7">
            <p
              id="romdoc-voice-assistant-description"
              className="text-sm leading-6 text-gray-600"
            >
              Această interfață pregătește experiența viitorului
              asistent vocal RomDoc. În etapa curentă nu
              înregistrează, nu transmite și nu procesează sunet.
            </p>

            <section className="mt-6 rounded-2xl border border-[#036661]/20 bg-[#036661]/5 p-5">
              <h3 className="text-lg font-bold text-gray-900">
                Funcții permise de configurarea curentă
              </h3>

              <ul className="mt-4 space-y-3">
                {enabledCapabilities.map(
                  (item) => (
                    <li
                      key={
                        item.key
                      }
                      className="rounded-xl border border-gray-200 bg-white p-4"
                    >
                      <p className="text-sm font-semibold text-gray-900">
                        {
                          item.label
                        }
                      </p>

                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        {
                          item.description
                        }
                      </p>
                    </li>
                  )
                )}
              </ul>
            </section>

            <section className="mt-5 grid gap-4 sm:grid-cols-2">
              <article className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Durată maximă viitoare
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {
                    accessData
                      .limits
                      .maximumSessionMinutes
                  }{" "}
                  minute
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Limita este pregătită pentru controlul costurilor,
                  dar nu este consumată în această etapă.
                </p>
              </article>

              <article className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Sesiuni per utilizator
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {
                    accessData
                      .limits
                      .maximumSessionsPerUserPerDay
                  }
                  /zi
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Limita va fi aplicată înaintea oricărei sesiuni
                  vocale reale.
                </p>
              </article>
            </section>

            <section className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <div className="flex items-start gap-3 text-blue-950">
                <div className="mt-0.5 shrink-0">
                  <ShieldIcon />
                </div>

                <div>
                  <h3 className="font-bold">
                    Limite de siguranță
                  </h3>

                  <ul className="mt-2 space-y-1 text-sm leading-6">
                    <li>
                      Asistentul nu va oferi diagnostice sau
                      recomandări de tratament.
                    </li>

                    <li>
                      O programare va necesita confirmarea explicită
                      a pacientului.
                    </li>

                    <li>
                      Formularul normal de căutare și programare
                      rămâne disponibil.
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="font-bold text-amber-950">
                Conexiunea vocală nu este implementată încă
              </h3>

              <p className="mt-2 text-sm leading-6 text-amber-900">
                Acest ecran nu pornește microfonul și nu contactează
                OpenAI. Butonul de conversație va fi adăugat numai
                după implementarea etapelor de conectare, testare și
                control al costurilor.
              </p>
            </section>
          </div>

          <footer className="flex flex-col-reverse gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            <button
              type="button"
              onClick={
                closeShell
              }
              className="romdoc-button romdoc-button-muted"
            >
              Închide
            </button>

            <Link
              href="/medici"
              onClick={
                closeShell
              }
              className="romdoc-button romdoc-button-primary"
            >
              Continuă fără voce
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
