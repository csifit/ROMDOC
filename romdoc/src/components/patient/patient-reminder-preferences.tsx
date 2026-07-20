"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  useEffect,
  useState,
} from "react";

import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type ReminderPreferences = {
  emailRemindersEnabled: boolean;
  reminder48HoursEnabled: boolean;
  reminder24HoursEnabled: boolean;
};

const DEFAULT_PREFERENCES:
  ReminderPreferences = {
    emailRemindersEnabled: true,
    reminder48HoursEnabled: true,
    reminder24HoursEnabled: true,
  };

export default function PatientReminderPreferences() {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "PatientPages.reminders.preferences"
    );

  const [
    preferences,
    setPreferences,
  ] = useState<ReminderPreferences>(
    DEFAULT_PREFERENCES
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState<string | null>(
    null
  );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      try {
        const response =
          await fetch(
            "/api/patient/reminder-preferences",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const payload =
          (await response.json()) as {
            preferences?:
              ReminderPreferences;
            error?: string;
          };

        if (!response.ok) {
          throw new Error(
            locale === "ro" &&
            payload.error
              ? payload.error
              : t(
                  "loadError"
                )
          );
        }

        if (
          !cancelled &&
          payload.preferences
        ) {
          setPreferences(
            payload.preferences
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : t(
                  "loadError"
                )
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadPreferences();

    return () => {
      cancelled = true;
    };
  }, [
    locale,
    t,
  ]);

  function updatePreference(
    key: keyof ReminderPreferences,
    value: boolean
  ) {
    setPreferences(
      (current) => ({
        ...current,
        [key]: value,
      })
    );

    setMessage(null);
    setError(null);
  }

  async function savePreferences() {
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response =
        await fetch(
          "/api/patient/reminder-preferences",
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              preferences
            ),
          }
        );

      const payload =
        (await response.json()) as {
          preferences?:
            ReminderPreferences;
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          locale === "ro" &&
          payload.error
            ? payload.error
            : t(
                "saveError"
              )
        );
      }

      if (payload.preferences) {
        setPreferences(
          payload.preferences
        );
      }

      setMessage(
        t(
          "saved"
        )
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t(
              "saveError"
            )
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <p className="text-sm text-gray-600">
          {t(
            "loading"
          )}
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
      <p className="text-sm font-semibold text-[#036661]">
        {t(
          "eyebrow"
        )}
      </p>

      <h2 className="mt-[8px] text-2xl font-bold text-gray-900">
        {t(
          "title"
        )}
      </h2>

      <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
        {t(
          "description"
        )}
      </p>

      <div className="mt-[21px] space-y-[13px]">
        <label className="flex cursor-pointer items-start justify-between gap-[13px] rounded-[13px] border border-gray-200 p-[13px]">
          <span>
            <span className="block font-semibold text-gray-900">
              {t(
                "emailTitle"
              )}
            </span>

            <span className="mt-[5px] block text-sm leading-5 text-gray-600">
              {t(
                "emailDescription"
              )}
            </span>
          </span>

          <input
            type="checkbox"
            checked={
              preferences.emailRemindersEnabled
            }
            onChange={(event) =>
              updatePreference(
                "emailRemindersEnabled",
                event.target.checked
              )
            }
            className="mt-[5px] h-[21px] w-[21px] accent-[#036661]"
          />
        </label>

        <label className="flex cursor-pointer items-start justify-between gap-[13px] rounded-[13px] border border-gray-200 p-[13px]">
          <span>
            <span className="block font-semibold text-gray-900">
              {t(
                "hours48Title"
              )}
            </span>

            <span className="mt-[5px] block text-sm leading-5 text-gray-600">
              {t(
                "hours48Description"
              )}
            </span>
          </span>

          <input
            type="checkbox"
            checked={
              preferences.reminder48HoursEnabled
            }
            disabled={
              !preferences.emailRemindersEnabled
            }
            onChange={(event) =>
              updatePreference(
                "reminder48HoursEnabled",
                event.target.checked
              )
            }
            className="mt-[5px] h-[21px] w-[21px] accent-[#036661] disabled:cursor-not-allowed"
          />
        </label>

        <label className="flex cursor-pointer items-start justify-between gap-[13px] rounded-[13px] border border-gray-200 p-[13px]">
          <span>
            <span className="block font-semibold text-gray-900">
              {t(
                "hours24Title"
              )}
            </span>

            <span className="mt-[5px] block text-sm leading-5 text-gray-600">
              {t(
                "hours24Description"
              )}
            </span>
          </span>

          <input
            type="checkbox"
            checked={
              preferences.reminder24HoursEnabled
            }
            disabled={
              !preferences.emailRemindersEnabled
            }
            onChange={(event) =>
              updatePreference(
                "reminder24HoursEnabled",
                event.target.checked
              )
            }
            className="mt-[5px] h-[21px] w-[21px] accent-[#036661] disabled:cursor-not-allowed"
          />
        </label>
      </div>

      {message && (
        <p
          role="status"
          className="mt-[21px] rounded-[13px] bg-green-50 p-[13px] text-sm font-medium text-green-800"
        >
          {message}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-[21px] rounded-[13px] bg-red-50 p-[13px] text-sm font-medium text-red-800"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() =>
          void savePreferences()
        }
        disabled={isSaving}
        className="romdoc-button romdoc-button-primary mt-[21px] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving
          ? t(
              "saving"
            )
          : t(
              "save"
            )}
      </button>
    </section>
  );
}
