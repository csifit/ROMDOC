"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import QRCode from "qrcode";

import {
  DOCTOR_DEVICE_LIMIT,
  type DoctorDeviceApiError,
  type DoctorDeviceBulkMutationResponse,
  type DoctorDeviceMutationResponse,
  type DoctorDevicePairingResponse,
  type DoctorLinkedDeviceListItem,
  type DoctorLinkedDeviceListResponse,
} from "@/lib/doctor-linked-devices";
import {
  type AppLocale,
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type PairingState = {
  pairingUrl: string;
  qrDataUrl: string;
  tokenHint: string;
  expiresAt: string;
};

type DevicesPayload =
  | DoctorLinkedDeviceListResponse
  | DoctorDeviceApiError;

type MutationPayload =
  | DoctorDevicePairingResponse
  | DoctorDeviceMutationResponse
  | DoctorDeviceBulkMutationResponse
  | DoctorDeviceApiError;

const INTL_LOCALE:
  Record<AppLocale, string> = {
    ro: "ro-RO",
    en: "en-GB",
    de: "de-DE",
  };

function isApiError(
  payload:
    DevicesPayload |
    MutationPayload
): payload is DoctorDeviceApiError {
  return (
    "error" in payload &&
    typeof payload.error ===
      "string"
  );
}

function formatDateTime(
  value: string | null,
  locale: AppLocale
) {
  if (!value) {
    return "—";
  }

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

function secondsUntil(
  value: string
) {
  const difference =
    new Date(value)
      .getTime() -
    Date.now();

  return Math.max(
    0,
    Math.ceil(
      difference / 1000
    )
  );
}

export default function DoctorLinkedDevicesManager() {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "DoctorLinkedDevices.dashboard"
    );

  const [
    devices,
    setDevices,
  ] = useState<
    DoctorLinkedDeviceListItem[]
  >([]);

  const [
    activeDeviceCount,
    setActiveDeviceCount,
  ] = useState(0);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    isGenerating,
    setIsGenerating,
  ] = useState(false);

  const [
    revokingDeviceId,
    setRevokingDeviceId,
  ] = useState<
    string | null
  >(null);

  const [
    isRevokingAll,
    setIsRevokingAll,
  ] = useState(false);

  const [
    pairing,
    setPairing,
  ] = useState<
    PairingState |
    null
  >(null);

  const [
    pairingSeconds,
    setPairingSeconds,
  ] = useState(0);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    let cancelled =
      false;

    async function loadInitialDevices() {
      try {
        const response =
          await fetch(
            "/api/doctor/devices",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const payload =
          await response
            .json() as
            DevicesPayload;

        if (
          !response.ok ||
          isApiError(payload)
        ) {
          throw new Error(
            isApiError(payload)
              ? payload.message
              : t("errors.load")
          );
        }

        if (!cancelled) {
          setDevices(
            payload.devices
          );
          setActiveDeviceCount(
            payload.activeDeviceCount
          );
        }
      } catch (
        loadError
      ) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : t("errors.load")
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialDevices();

    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    if (!pairing) {
      return;
    }

    const interval =
      window.setInterval(
        () => {
          const remaining =
            secondsUntil(
              pairing.expiresAt
            );

          setPairingSeconds(
            remaining
          );

          if (remaining === 0) {
            window.clearInterval(
              interval
            );
          }
        },
        1000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [pairing]);

  const activeDevices =
    useMemo(
      () =>
        devices.filter(
          (device) =>
            device.status ===
            "active"
        ),
      [devices]
    );

  const revokedDevices =
    useMemo(
      () =>
        devices.filter(
          (device) =>
            device.status ===
            "revoked"
        ),
      [devices]
    );

  async function refreshDevices() {
    setIsRefreshing(true);
    setError("");
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/doctor/devices",
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const payload =
        await response
          .json() as
          DevicesPayload;

      if (
        !response.ok ||
        isApiError(payload)
      ) {
        throw new Error(
          isApiError(payload)
            ? payload.message
            : t("errors.load")
        );
      }

      setDevices(
        payload.devices
      );
      setActiveDeviceCount(
        payload.activeDeviceCount
      );
      setMessage(
        t("messages.refreshed")
      );

      if (
        payload.activeDeviceCount >
        activeDeviceCount
      ) {
        setPairing(null);
        setPairingSeconds(0);
      }
    } catch (
      refreshError
    ) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : t("errors.load")
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function generatePairing() {
    setIsGenerating(true);
    setError("");
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/doctor/devices",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                action:
                  "create_pairing",
              }),
          }
        );

      const payload =
        await response
          .json() as
          MutationPayload;

      if (
        !response.ok ||
        isApiError(payload) ||
        !("pairingUrl" in payload)
      ) {
        throw new Error(
          isApiError(payload)
            ? payload.message
            : t(
                "errors.generate"
              )
        );
      }

      const qrDataUrl =
        await QRCode.toDataURL(
          payload.pairingUrl,
          {
            width: 280,
            margin: 2,
            errorCorrectionLevel:
              "M",
          }
        );

      setPairing({
        pairingUrl:
          payload.pairingUrl,
        qrDataUrl,
        tokenHint:
          payload.tokenHint,
        expiresAt:
          payload.expiresAt,
      });

      setPairingSeconds(
        secondsUntil(
          payload.expiresAt
        )
      );

      setMessage(
        t(
          "messages.pairingCreated"
        )
      );
    } catch (
      generateError
    ) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : t(
              "errors.generate"
            )
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function revokeDevice(
    device:
      DoctorLinkedDeviceListItem
  ) {
    const confirmed =
      window.confirm(
        t(
          "revoke.confirm",
          {
            name:
              device.deviceName,
          }
        )
      );

    if (!confirmed) {
      return;
    }

    setRevokingDeviceId(
      device.id
    );
    setError("");
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/doctor/devices",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                action: "revoke",
                deviceId:
                  device.id,
              }),
          }
        );

      const payload =
        await response
          .json() as
          MutationPayload;

      if (
        !response.ok ||
        isApiError(payload)
      ) {
        throw new Error(
          isApiError(payload)
            ? payload.message
            : t(
                "errors.revoke"
              )
        );
      }

      const revokedAt =
        new Date()
          .toISOString();

      setDevices(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              device.id
                ? {
                    ...item,
                    status:
                      "revoked",
                    revokedAt,
                  }
                : item
          )
      );

      setActiveDeviceCount(
        (current) =>
          Math.max(
            0,
            current - 1
          )
      );

      setMessage(
        t(
          "messages.revoked",
          {
            name:
              device.deviceName,
          }
        )
      );
    } catch (
      revokeError
    ) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : t(
              "errors.revoke"
            )
      );
    } finally {
      setRevokingDeviceId(
        null
      );
    }
  }

  async function revokeAllDevices() {
    const confirmed =
      window.confirm(
        t("revokeAll.confirm")
      );

    if (!confirmed) {
      return;
    }

    setIsRevokingAll(true);
    setError("");
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/doctor/devices",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                action:
                  "revoke_all",
              }),
          }
        );

      const payload =
        await response
          .json() as
          MutationPayload;

      if (
        !response.ok ||
        isApiError(payload)
      ) {
        throw new Error(
          isApiError(payload)
            ? payload.message
            : t(
                "errors.revokeAll"
              )
        );
      }

      const revokedAt =
        new Date()
          .toISOString();

      setDevices(
        (current) =>
          current.map(
            (item) =>
              item.status ===
              "active"
                ? {
                    ...item,
                    status:
                      "revoked",
                    revokedAt,
                  }
                : item
          )
      );
      setActiveDeviceCount(0);
      setPairing(null);
      setPairingSeconds(0);
      setMessage(
        t("messages.revokedAll")
      );
    } catch (
      revokeError
    ) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : t(
              "errors.revokeAll"
            )
      );
    } finally {
      setIsRevokingAll(false);
    }
  }

  const canGenerate =
    activeDeviceCount <
    DOCTOR_DEVICE_LIMIT;

  return (
    <section className="space-y-[34px]">
      <header className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
        <p className="text-sm font-semibold text-[#036661]">
          {t("eyebrow")}
        </p>

        <div className="mt-[8px] flex flex-col justify-between gap-[13px] sm:flex-row sm:items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t("title")}
            </h1>

            <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
              {t("description")}
            </p>
          </div>

          <div className="rounded-[13px] border border-gray-200 bg-gray-50 px-[13px] py-[8px] text-sm font-semibold text-gray-700">
            {t(
              "activeCount",
              {
                count:
                  activeDeviceCount,
                maximum:
                  DOCTOR_DEVICE_LIMIT,
              }
            )}
          </div>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="rounded-[13px] border border-emerald-200 bg-emerald-50 p-[13px] text-sm text-emerald-800"
        >
          {message}
        </div>
      )}

      <div className="grid gap-[21px] lg:grid-cols-[minmax(0,1fr)_377px]">
        <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
          <h2 className="text-2xl font-bold text-gray-900">
            {t("pairing.title")}
          </h2>

          <p className="mt-[8px] text-sm leading-6 text-gray-600">
            {t("pairing.description")}
          </p>

          <ol className="mt-[21px] space-y-[8px] text-sm leading-6 text-gray-700">
            <li>{t("pairing.steps.signIn")}</li>
            <li>{t("pairing.steps.generate")}</li>
            <li>{t("pairing.steps.scan")}</li>
            <li>{t("pairing.steps.confirm")}</li>
          </ol>

          <div className="mt-[21px] flex flex-wrap gap-[8px]">
            <button
              type="button"
              onClick={() =>
                void generatePairing()
              }
              disabled={
                isGenerating ||
                !canGenerate
              }
              className="romdoc-button romdoc-button-primary"
            >
              {isGenerating
                ? t(
                    "pairing.generating"
                  )
                : pairing
                  ? t(
                      "pairing.replace"
                    )
                  : t(
                      "pairing.generate"
                    )}
            </button>

            <button
              type="button"
              onClick={() =>
                void refreshDevices()
              }
              disabled={
                isRefreshing
              }
              className="romdoc-button romdoc-button-secondary"
            >
              {isRefreshing
                ? t(
                    "actions.refreshing"
                  )
                : t(
                    "actions.refresh"
                  )}
            </button>

            {activeDeviceCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  void revokeAllDevices()
                }
                disabled={
                  isRevokingAll
                }
                className="romdoc-button romdoc-button-secondary border-red-200 text-red-700 hover:bg-red-50"
              >
                {isRevokingAll
                  ? t(
                      "revokeAll.revoking"
                    )
                  : t(
                      "revokeAll.action"
                    )}
              </button>
            )}
          </div>

          {!canGenerate && (
            <p className="mt-[13px] rounded-[13px] border border-amber-200 bg-amber-50 p-[13px] text-sm leading-6 text-amber-900">
              {t("pairing.limitReached")}
            </p>
          )}

          {pairing && (
            <div className="mt-[21px] rounded-[17px] border border-[#036661]/20 bg-[#036661]/5 p-[17px]">
              {pairingSeconds > 0 ? (
                <>
                  <div className="flex flex-col items-center">
                    <img
                      src={
                        pairing.qrDataUrl
                      }
                      alt={t(
                        "pairing.qrAlt"
                      )}
                      width={280}
                      height={280}
                      className="h-auto w-full max-w-[280px] rounded-[13px] border border-gray-200 bg-white"
                    />

                    <p className="mt-[13px] text-center text-sm font-bold text-[#036661]">
                      {t(
                        "pairing.expiresIn",
                        {
                          seconds:
                            pairingSeconds,
                        }
                      )}
                    </p>

                    <p className="mt-[5px] text-center text-xs text-gray-500">
                      {t(
                        "pairing.tokenHint",
                        {
                          hint:
                            pairing.tokenHint,
                        }
                      )}
                    </p>
                  </div>

                  <p className="mt-[13px] text-xs leading-5 text-gray-600">
                    {t(
                      "pairing.securityNotice"
                    )}
                  </p>
                </>
              ) : (
                <div className="text-sm leading-6 text-amber-900">
                  <p className="font-bold">
                    {t(
                      "pairing.expiredTitle"
                    )}
                  </p>
                  <p className="mt-[5px]">
                    {t(
                      "pairing.expiredDescription"
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        <aside className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            {t("security.title")}
          </h2>

          <ul className="mt-[13px] space-y-[8px] text-sm leading-6 text-gray-600">
            <li>{t("security.hash")}</li>
            <li>{t("security.cookie")}</li>
            <li>{t("security.revocation")}</li>
            <li>{t("security.viewOnly")}</li>
          </ul>

          <div className="mt-[21px] rounded-[13px] border border-blue-200 bg-blue-50 p-[13px] text-xs leading-5 text-blue-900">
            {t("security.scannerNext")}
          </div>
        </aside>
      </div>

      <section>
        <div className="flex flex-col justify-between gap-[8px] sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-[#036661]">
              {t("list.eyebrow")}
            </p>
            <h2 className="mt-[5px] text-2xl font-bold text-gray-900">
              {t("list.title")}
            </h2>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-[21px] rounded-[21px] border border-gray-200 bg-white p-[34px] text-sm text-gray-600 shadow-sm">
            {t("list.loading")}
          </div>
        ) : activeDevices.length ===
          0 ? (
          <div className="mt-[21px] rounded-[21px] border border-gray-200 bg-white p-[34px] shadow-sm">
            <h3 className="text-xl font-bold text-gray-900">
              {t("list.emptyTitle")}
            </h3>
            <p className="mt-[8px] text-sm leading-6 text-gray-600">
              {t("list.emptyDescription")}
            </p>
          </div>
        ) : (
          <div className="mt-[21px] grid gap-[13px] md:grid-cols-2">
            {activeDevices.map(
              (device) => (
                <article
                  key={device.id}
                  className="rounded-[21px] border border-emerald-200 bg-white p-[21px] shadow-sm"
                >
                  <div className="flex items-start justify-between gap-[13px]">
                    <div>
                      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-[10px] py-[5px] text-xs font-bold text-emerald-800">
                        {t("statuses.active")}
                      </span>
                      <h3 className="mt-[13px] text-xl font-bold text-gray-900">
                        {device.deviceName}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void revokeDevice(
                          device
                        )
                      }
                      disabled={
                        revokingDeviceId ===
                        device.id
                      }
                      className="romdoc-button romdoc-button-secondary romdoc-button-sm border-red-200 text-red-700 hover:bg-red-50"
                    >
                      {revokingDeviceId ===
                      device.id
                        ? t(
                            "revoke.revoking"
                          )
                        : t(
                            "revoke.action"
                          )}
                    </button>
                  </div>

                  <dl className="mt-[21px] grid gap-[13px] border-t border-gray-200 pt-[17px] text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-gray-500">
                        {t("labels.linkedAt")}
                      </dt>
                      <dd className="mt-[5px] font-semibold text-gray-900">
                        {formatDateTime(
                          device.linkedAt,
                          locale
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-gray-500">
                        {t("labels.lastUsed")}
                      </dt>
                      <dd className="mt-[5px] font-semibold text-gray-900">
                        {device.lastUsedAt
                          ? formatDateTime(
                              device.lastUsedAt,
                              locale
                            )
                          : t(
                              "labels.neverUsed"
                            )}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-gray-500">
                        {t("labels.credentialHint")}
                      </dt>
                      <dd className="mt-[5px] font-mono text-xs font-semibold text-gray-900">
                        …{device.credentialHint}
                      </dd>
                    </div>
                  </dl>

                  {device.userAgentSummary && (
                    <p className="mt-[13px] break-words text-xs leading-5 text-gray-500">
                      {device.userAgentSummary}
                    </p>
                  )}
                </article>
              )
            )}
          </div>
        )}
      </section>

      {revokedDevices.length > 0 && (
        <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
          <h2 className="text-xl font-bold text-gray-900">
            {t("revoked.title")}
          </h2>

          <div className="mt-[13px] divide-y divide-gray-200">
            {revokedDevices.map(
              (device) => (
                <div
                  key={device.id}
                  className="flex flex-col justify-between gap-[8px] py-[13px] sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-semibold text-gray-800">
                      {device.deviceName}
                    </p>
                    <p className="mt-[3px] text-xs text-gray-500">
                      {t(
                        "revoked.revokedAt",
                        {
                          date:
                            formatDateTime(
                              device.revokedAt,
                              locale
                            ),
                        }
                      )}
                    </p>
                  </div>

                  <span className="w-fit rounded-full border border-gray-200 bg-gray-100 px-[10px] py-[5px] text-xs font-bold text-gray-700">
                    {t("statuses.revoked")}
                  </span>
                </div>
              )
            )}
          </div>
        </section>
      )}
    </section>
  );
}
