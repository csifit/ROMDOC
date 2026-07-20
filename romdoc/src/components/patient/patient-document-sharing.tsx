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

import {
  type AppLocale,
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type DoctorOption = {
  id: string;
  name: string;
};

type Share = {
  id: string;
  doctor_id: string;
  doctor_name: string;
  expires_at: string | null;
  revoked_at: string | null;
  active: boolean;
};

type AuditEvent = {
  id: string;
  event_type: string;
  actor_role: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

type ResponsePayload = {
  doctors?: DoctorOption[];
  shares?: Share[];
  uploaderDoctorId?: string;
  events?: AuditEvent[];
  error?: string;
};

type Props = {
  documentId: string;
};

const EVENT_KEYS = [
  "created",
  "shared",
  "share_revoked",
  "viewed",
  "downloaded",
  "soft_deleted",
] as const;

const ROLE_KEYS = [
  "patient",
  "doctor",
  "staff",
  "admin",
  "system",
] as const;

const INTL_LOCALE:
  Record<AppLocale, string> = {
    ro: "ro-RO",
    en: "en-GB",
    de: "de-DE",
  };

function formatDate(
  value: string,
  locale: AppLocale
) {
  return new Intl.DateTimeFormat(
    INTL_LOCALE[locale],
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    new Date(value)
  );
}

export default function PatientDocumentSharing({
  documentId,
}: Props) {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "PatientPages.folder.sharing"
    );

  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    doctors,
    setDoctors,
  ] = useState<DoctorOption[]>([]);

  const [
    shares,
    setShares,
  ] = useState<Share[]>([]);

  const [
    events,
    setEvents,
  ] = useState<AuditEvent[]>([]);

  const [
    doctorId,
    setDoctorId,
  ] = useState("");

  const [
    expiresAt,
    setExpiresAt,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const eventLabels =
    useMemo(
      () =>
        Object.fromEntries(
          EVENT_KEYS.map(
            (key) => [
              key,
              t(
                `events.${key}`
              ),
            ]
          )
        ) as Record<
          string,
          string
        >,
      [t]
    );

  const roleLabels =
    useMemo(
      () =>
        Object.fromEntries(
          ROLE_KEYS.map(
            (key) => [
              key,
              t(
                `roles.${key}`
              ),
            ]
          )
        ) as Record<
          string,
          string
        >,
      [t]
    );

  async function load() {
    setError("");

    try {
      const [
        shareResponse,
        auditResponse,
      ] =
        await Promise.all([
          fetch(
            `/api/patient/folder/shares?documentId=${encodeURIComponent(
              documentId
            )}`,
            {
              cache:
                "no-store",
            }
          ),
          fetch(
            `/api/patient/folder/audit?documentId=${encodeURIComponent(
              documentId
            )}`,
            {
              cache:
                "no-store",
            }
          ),
        ]);

      const sharePayload =
        (await shareResponse.json()) as
          ResponsePayload;

      const auditPayload =
        (await auditResponse.json()) as
          ResponsePayload;

      if (!shareResponse.ok) {
        throw new Error(
          locale === "ro" &&
          sharePayload.error
            ? sharePayload.error
            : t(
                "loadError"
              )
        );
      }

      setDoctors(
        sharePayload.doctors ?? []
      );

      setShares(
        sharePayload.shares ?? []
      );

      if (auditResponse.ok) {
        setEvents(
          auditPayload.events ?? []
        );
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t(
              "loadError"
            )
      );
    }
  }

  useEffect(() => {
    if (open) {
      void load();
    }
  }, [open]);

  async function createShare() {
    if (!doctorId) {
      setError(
        t(
          "selectDoctorError"
        )
      );
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/patient/folder/shares",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              documentId,
              doctorId,
              expiresAt:
                expiresAt
                  ? new Date(
                      `${expiresAt}T23:59:59`
                    ).toISOString()
                  : null,
            }),
          }
        );

      const payload =
        (await response.json()) as
          ResponsePayload;

      if (!response.ok) {
        throw new Error(
          locale === "ro" &&
          payload.error
            ? payload.error
            : t(
                "shareError"
              )
        );
      }

      setDoctorId("");
      setExpiresAt("");
      await load();
    } catch (shareError) {
      setError(
        shareError instanceof Error
          ? shareError.message
          : t(
              "shareError"
            )
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function revokeShare(
    shareId: string
  ) {
    setIsSaving(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/patient/folder/shares",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              shareId,
            }),
          }
        );

      const payload =
        (await response.json()) as
          ResponsePayload;

      if (!response.ok) {
        throw new Error(
          locale === "ro" &&
          payload.error
            ? payload.error
            : t(
                "revokeError"
              )
        );
      }

      await load();
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : t(
              "revokeError"
            )
      );
    } finally {
      setIsSaving(false);
    }
  }

  const activeShares =
    shares.filter(
      (share) =>
        share.active
    );

  return (
    <div className="mt-[21px] border-t border-gray-200 pt-[21px]">
      <button
        type="button"
        onClick={() =>
          setOpen(
            (value) =>
              !value
          )
        }
        className="romdoc-button romdoc-button-secondary romdoc-button-sm"
      >
        {open
          ? t(
              "hide"
            )
          : t(
              "show"
            )}
      </button>

      {open && (
        <div className="mt-[13px] space-y-[21px]">
          <div className="rounded-[13px] bg-gray-50 p-[13px]">
            <h3 className="font-semibold text-gray-900">
              {t(
                "shareTitle"
              )}
            </h3>

            <p className="mt-[5px] text-xs leading-5 text-gray-600">
              {t(
                "shareDescription"
              )}
            </p>

            <div className="mt-[13px] grid gap-[13px] sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">
                  {t(
                    "doctorLabel"
                  )}
                </span>

                <select
                  value={doctorId}
                  onChange={(event) =>
                    setDoctorId(
                      event.target.value
                    )
                  }
                  className="romdoc-focus-ring mt-[5px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[8px] text-sm"
                >
                  <option value="">
                    {t(
                      "selectDoctor"
                    )}
                  </option>

                  {doctors.map(
                    (doctor) => (
                      <option
                        key={doctor.id}
                        value={doctor.id}
                      >
                        {doctor.name}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-gray-600">
                  {t(
                    "expirationLabel"
                  )}
                </span>

                <input
                  type="date"
                  value={expiresAt}
                  min={
                    new Date()
                      .toISOString()
                      .split("T")[0]
                  }
                  onChange={(event) =>
                    setExpiresAt(
                      event.target.value
                    )
                  }
                  className="romdoc-focus-ring mt-[5px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[8px] text-sm"
                />
              </label>
            </div>

            <button
              type="button"
              disabled={
                isSaving ||
                !doctorId
              }
              onClick={() =>
                void createShare()
              }
              className="romdoc-button romdoc-button-primary romdoc-button-sm mt-[13px]"
            >
              {t(
                "shareButton"
              )}
            </button>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">
              {t(
                "accessGranted"
              )}
            </h3>

            <div className="mt-[13px] space-y-[8px]">
              {activeShares.length === 0 ? (
                <p className="text-sm text-gray-600">
                  {t(
                    "noShares"
                  )}
                </p>
              ) : (
                activeShares.map(
                  (share) => (
                    <div
                      key={share.id}
                      className="flex flex-wrap items-center justify-between gap-[13px] rounded-[13px] border border-gray-200 p-[13px]"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {
                            share.doctor_name
                          }
                        </p>

                        <p className="mt-[5px] text-xs text-gray-500">
                          {share.expires_at
                            ? t(
                                "expiresAt",
                                {
                                  date:
                                    formatDate(
                                      share.expires_at,
                                      locale
                                    ),
                                }
                              )
                            : t(
                                "noExpiration"
                              )}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={
                          isSaving
                        }
                        onClick={() =>
                          void revokeShare(
                            share.id
                          )
                        }
                        className="text-sm font-semibold text-red-700 hover:underline"
                      >
                        {t(
                          "revoke"
                        )}
                      </button>
                    </div>
                  )
                )
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">
              {t(
                "history"
              )}
            </h3>

            {events.length === 0 ? (
              <p className="mt-[13px] text-sm text-gray-600">
                {t(
                  "noHistory"
                )}
              </p>
            ) : (
              <ol className="mt-[13px] space-y-[13px] border-l-2 border-gray-200 pl-[21px]">
                {events.map(
                  (event) => (
                    <li
                      key={event.id}
                      className="relative"
                    >
                      <span className="absolute -left-[27px] top-[5px] h-[13px] w-[13px] rounded-full border-2 border-white bg-[#036661]" />

                      <p className="text-sm font-semibold text-gray-900">
                        {eventLabels[
                          event.event_type
                        ] ??
                          event.event_type}
                      </p>

                      <p className="mt-[5px] text-xs text-gray-500">
                        {formatDate(
                          event.created_at,
                          locale
                        )}
                        {" · "}
                        {roleLabels[
                          event.actor_role
                        ] ??
                          event.actor_role}
                      </p>

                      {typeof event.metadata
                        ?.doctor_name ===
                        "string" && (
                        <p className="mt-[5px] text-xs text-gray-600">
                          {
                            event.metadata
                              .doctor_name
                          }
                        </p>
                      )}
                    </li>
                  )
                )}
              </ol>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
            >
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
