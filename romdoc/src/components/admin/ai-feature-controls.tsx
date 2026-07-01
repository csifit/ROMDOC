"use client";

import {
  type FormEvent,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

import {
  VOICE_ASSISTANT_ALLOWED_ROLES,
  VOICE_ASSISTANT_OPERATIONAL_STATES,
  getOperationalStateLabel,
  getRoleLabel,
  type VoiceAssistantAllowedRole,
  type VoiceAssistantOperationalState,
} from "@/lib/ai/voice-assistant-settings";

type AiFeatureControlsProps = {
  initialEnabled: boolean;
  initialOperationalState:
    VoiceAssistantOperationalState;
  initialAllowedRoles:
    VoiceAssistantAllowedRole[];
  providerConfigured: boolean;
  emergencyLockActive: boolean;
  initialUpdatedAt: string;
};

type SaveResponse = {
  message?: string;
  error?: string;
  code?: string;
  feature?: {
    isEnabled: boolean;
    operationalState:
      VoiceAssistantOperationalState;
    allowedRoles:
      VoiceAssistantAllowedRole[];
    updatedAt: string;
  };
};

function sortedRoles(
  roles:
    VoiceAssistantAllowedRole[]
) {
  return [
    ...roles,
  ].sort();
}

function equalRoles(
  first:
    VoiceAssistantAllowedRole[],
  second:
    VoiceAssistantAllowedRole[]
) {
  return JSON.stringify(
    sortedRoles(first)
  ) ===
    JSON.stringify(
      sortedRoles(second)
    );
}

export default function AiFeatureControls({
  initialEnabled,
  initialOperationalState,
  initialAllowedRoles,
  providerConfigured,
  emergencyLockActive,
  initialUpdatedAt,
}: AiFeatureControlsProps) {
  const router =
    useRouter();

  const [
    enabled,
    setEnabled,
  ] = useState(
    initialEnabled
  );

  const [
    operationalState,
    setOperationalState,
  ] = useState(
    initialOperationalState
  );

  const [
    allowedRoles,
    setAllowedRoles,
  ] = useState<
    VoiceAssistantAllowedRole[]
  >(
    initialAllowedRoles
  );

  const [
    savedEnabled,
    setSavedEnabled,
  ] = useState(
    initialEnabled
  );

  const [
    savedOperationalState,
    setSavedOperationalState,
  ] = useState(
    initialOperationalState
  );

  const [
    savedAllowedRoles,
    setSavedAllowedRoles,
  ] = useState<
    VoiceAssistantAllowedRole[]
  >(
    initialAllowedRoles
  );

  const [
    lastKnownUpdatedAt,
    setLastKnownUpdatedAt,
  ] = useState(
    initialUpdatedAt
  );

  const [
    changeReason,
    setChangeReason,
  ] = useState("");

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    feedback,
    setFeedback,
  ] = useState<{
    type:
      | "success"
      | "error";
    message: string;
  } | null>(null);

  const canEnable =
    providerConfigured &&
    !emergencyLockActive &&
    operationalState !==
      "standby";

  const isDirty =
    enabled !==
      savedEnabled ||
    operationalState !==
      savedOperationalState ||
    !equalRoles(
      allowedRoles,
      savedAllowedRoles
    );

  const reasonIsValid =
    changeReason
      .trim()
      .length >= 3 &&
    changeReason
      .trim()
      .length <= 1000;

  const saveDisabled =
    isSaving ||
    !isDirty ||
    !reasonIsValid ||
    allowedRoles.length ===
      0;

  const activationBlockers =
    useMemo(() => {
      const blockers:
        string[] = [];

      if (!providerConfigured) {
        blockers.push(
          "OPENAI_API_KEY nu este configurată."
        );
      }

      if (emergencyLockActive) {
        blockers.push(
          "Blocarea de urgență este activă."
        );
      }

      if (
        operationalState ===
        "standby"
      ) {
        blockers.push(
          "Selectează o stare operațională diferită de „În așteptare”."
        );
      }

      return blockers;
    }, [
      emergencyLockActive,
      operationalState,
      providerConfigured,
    ]);

  function handleStateChange(
    value:
      VoiceAssistantOperationalState
  ) {
    setOperationalState(
      value
    );
    setFeedback(null);

    if (
      value ===
      "standby"
    ) {
      setEnabled(false);
    }

    if (
      value ===
        "admin_testing" &&
      !allowedRoles.includes(
        "admin"
      )
    ) {
      setAllowedRoles(
        Array.from(
          new Set([
            ...allowedRoles,
            "admin",
          ])
        )
      );
    }
  }

  function handleRoleChange(
    role:
      VoiceAssistantAllowedRole
  ) {
    setFeedback(null);

    if (
      allowedRoles.includes(
        role
      )
    ) {
      if (
        operationalState ===
          "admin_testing" &&
        role ===
          "admin"
      ) {
        setFeedback({
          type:
            "error",
          message:
            "Rolul Administrator este obligatoriu în modul de testare administrator.",
        });
        return;
      }

      setAllowedRoles(
        allowedRoles.filter(
          (item) =>
            item !== role
        )
      );
      return;
    }

    setAllowedRoles([
      ...allowedRoles,
      role,
    ]);
  }

  function resetForm() {
    setEnabled(
      savedEnabled
    );
    setOperationalState(
      savedOperationalState
    );
    setAllowedRoles(
      savedAllowedRoles
    );
    setChangeReason("");
    setFeedback(null);
  }

  async function handleSubmit(
    event:
      FormEvent<
        HTMLFormElement
      >
  ) {
    event.preventDefault();

    if (saveDisabled) {
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const response =
        await fetch(
          "/api/admin/settings/ai",
          {
            method:
              "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                isEnabled:
                  enabled,
                operationalState,
                allowedRoles,
                changeReason:
                  changeReason
                    .trim(),
                expectedUpdatedAt:
                  lastKnownUpdatedAt,
              }),
          }
        );

      const payload =
        (await response
          .json()) as
          SaveResponse;

      if (
        !response.ok ||
        !payload.feature
      ) {
        setFeedback({
          type:
            "error",
          message:
            payload.error ??
            "Configurarea nu a putut fi salvată.",
        });
        return;
      }

      setSavedEnabled(
        payload.feature
          .isEnabled
      );
      setEnabled(
        payload.feature
          .isEnabled
      );

      setSavedOperationalState(
        payload.feature
          .operationalState
      );
      setOperationalState(
        payload.feature
          .operationalState
      );

      setSavedAllowedRoles(
        payload.feature
          .allowedRoles
      );
      setAllowedRoles(
        payload.feature
          .allowedRoles
      );

      setLastKnownUpdatedAt(
        payload.feature
          .updatedAt
      );

      setChangeReason("");

      setFeedback({
        type:
          "success",
        message:
          payload.message ??
          "Configurarea a fost salvată.",
      });

      router.refresh();
    } catch (error) {
      console.error(
        "Saving AI settings failed:",
        error
      );

      setFeedback({
        type:
          "error",
        message:
          "A apărut o eroare de rețea. Reîncarcă pagina și încearcă din nou.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
          Control administrativ
        </p>

        <h2 className="mt-2 text-2xl font-bold text-gray-900">
          Comutator principal și roluri
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Poți pregăti starea de lansare și rolurile permise.
          Activarea rămâne blocată până când toate protecțiile
          tehnice sunt îndeplinite.
        </p>
      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="mt-7 space-y-7"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <fieldset className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <legend className="px-1 text-lg font-bold text-gray-900">
              Stare serviciu
            </legend>

            <label className="mt-4 flex items-start gap-3">
              <input
                type="checkbox"
                checked={
                  enabled
                }
                onChange={(
                  event
                ) => {
                  setEnabled(
                    event.target
                      .checked
                  );
                  setFeedback(
                    null
                  );
                }}
                disabled={
                  !canEnable &&
                  !enabled
                }
                className="romdoc-focus-ring mt-1 h-5 w-5 rounded border-gray-300 text-[#036661]"
              />

              <span>
                <span className="block text-sm font-semibold text-gray-900">
                  Activează comutatorul principal
                </span>

                <span className="mt-1 block text-sm leading-6 text-gray-600">
                  Chiar și după activare, accesul mai depinde de
                  stare, rol, blocarea de urgență și furnizor.
                </span>
              </span>
            </label>

            {activationBlockers.length >
            0 ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-950">
                  Activarea este blocată:
                </p>

                <ul className="mt-2 space-y-1 text-sm leading-6 text-amber-900">
                  {activationBlockers.map(
                    (blocker) => (
                      <li
                        key={
                          blocker
                        }
                      >
                        • {blocker}
                      </li>
                    )
                  )}
                </ul>
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-900">
                Protecțiile tehnice necesare pentru comutator sunt
                îndeplinite.
              </p>
            )}

            <label className="mt-5 block">
              <span className="text-sm font-semibold text-gray-900">
                Stare operațională
              </span>

              <select
                value={
                  operationalState
                }
                onChange={(
                  event
                ) =>
                  handleStateChange(
                    event.target
                      .value as
                      VoiceAssistantOperationalState
                  )
                }
                className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900"
              >
                {VOICE_ASSISTANT_OPERATIONAL_STATES.map(
                  (state) => (
                    <option
                      key={
                        state
                      }
                      value={
                        state
                      }
                    >
                      {
                        getOperationalStateLabel(
                          state
                        )
                      }
                    </option>
                  )
                )}
              </select>
            </label>
          </fieldset>

          <fieldset className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <legend className="px-1 text-lg font-bold text-gray-900">
              Roluri permise
            </legend>

            <p className="mt-3 text-sm leading-6 text-gray-600">
              Selectează cel puțin un rol. Aceste roluri nu
              ocolesc autentificarea sau verificarea contului.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {VOICE_ASSISTANT_ALLOWED_ROLES.map(
                (role) => {
                  const checked =
                    allowedRoles.includes(
                      role
                    );

                  const locked =
                    operationalState ===
                      "admin_testing" &&
                    role ===
                      "admin";

                  return (
                    <label
                      key={
                        role
                      }
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                        checked
                          ? "border-[#036661] bg-[#036661]/5"
                          : "border-gray-200 bg-white"
                      } ${
                        locked
                          ? "cursor-not-allowed opacity-80"
                          : "cursor-pointer"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={
                          checked
                        }
                        onChange={() =>
                          handleRoleChange(
                            role
                          )
                        }
                        disabled={
                          locked
                        }
                        className="romdoc-focus-ring h-5 w-5 rounded border-gray-300 text-[#036661]"
                      />

                      <span className="text-sm font-semibold text-gray-800">
                        {
                          getRoleLabel(
                            role
                          )
                        }
                      </span>
                    </label>
                  );
                }
              )}
            </div>

            {allowedRoles.length ===
            0 && (
              <p
                role="alert"
                className="mt-4 text-sm font-semibold text-red-700"
              >
                Selectează cel puțin un rol.
              </p>
            )}
          </fieldset>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-gray-900">
            Motivul modificării
          </span>

          <textarea
            value={
              changeReason
            }
            onChange={(
              event
            ) =>
              setChangeReason(
                event.target
                  .value
                  .slice(
                    0,
                    1000
                  )
              )
            }
            rows={3}
            placeholder="Exemplu: Pregătire pentru testare internă, fără acces public."
            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900"
          />

          <span className="mt-2 flex justify-between gap-4 text-xs text-gray-500">
            <span>
              Obligatoriu, minimum 3 caractere.
            </span>

            <span>
              {
                changeReason.length
              }
              /1000
            </span>
          </span>
        </label>

        {feedback && (
          <div
            role="status"
            className={
              feedback.type ===
              "success"
                ? "rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900"
                : "rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            }
          >
            {
              feedback.message
            }
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={
              saveDisabled
            }
            className="romdoc-button romdoc-button-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving
              ? "Se salvează..."
              : "Salvează configurarea"}
          </button>

          <button
            type="button"
            onClick={
              resetForm
            }
            disabled={
              isSaving ||
              !isDirty
            }
            className="romdoc-button romdoc-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Renunță la modificări
          </button>
        </div>
      </form>
    </section>
  );
}
