"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  usePathname,
  useRouter,
} from "next/navigation";

type SaveDoctorButtonProps = {
  doctorId: string;
  doctorName: string;
  initialIsSaved?: boolean | null;
  initialSavedCount?: number | null;
  showSavedCount?: boolean;
  compact?: boolean;
  className?: string;
};

type SavedDoctorApiResponse = {
  success?: boolean;
  doctorId?: string;
  isSaved?: boolean;
  alreadySaved?: boolean;
  savedCount?: number | null;
  message?: string;
  error?: string;
};

type Labels = {
  save: string;
  saved: string;
  saving: string;
  removing: string;
  genericCount: string;
  preciseCount: (count: number) => string;
  saveAria: (doctorName: string) => string;
  removeAria: (doctorName: string) => string;
  genericError: string;
};

const labelsByLocale: Record<
  string,
  Labels
> = {
  ro: {
    save: "Salvează medicul",
    saved: "Medic salvat",
    saving: "Se salvează...",
    removing: "Se elimină...",
    genericCount:
      "Salvat în listele pacienților",
    preciseCount: (count) =>
      `Salvat de ${count} pacienți`,
    saveAria: (doctorName) =>
      `Salvează medicul ${doctorName} în lista de favorite`,
    removeAria: (doctorName) =>
      `Elimină medicul ${doctorName} din lista de favorite`,
    genericError:
      "Lista medicilor salvați nu a putut fi actualizată.",
  },
  en: {
    save: "Save doctor",
    saved: "Doctor saved",
    saving: "Saving...",
    removing: "Removing...",
    genericCount:
      "Saved in patient favourite lists",
    preciseCount: (count) =>
      `Saved by ${count} patients`,
    saveAria: (doctorName) =>
      `Save doctor ${doctorName} to favourites`,
    removeAria: (doctorName) =>
      `Remove doctor ${doctorName} from favourites`,
    genericError:
      "The saved-doctor list could not be updated.",
  },
  de: {
    save: "Arzt speichern",
    saved: "Arzt gespeichert",
    saving: "Wird gespeichert...",
    removing: "Wird entfernt...",
    genericCount:
      "In Patienten-Favoriten gespeichert",
    preciseCount: (count) =>
      `Von ${count} Patienten gespeichert`,
    saveAria: (doctorName) =>
      `Arzt ${doctorName} als Favorit speichern`,
    removeAria: (doctorName) =>
      `Arzt ${doctorName} aus den Favoriten entfernen`,
    genericError:
      "Die Favoritenliste konnte nicht aktualisiert werden.",
  },
};

function HeartIcon({
  filled,
}: {
  filled: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 ${
        filled
          ? "fill-current"
          : "fill-none"
      }`}
    >
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function normalizeCount(
  value: unknown
) {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return Math.max(
      0,
      Math.trunc(value)
    );
  }

  if (
    typeof value === "string"
  ) {
    const parsed =
      Number(value);

    if (
      Number.isFinite(parsed)
    ) {
      return Math.max(
        0,
        Math.trunc(parsed)
      );
    }
  }

  return null;
}

export default function SaveDoctorButton({
  doctorId,
  doctorName,
  initialIsSaved = null,
  initialSavedCount = null,
  showSavedCount = false,
  compact = false,
  className = "",
}: SaveDoctorButtonProps) {
  const router =
    useRouter();
  const pathname =
    usePathname();

  const firstPathSegment =
    pathname
      .split("/")
      .filter(Boolean)[0];

  const locale =
    firstPathSegment === "en" ||
    firstPathSegment === "de" ||
    firstPathSegment === "ro"
      ? firstPathSegment
      : "ro";

  const labels =
    labelsByLocale[locale] ??
    labelsByLocale.ro;

  const [
    isSaved,
    setIsSaved,
  ] = useState<boolean | null>(
    initialIsSaved
  );
  const [
    savedCount,
    setSavedCount,
  ] = useState<number | null>(
    normalizeCount(
      initialSavedCount
    )
  );
  const [
    isLoading,
    setIsLoading,
  ] = useState(
    initialIsSaved === null
  );
  const [
    isUpdating,
    setIsUpdating,
  ] = useState(false);
  const [
    authenticationRequired,
    setAuthenticationRequired,
  ] = useState(false);
  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    if (
      initialIsSaved !== null
    ) {
      return;
    }

    const controller =
      new AbortController();

    async function loadSavedState() {
      setIsLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            `/api/patient/saved-doctors?doctorId=${encodeURIComponent(
              doctorId
            )}`,
            {
              method: "GET",
              headers: {
                Accept:
                  "application/json",
              },
              cache: "no-store",
              signal:
                controller.signal,
            }
          );

        if (
          response.status === 401
        ) {
          setAuthenticationRequired(
            true
          );
          setIsSaved(false);
          return;
        }

        const payload =
          (await response.json()) as
            SavedDoctorApiResponse;

        if (
          !response.ok
        ) {
          if (
            response.status === 403
          ) {
            setIsSaved(false);
            return;
          }

          throw new Error(
            payload.error ??
              labels.genericError
          );
        }

        setIsSaved(
          payload.isSaved === true
        );

        const nextCount =
          normalizeCount(
            payload.savedCount
          );

        if (
          nextCount !== null
        ) {
          setSavedCount(
            nextCount
          );
        }
      } catch (loadError) {
        if (
          loadError instanceof
            DOMException &&
          loadError.name ===
            "AbortError"
        ) {
          return;
        }

        console.error(
          "Saved doctor state failed:",
          loadError
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : labels.genericError
        );
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setIsLoading(false);
        }
      }
    }

    void loadSavedState();

    return () => {
      controller.abort();
    };
  }, [
    doctorId,
    initialIsSaved,
    labels.genericError,
  ]);

  function redirectToLogin() {
    const currentUrl =
      typeof window !==
      "undefined"
        ? `${pathname}${window.location.search}${window.location.hash}`
        : pathname;

    router.push(
      `/login?next=${encodeURIComponent(
        currentUrl
      )}`
    );
  }

  async function toggleSavedDoctor() {
    if (
      isUpdating
    ) {
      return;
    }

    if (
      authenticationRequired
    ) {
      redirectToLogin();
      return;
    }

    setIsUpdating(true);
    setError("");

    const nextSavedState =
      !Boolean(isSaved);

    try {
      const response =
        await fetch(
          "/api/patient/saved-doctors",
          {
            method:
              nextSavedState
                ? "POST"
                : "DELETE",
            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
            body: JSON.stringify({
              doctorId,
            }),
          }
        );

      if (
        response.status === 401
      ) {
        setAuthenticationRequired(
          true
        );
        redirectToLogin();
        return;
      }

      const payload =
        (await response.json()) as
          SavedDoctorApiResponse;

      if (
        !response.ok
      ) {
        throw new Error(
          payload.error ??
            labels.genericError
        );
      }

      setIsSaved(
        payload.isSaved === true
      );

      const nextCount =
        normalizeCount(
          payload.savedCount
        );

      if (
        nextCount !== null
      ) {
        setSavedCount(
          nextCount
        );
      }
    } catch (updateError) {
      console.error(
        "Saved doctor update failed:",
        updateError
      );

      setError(
        updateError instanceof Error
          ? updateError.message
          : labels.genericError
      );
    } finally {
      setIsUpdating(false);
    }
  }

  const buttonLabel =
    isUpdating
      ? isSaved
        ? labels.removing
        : labels.saving
      : isSaved
        ? labels.saved
        : labels.save;

  const ariaLabel =
    isSaved
      ? labels.removeAria(
          doctorName
        )
      : labels.saveAria(
          doctorName
        );

  const countLabel =
    savedCount === null ||
    savedCount <= 0
      ? null
      : savedCount < 5
        ? labels.genericCount
        : labels.preciseCount(
            savedCount
          );

  return (
    <div
      className={`min-w-0 ${className}`}
    >
      <button
        type="button"
        aria-pressed={
          isSaved === true
        }
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={() =>
          void toggleSavedDoctor()
        }
        disabled={
          isLoading ||
          isUpdating
        }
        className={`romdoc-focus-ring inline-flex items-center justify-center gap-2 rounded-xl border font-semibold transition disabled:cursor-wait disabled:opacity-60 ${
          compact
            ? "h-10 w-10 p-0"
            : "px-4 py-2 text-sm"
        } ${
          isSaved
            ? "border-[#036661] bg-[#036661] text-white hover:border-[#ff2800] hover:bg-[#ff2800]"
            : "border-gray-300 bg-white text-gray-800 hover:border-[#036661] hover:text-[#036661]"
        }`}
      >
        <HeartIcon
          filled={
            isSaved === true
          }
        />

        {!compact && (
          <span>
            {isLoading
              ? "..."
              : buttonLabel}
          </span>
        )}
      </button>

      {showSavedCount &&
        countLabel && (
          <p className="mt-2 text-xs leading-5 text-gray-500">
            {countLabel}
          </p>
        )}

      {error && (
        <p
          role="alert"
          className="mt-2 max-w-xs text-xs leading-5 text-red-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}
