"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import {
  useEffect,
  useState,
} from "react";

import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

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

function HeartIcon({
  filled,
}: {
  filled: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-[21px] w-[21px] ${
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
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "PatientPages.savedDoctors.saveButton"
    );

  const router =
    useRouter();

  const pathname =
    usePathname();

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

        if (!response.ok) {
          if (
            response.status === 403
          ) {
            setIsSaved(false);
            return;
          }

          throw new Error(
            locale === "ro" &&
            payload.error
              ? payload.error
              : t(
                  "genericError"
                )
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
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
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
            : t(
                "genericError"
              )
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
    locale,
    t,
  ]);

  function redirectToLogin() {
    const currentUrl =
      typeof window !==
      "undefined"
        ? `${pathname}${window.location.search}${window.location.hash}`
        : pathname;

    const parameters =
      new URLSearchParams({
        locale,
        next:
          currentUrl,
      });

    router.push(
      `/login?${parameters.toString()}`
    );
  }

  async function toggleSavedDoctor() {
    if (isUpdating) {
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

      if (!response.ok) {
        throw new Error(
          locale === "ro" &&
          payload.error
            ? payload.error
            : t(
                "genericError"
              )
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
          : t(
              "genericError"
            )
      );
    } finally {
      setIsUpdating(false);
    }
  }

  const buttonLabel =
    isUpdating
      ? isSaved
        ? t(
            "removing"
          )
        : t(
            "saving"
          )
      : isSaved
        ? t(
            "saved"
          )
        : t(
            "save"
          );

  const ariaLabel =
    isSaved
      ? t(
          "removeAria",
          {
            doctor:
              doctorName,
          }
        )
      : t(
          "saveAria",
          {
            doctor:
              doctorName,
          }
        );

  const countLabel =
    savedCount === null ||
    savedCount <= 0
      ? null
      : savedCount < 5
        ? t(
            "genericCount"
          )
        : t(
            "preciseCount",
            {
              count:
                savedCount,
            }
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
        className={`romdoc-focus-ring inline-flex items-center justify-center gap-[8px] rounded-[13px] border font-semibold transition disabled:cursor-wait disabled:opacity-60 ${
          compact
            ? "h-[34px] w-[34px] p-0"
            : "px-[13px] py-[8px] text-sm"
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
          <p className="mt-[8px] text-xs leading-5 text-gray-500">
            {countLabel}
          </p>
        )}

      {error && (
        <p
          role="alert"
          className="mt-[8px] max-w-xs text-xs leading-5 text-red-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}
