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

import EmergencyMedicalSummary from "@/components/medical-folder/emergency-medical-summary";
import {
  isAnyMedicalFolderShareToken,
  isMedicalFolderDirectShareChannel,
  type DirectMedicalFolderShareError,
  type DirectMedicalFolderShareErrorCode,
  type DirectMedicalFolderShareResponse,
  type MedicalFolderDirectShareChannel,
} from "@/lib/medical-folder-share-grants";
import {
  calculateAge,
  type MedicalProfileEntry,
  type MedicalProfileValue,
  type OrganDonationPreference,
} from "@/lib/patient-medical-profile";
import {
  type AppLocale,
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

const INTL_LOCALE:
  Record<AppLocale, string> = {
    ro: "ro-RO",
    en: "en-GB",
    de: "de-DE",
  };

const ERROR_KEYS:
  Record<
    DirectMedicalFolderShareErrorCode,
    string
  > = {
    invalid_share_token:
      "errors.invalid",
    invalid_channel:
      "errors.invalid",
    share_grant_not_found:
      "errors.notFound",
    share_grant_revoked:
      "errors.revoked",
    share_grant_expired:
      "errors.expired",
    share_grant_consumed:
      "errors.consumed",
    share_disabled:
      "errors.disabled",
    share_open_failed:
      "errors.failed",
  };

function isApiError(
  payload:
    DirectMedicalFolderShareResponse |
    DirectMedicalFolderShareError
): payload is DirectMedicalFolderShareError {
  return (
    "error" in payload &&
    typeof payload.error ===
      "string"
  );
}

function formatDate(
  value: string,
  locale: AppLocale
) {
  const date =
    new Date(
      value.includes("T")
        ? value
        : `${value}T12:00:00`
    );

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
      dateStyle:
        "medium",
      timeStyle:
        value.includes("T")
          ? "short"
          : undefined,
    }
  ).format(date);
}

function formatFileSize(
  value: number,
  locale: AppLocale
) {
  if (
    !Number.isFinite(
      value
    ) ||
    value <= 0
  ) {
    return "";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
  ];

  let amount =
    value;
  let index =
    0;

  while (
    amount >= 1024 &&
    index <
      units.length - 1
  ) {
    amount /= 1024;
    index += 1;
  }

  return `${new Intl.NumberFormat(
    INTL_LOCALE[locale],
    {
      maximumFractionDigits:
        index === 0
          ? 0
          : 1,
    }
  ).format(amount)} ${units[index]}`;
}

function PublicProfile({
  entries,
  locale,
}: {
  entries:
    MedicalProfileEntry[];
  locale:
    AppLocale;
}) {
  const t =
    useTranslations(
      "PatientPages.folder.profile"
    );

  function valueText(
    entry:
      MedicalProfileEntry
  ) {
    const value:
      MedicalProfileValue =
        entry.value;

    switch (
      entry.fieldKey
    ) {
      case "date_of_birth": {
        const date =
          value.date ??
          "";

        if (!date) {
          return t(
            "notCompletedShort"
          );
        }

        const age =
          calculateAge(
            date
          );

        const formatted =
          formatDate(
            date,
            locale
          );

        return age ===
          null
          ? formatted
          : t(
              "dateWithAge",
              {
                date:
                  formatted,
                age,
              }
            );
      }

      case "sex":
        if (
          value.sex ===
          "male"
        ) {
          return t(
            "male"
          );
        }

        if (
          value.sex ===
          "female"
        ) {
          return t(
            "female"
          );
        }

        return t(
          "notCompletedShort"
        );

      case "blood_group": {
        const group =
          value.group ??
          "";
        const rh =
          value.rh ??
          "";

        if (
          !group ||
          group ===
            "unknown"
        ) {
          return t(
            "unknownFeminine"
          );
        }

        if (
          !rh ||
          rh ===
            "unknown"
        ) {
          return t(
            "rhUnknown",
            {
              group,
            }
          );
        }

        return `${group}${rh ===
          "positive"
          ? "+"
          : "-"}`;
      }

      case "emergency_contact":
        return [
          value.name,
          value.relationship,
          value.phone,
        ]
          .filter(Boolean)
          .join(" · ") ||
          t(
            "notCompletedShort"
          );

      case "family_doctor":
        return [
          value.name,
          value.clinic,
          value.phone,
        ]
          .filter(Boolean)
          .join(" · ") ||
          t(
            "notCompletedShort"
          );

      case "organ_donation_preference": {
        const preference =
          (
            value.preference ??
            "not_specified"
          ) as
            OrganDonationPreference;

        return t(
          `organDonation.values.${preference}`
        );
      }

      default:
        return (
          value.text
            ?.trim() ||
          t(
            "notCompletedShort"
          )
        );
    }
  }

  return (
    <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
      <h2 className="text-xl font-bold text-gray-900">
        {t(
          "title"
        )}
      </h2>

      <dl className="mt-[21px] grid gap-[13px] sm:grid-cols-2">
        {entries.map(
          (entry) => (
            <div
              key={
                entry.fieldKey
              }
              className="rounded-[13px] border border-gray-200 bg-gray-50 p-[17px]"
            >
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t(
                  `fields.${entry.fieldKey}`
                )}
              </dt>

              <dd className="mt-[8px] whitespace-pre-wrap text-sm leading-6 text-gray-900">
                {valueText(
                  entry
                )}
              </dd>
            </div>
          )
        )}
      </dl>
    </section>
  );
}

export default function PublicMedicalFolderShare() {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "MedicalFolderSharePublic"
    );

  const [
    payload,
    setPayload,
  ] = useState<
    DirectMedicalFolderShareResponse |
    null
  >(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  useEffect(() => {
    const parameters =
      new URLSearchParams(
        window.location.hash
          .replace(
            /^#/,
            ""
          )
      );

    const token =
      parameters.get(
        "token"
      ) ??
      "";

    const channelValue =
      parameters.get(
        "channel"
      );

    const channel:
      MedicalFolderDirectShareChannel =
        isMedicalFolderDirectShareChannel(
          channelValue
        )
          ? channelValue
          : "secure_link";

    window.history
      .replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`
      );

    if (
      !isAnyMedicalFolderShareToken(
        token
      )
    ) {
      setError(
        t(
          "errors.missing"
        )
      );
      setIsLoading(
        false
      );
      return;
    }

    async function openShare() {
      try {
        const response =
          await fetch(
            "/api/share/medical-folder",
            {
              method:
                "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              cache:
                "no-store",
              body:
                JSON.stringify({
                  token,
                  channel,
                }),
            }
          );

        const result =
          await response
            .json() as
            | DirectMedicalFolderShareResponse
            | DirectMedicalFolderShareError;

        if (
          !response.ok ||
          isApiError(
            result
          )
        ) {
          const key =
            isApiError(
              result
            )
              ? ERROR_KEYS[
                  result.error
                ]
              : "errors.failed";

          throw new Error(
            t(key)
          );
        }

        setPayload(
          result
        );
      } catch (
        openError
      ) {
        setError(
          openError instanceof Error
            ? openError.message
            : t(
                "errors.failed"
              )
        );
      } finally {
        setIsLoading(
          false
        );
      }
    }

    void openShare();
  }, [
    t,
  ]);

  const scopeTitle =
    useMemo(
      () =>
        payload
          ? t(
              `scopes.${payload.shareScope}`
            )
          : "",
      [
        payload,
        t,
      ]
    );

  if (
    isLoading
  ) {
    return (
      <main className="min-h-screen bg-[#F0EEE9] px-[13px] py-[55px] sm:px-[21px]">
        <div className="mx-auto max-w-4xl rounded-[21px] border border-gray-200 bg-white p-[34px] text-center shadow-sm">
          <div className="mx-auto h-[34px] w-[34px] animate-spin rounded-full border-4 border-[#036661]/20 border-t-[#036661]" />

          <p className="mt-[21px] text-sm font-semibold text-gray-700">
            {t(
              "loading"
            )}
          </p>
        </div>
      </main>
    );
  }

  if (
    error ||
    !payload
  ) {
    return (
      <main className="min-h-screen bg-[#F0EEE9] px-[13px] py-[55px] sm:px-[21px]">
        <div className="mx-auto max-w-2xl rounded-[21px] border border-red-200 bg-white p-[34px] text-center shadow-sm">
          <p className="text-sm font-semibold text-red-700">
            RomDoc
          </p>

          <h1 className="mt-[8px] text-2xl font-bold text-gray-900">
            {t(
              "errorTitle"
            )}
          </h1>

          <p className="mt-[13px] text-sm leading-6 text-gray-600">
            {error ||
              t(
                "errors.failed"
              )}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-[13px] py-[34px] sm:px-[21px] sm:py-[55px]">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
          <p className="text-sm font-semibold text-[#036661]">
            RomDoc
          </p>

          <h1 className="mt-[8px] text-2xl font-bold text-gray-900 sm:text-3xl">
            {scopeTitle}
          </h1>

          <p className="mt-[8px] text-sm leading-6 text-gray-600">
            {t(
              "sharedFor",
              {
                name:
                  payload.patient
                    .legalName ||
                  t(
                    "patientFallback"
                  ),
              }
            )}
          </p>

          <div className="mt-[17px] rounded-[13px] border border-amber-200 bg-amber-50 p-[13px] text-xs leading-5 text-amber-950">
            {t(
              payload.isPermanent
                ? "permanentReadOnlyNotice"
                : "readOnlyNotice"
            )}
          </div>

          <p className="mt-[13px] text-xs text-gray-500">
            {payload.isPermanent ||
            !payload.expiresAt
              ? t(
                  "permanentAccess"
                )
              : t(
                  "expires",
                  {
                    date:
                      formatDate(
                        payload.expiresAt,
                        locale
                      ),
                  }
                )}
          </p>
        </header>

        <div className="mt-[21px] grid gap-[21px]">
          {payload.shareScope ===
            "emergency_summary" ? (
            <div className="overflow-hidden rounded-[21px] border border-gray-200 bg-white shadow-sm">
              <EmergencyMedicalSummary
                entries={
                  payload.entries
                }
                patient={
                  payload.patient
                }
                locale={
                  locale
                }
              />
            </div>
          ) : payload.entries
              .length > 0 ? (
            <PublicProfile
              entries={
                payload.entries
              }
              locale={
                locale
              }
            />
          ) : null}

          {payload.documents
            .length > 0 && (
            <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
              <h2 className="text-xl font-bold text-gray-900">
                {t(
                  "documents.title"
                )}
              </h2>

              <div className="mt-[21px] grid gap-[13px]">
                {payload.documents.map(
                  (
                    document
                  ) => (
                    <article
                      key={
                        document.id
                      }
                      className="rounded-[13px] border border-gray-200 bg-gray-50 p-[17px]"
                    >
                      <div className="flex flex-col justify-between gap-[8px] sm:flex-row sm:items-start">
                        <div>
                          <h3 className="font-bold text-gray-900">
                            {
                              document.title
                            }
                          </h3>

                          <p className="mt-[5px] text-xs leading-5 text-gray-500">
                            {
                              document.doctorName
                            }
                            {" · "}
                            {formatDate(
                              document.createdAt,
                              locale
                            )}
                          </p>
                        </div>

                        <span className="w-fit rounded-full border border-gray-200 bg-white px-[10px] py-[5px] text-xs font-semibold text-gray-600">
                          {document.contentFormat ===
                            "text"
                            ? t(
                                "documents.text"
                              )
                            : t(
                                "documents.file"
                              )}
                        </span>
                      </div>

                      {document.description && (
                        <p className="mt-[13px] text-sm leading-6 text-gray-600">
                          {
                            document.description
                          }
                        </p>
                      )}

                      {document.contentFormat ===
                        "text" &&
                        document.contentText && (
                        <div className="mt-[13px] whitespace-pre-wrap rounded-[10px] border border-gray-200 bg-white p-[13px] text-sm leading-6 text-gray-900">
                          {
                            document.contentText
                          }
                        </div>
                      )}

                      {document.contentFormat ===
                        "file" && (
                        <div className="mt-[13px] flex flex-col justify-between gap-[8px] rounded-[10px] border border-gray-200 bg-white p-[13px] sm:flex-row sm:items-center">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {
                                document.originalFileName
                              }
                            </p>

                            <p className="mt-[3px] text-xs text-gray-500">
                              {formatFileSize(
                                document.fileSizeBytes,
                                locale
                              )}
                            </p>
                          </div>

                          {document.downloadUrl ? (
                            <a
                              href={
                                document.downloadUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="romdoc-button romdoc-button-primary romdoc-button-sm"
                            >
                              {t(
                                "documents.download"
                              )}
                            </a>
                          ) : (
                            <span className="text-xs font-semibold text-gray-500">
                              {t(
                                "documents.downloadDisabled"
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </article>
                  )
                )}
              </div>
            </section>
          )}

          {payload.documents
              .length === 0 &&
            payload.shareScope ===
              "selected_documents" && (
            <section className="rounded-[21px] border border-gray-200 bg-white p-[34px] text-center shadow-sm">
              <p className="text-sm text-gray-600">
                {t(
                  "documents.empty"
                )}
              </p>
            </section>
          )}
        </div>

        <footer className="py-[34px] text-center text-xs leading-5 text-gray-500">
          {t(
            "footer"
          )}
        </footer>
      </div>
    </main>
  );
}
