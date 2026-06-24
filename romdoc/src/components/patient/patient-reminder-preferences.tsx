"use client";

import {
  useEffect,
  useState,
} from "react";

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

export default function
PatientReminderPreferences() {
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
            payload.error ??
              "Preferințele nu au putut fi încărcate."
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
              : "Preferințele nu au putut fi încărcate."
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
  }, []);

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
          payload.error ??
            "Preferințele nu au putut fi salvate."
        );
      }

      if (payload.preferences) {
        setPreferences(
          payload.preferences
        );
      }

      setMessage(
        "Preferințele pentru reamintiri au fost salvate."
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Preferințele nu au putut fi salvate."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-600">
          Se încarcă preferințele…
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold text-[#036661]">
        Notificări
      </p>

      <h2 className="mt-2 text-2xl font-bold text-gray-900">
        Reamintiri pentru programări
      </h2>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
        Alege ce reamintiri dorești să primești prin e-mail.
        Confirmările, reprogramările și anulările importante
        rămân active chiar dacă dezactivezi reamintirile.
      </p>

      <div className="mt-6 space-y-4">
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-gray-200 p-4">
          <span>
            <span className="block font-semibold text-gray-900">
              Reamintiri prin e-mail
            </span>

            <span className="mt-1 block text-sm leading-5 text-gray-600">
              Comutator principal pentru reamintirile de 48 și 24 de ore.
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
            className="mt-1 h-5 w-5 accent-[#036661]"
          />
        </label>

        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-gray-200 p-4">
          <span>
            <span className="block font-semibold text-gray-900">
              Cu aproximativ 48 de ore înainte
            </span>

            <span className="mt-1 block text-sm leading-5 text-gray-600">
              Primești timp suplimentar pentru a verifica sau anula programarea.
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
            className="mt-1 h-5 w-5 accent-[#036661] disabled:cursor-not-allowed"
          />
        </label>

        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-gray-200 p-4">
          <span>
            <span className="block font-semibold text-gray-900">
              Cu aproximativ 24 de ore înainte
            </span>

            <span className="mt-1 block text-sm leading-5 text-gray-600">
              Primești o ultimă reamintire în ziua dinaintea programării.
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
            className="mt-1 h-5 w-5 accent-[#036661] disabled:cursor-not-allowed"
          />
        </label>
      </div>

      {message && (
        <p className="mt-5 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-800">
          {message}
        </p>
      )}

      {error && (
        <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() =>
          void savePreferences()
        }
        disabled={isSaving}
        className="romdoc-button romdoc-button-primary mt-6 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving
          ? "Se salvează…"
          : "Salvează preferințele"}
      </button>
    </section>
  );
}
