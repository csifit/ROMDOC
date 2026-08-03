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
  useRouter,
} from "next/navigation";

import {
  isDoctorDevicePairingToken,
  type DoctorDeviceApiError,
  type DoctorDevicePairingCompletionResponse,
} from "@/lib/doctor-linked-devices";
import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type PairingPayload =
  | DoctorDevicePairingCompletionResponse
  | DoctorDeviceApiError;

function isApiError(
  payload: PairingPayload
): payload is DoctorDeviceApiError {
  return (
    "error" in payload &&
    typeof payload.error ===
      "string"
  );
}

export default function DoctorDevicePairing() {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "DoctorLinkedDevices.pairingPage"
    );

  const router =
    useRouter();

  const [
    pairingToken,
    setPairingToken,
  ] = useState("");

  const [
    isReady,
    setIsReady,
  ] = useState(false);

  const [
    deviceName,
    setDeviceName,
  ] = useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    needsAuthentication,
    setNeedsAuthentication,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    const parameters =
      new URLSearchParams(
        window.location.hash
          .replace(/^#/, "")
      );

    const token =
      parameters.get("token") ??
      "";

    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`
    );

    queueMicrotask(() => {
      setPairingToken(token);
      setIsReady(true);
    });
  }, []);

  async function pairDevice() {
    if (
      !isDoctorDevicePairingToken(
        pairingToken
      )
    ) {
      setError(
        t("errors.invalid")
      );
      return;
    }

    setIsSubmitting(true);
    setNeedsAuthentication(false);
    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          "/api/doctor/devices/pair",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                pairingToken,
                deviceName,
              }),
          }
        );

      const payload =
        await response
          .json() as
          PairingPayload;

      if (
        response.status === 401
      ) {
        setNeedsAuthentication(true);
      }

      if (
        !response.ok ||
        isApiError(payload)
      ) {
        throw new Error(
          isApiError(payload)
            ? payload.message
            : t("errors.failed")
        );
      }

      setMessage(
        t(
          "messages.connected",
          {
            name:
              payload.device
                .deviceName,
          }
        )
      );

      window.setTimeout(
        () => {
          router.replace(
            "/doctor-mobile"
          );
          router.refresh();
        },
        700
      );
    } catch (
      pairingError
    ) {
      setError(
        pairingError instanceof Error
          ? pairingError.message
          : t("errors.failed")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isReady) {
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

  const validToken =
    isDoctorDevicePairingToken(
      pairingToken
    );

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-[13px] py-[34px] sm:px-[21px] sm:py-[55px]">
      <div className="mx-auto max-w-xl rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
        <p className="text-sm font-semibold text-[#036661]">
          RomDoc
        </p>

        <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
          {t("title")}
        </h1>

        <p className="mt-[13px] text-sm leading-6 text-gray-600">
          {t("description")}
        </p>

        {!validToken ? (
          <div className="mt-[21px] rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm leading-6 text-red-800">
            {t("errors.invalid")}
          </div>
        ) : (
          <>
            <label className="mt-[21px] block">
              <span className="text-sm font-semibold text-gray-800">
                {t("deviceNameLabel")}
              </span>

              <input
                type="text"
                value={deviceName}
                maxLength={80}
                onChange={(event: { target: { value: string } }) =>
                  setDeviceName(
                    event.target.value
                  )
                }
                placeholder={t(
                  "deviceNamePlaceholder"
                )}
                autoComplete="off"
                className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm"
              />

              <span className="mt-[8px] block text-xs leading-5 text-gray-500">
                {t("deviceNameHelp")}
              </span>
            </label>

            <div className="mt-[21px] rounded-[13px] border border-amber-200 bg-amber-50 p-[13px] text-xs leading-5 text-amber-950">
              {t("sameAccountNotice")}
            </div>

            {error && (
              <div
                role="alert"
                className="mt-[13px] rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
              >
                {error}
              </div>
            )}

            {message && (
              <div
                role="status"
                className="mt-[13px] rounded-[13px] border border-emerald-200 bg-emerald-50 p-[13px] text-sm text-emerald-800"
              >
                {message}
              </div>
            )}

            {needsAuthentication && (
              <div className="mt-[13px] rounded-[13px] border border-blue-200 bg-blue-50 p-[13px] text-sm leading-6 text-blue-900">
                <p>{t("signInNotice")}</p>
                <Link
                  href={`/login?locale=${locale}&next=${encodeURIComponent(
                    "/doctor-dashboard/devices"
                  )}`}
                  className="mt-[8px] inline-flex font-semibold text-[#036661] underline underline-offset-4"
                >
                  {t("signInAction")}
                </Link>
                <p className="mt-[8px] text-xs">
                  {t("signInRegenerate")}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                void pairDevice()
              }
              disabled={
                isSubmitting ||
                deviceName.trim()
                  .length < 2
              }
              className="romdoc-button romdoc-button-primary mt-[21px] w-full"
            >
              {isSubmitting
                ? t("connecting")
                : t("connect")}
            </button>
          </>
        )}

        <p className="mt-[21px] border-t border-gray-200 pt-[17px] text-xs leading-5 text-gray-500">
          {t("securityNotice")}
        </p>
      </div>
    </main>
  );
}
