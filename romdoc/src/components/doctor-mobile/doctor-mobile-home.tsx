"use client";

import Link from "next/link";
import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  useEffect,
  useState,
} from "react";

import {
  type DoctorDeviceApiError,
  type DoctorDeviceMutationResponse,
  type DoctorMobileDeviceResponse,
} from "@/lib/doctor-linked-devices";
import {
  type AppLocale,
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type MobilePayload =
  | DoctorMobileDeviceResponse
  | DoctorDeviceMutationResponse
  | DoctorDeviceApiError;

const INTL_LOCALE:
  Record<AppLocale, string> = {
    ro: "ro-RO",
    en: "en-GB",
    de: "de-DE",
  };

function isApiError(
  payload: MobilePayload
): payload is DoctorDeviceApiError {
  return (
    "error" in payload &&
    typeof payload.error ===
      "string"
  );
}

function formatDateTime(
  value: string,
  locale: AppLocale
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    INTL_LOCALE[locale],
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

export default function DoctorMobileHome() {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "DoctorLinkedDevices.mobile"
    );

  const [
    device,
    setDevice,
  ] = useState<
    DoctorMobileDeviceResponse |
    null
  >(null);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRemoving,
    setIsRemoving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    let cancelled =
      false;

    async function loadDevice() {
      try {
        const response =
          await fetch(
            "/api/doctor/mobile/device",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const payload =
          await response
            .json() as
            MobilePayload;

        if (
          !response.ok ||
          isApiError(payload) ||
          !("linked" in payload)
        ) {
          throw new Error(
            isApiError(payload)
              ? payload.message
              : t("errors.notLinked")
          );
        }

        if (!cancelled) {
          setDevice(payload);
        }
      } catch (
        loadError
      ) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : t("errors.notLinked")
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDevice();

    return () => {
      cancelled = true;
    };
  }, [t]);

  async function removeCurrentDevice() {
    const confirmed =
      window.confirm(
        t("removeConfirm")
      );

    if (!confirmed) {
      return;
    }

    setIsRemoving(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/doctor/mobile/device",
          {
            method: "DELETE",
            cache: "no-store",
          }
        );

      const payload =
        await response
          .json() as
          MobilePayload;

      if (
        !response.ok ||
        isApiError(payload)
      ) {
        throw new Error(
          isApiError(payload)
            ? payload.message
            : t("errors.remove")
        );
      }

      setDevice(null);
      setError(
        t("removed")
      );
    } catch (
      removeError
    ) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : t("errors.remove")
      );
    } finally {
      setIsRemoving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#F0EEE9] px-[13px] py-[55px]">
        <div className="mx-auto max-w-xl rounded-[21px] border border-gray-200 bg-white p-[34px] text-center shadow-sm">
          <div className="mx-auto h-[34px] w-[34px] animate-spin rounded-full border-4 border-[#036661]/20 border-t-[#036661]" />
          <p className="mt-[21px] text-sm font-semibold text-gray-700">
            {t("loading")}
          </p>
        </div>
      </main>
    );
  }

  if (!device) {
    return (
      <main className="min-h-screen bg-[#F0EEE9] px-[13px] py-[34px] sm:px-[21px] sm:py-[55px]">
        <div className="mx-auto max-w-xl rounded-[21px] border border-gray-200 bg-white p-[21px] text-center shadow-sm sm:p-[34px]">
          <p className="text-sm font-semibold text-[#036661]">
            RomDoc
          </p>
          <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
            {t("notLinkedTitle")}
          </h1>
          <p className="mt-[13px] text-sm leading-6 text-gray-600">
            {error ||
              t(
                "notLinkedDescription"
              )}
          </p>

          <Link
            href={`/login?locale=${locale}&next=${encodeURIComponent(
              "/doctor-dashboard/devices"
            )}`}
            className="romdoc-button romdoc-button-primary mt-[21px]"
          >
            {t("openDashboard")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-[13px] py-[34px] sm:px-[21px] sm:py-[55px]">
      <div className="mx-auto max-w-xl space-y-[21px]">
        <header className="rounded-[21px] border border-emerald-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
          <div className="flex items-center justify-between gap-[13px]">
            <div>
              <p className="text-sm font-semibold text-[#036661]">
                RomDoc
              </p>
              <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
                {t("title")}
              </h1>
            </div>

            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-[10px] py-[5px] text-xs font-bold text-emerald-800">
              {t("active")}
            </span>
          </div>

          <p className="mt-[13px] text-sm leading-6 text-gray-600">
            {t(
              "connectedFor",
              {
                doctor:
                  device.doctor.name,
              }
            )}
          </p>

          <dl className="mt-[21px] grid gap-[13px] border-t border-gray-200 pt-[17px] text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">
                {t("deviceName")}
              </dt>
              <dd className="mt-[5px] font-semibold text-gray-900">
                {device.device.name}
              </dd>
            </div>

            <div>
              <dt className="text-gray-500">
                {t("linkedAt")}
              </dt>
              <dd className="mt-[5px] font-semibold text-gray-900">
                {formatDateTime(
                  device.device
                    .linkedAt,
                  locale
                )}
              </dd>
            </div>

            <div>
              <dt className="text-gray-500">
                {t("credentialHint")}
              </dt>
              <dd className="mt-[5px] font-mono text-xs font-semibold text-gray-900">
                …{device.device
                  .credentialHint}
              </dd>
            </div>
          </dl>
        </header>

        <section className="rounded-[21px] border border-blue-200 bg-blue-50 p-[21px] shadow-sm">
          <h2 className="text-xl font-bold text-blue-950">
            {t("scannerTitle")}
          </h2>
          <p className="mt-[8px] text-sm leading-6 text-blue-900">
            {t("scannerDescription")}
          </p>
          <button
            type="button"
            disabled
            className="romdoc-button romdoc-button-secondary mt-[17px] cursor-not-allowed opacity-60"
          >
            {t("scannerComing")}
          </button>
        </section>

        <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            {t("securityTitle")}
          </h2>
          <p className="mt-[8px] text-sm leading-6 text-gray-600">
            {t("securityDescription")}
          </p>

          {error && (
            <div
              role="alert"
              className="mt-[13px] rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
            >
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              void removeCurrentDevice()
            }
            disabled={isRemoving}
            className="romdoc-button romdoc-button-secondary mt-[17px] border-red-200 text-red-700 hover:bg-red-50"
          >
            {isRemoving
              ? t("removing")
              : t("remove")}
          </button>
        </section>
      </div>
    </main>
  );
}
