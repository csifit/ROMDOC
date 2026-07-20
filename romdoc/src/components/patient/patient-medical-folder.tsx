"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import PatientDocumentSharing from "@/components/patient/patient-document-sharing";
import {
  type AppLocale,
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type DocumentType =
  | "consultation_note"
  | "prescription"
  | "laboratory_result"
  | "imaging_result"
  | "referral"
  | "medical_certificate"
  | "discharge_summary"
  | "other";

type MedicalDocument = {
  id: string;
  appointmentId: string | null;
  documentType: DocumentType;
  title: string;
  description: string | null;
  contentFormat: "file" | "text";
  contentText: string | null;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  createdAt: string;
  doctorName: string;
  appointmentDate: string | null;
  canDownload: boolean;
};

type FolderResponse = {
  documents?: MedicalDocument[];
  signedUrl?: string;
  expiresIn?: number;
  error?: string;
};

const DOCUMENT_TYPES:
  DocumentType[] = [
    "consultation_note",
    "prescription",
    "laboratory_result",
    "imaging_result",
    "referral",
    "medical_certificate",
    "discharge_summary",
    "other",
  ];

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
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(value)
  );
}

function formatAppointmentDate(
  value: string | null,
  locale: AppLocale
) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(
    INTL_LOCALE[locale],
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(
      `${value}T12:00:00`
    )
  );
}

function formatFileSize(
  bytes: number,
  locale: AppLocale
) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const formatter =
    new Intl.NumberFormat(
      INTL_LOCALE[locale],
      {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }
    );

  if (
    bytes <
    1024 * 1024
  ) {
    return `${formatter.format(
      bytes / 1024
    )} KB`;
  }

  return `${formatter.format(
    bytes /
      (1024 * 1024)
  )} MB`;
}

export default function PatientMedicalFolder() {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "PatientPages.folder.documents"
    );

  const [
    documents,
    setDocuments,
  ] = useState<
    MedicalDocument[]
  >([]);

  const [
    selectedType,
    setSelectedType,
  ] = useState<
    "all" | DocumentType
  >("all");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    downloadingId,
    setDownloadingId,
  ] = useState<
    string | null
  >(null);

  const [
    generatingPdfId,
    setGeneratingPdfId,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState("");

  const documentLabels =
    useMemo(
      () =>
        Object.fromEntries(
          DOCUMENT_TYPES.map(
            (type) => [
              type,
              t(
                `types.${type}`
              ),
            ]
          )
        ) as Record<
          DocumentType,
          string
        >,
      [t]
    );

  const filterOptions =
    useMemo(
      () => [
        {
          value:
            "all" as const,
          label:
            t(
              "all"
            ),
        },
        ...DOCUMENT_TYPES.map(
          (type) => ({
            value: type,
            label:
              documentLabels[
                type
              ],
          })
        ),
      ],
      [
        documentLabels,
        t,
      ]
    );

  const loadDocuments =
    useCallback(async () => {
      setIsLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            "/api/patient/folder",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const payload =
          (await response.json()) as
            FolderResponse;

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

        setDocuments(
          payload.documents ?? []
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : t(
                "loadError"
              )
        );
      } finally {
        setIsLoading(false);
      }
    }, [
      locale,
      t,
    ]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const visibleDocuments =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLocaleLowerCase(
            locale
          );

      return documents.filter(
        (document) => {
          if (
            selectedType !==
              "all" &&
            document.documentType !==
              selectedType
          ) {
            return false;
          }

          if (!normalizedSearch) {
            return true;
          }

          return [
            document.title,
            document.description,
            document.doctorName,
            document.originalFileName,
          ]
            .filter(Boolean)
            .some((value) =>
              value
                ?.toLocaleLowerCase(
                  locale
                )
                .includes(
                  normalizedSearch
                )
            );
        }
      );
    }, [
      documents,
      locale,
      search,
      selectedType,
    ]);

  async function downloadDocument(
    documentId: string
  ) {
    setDownloadingId(
      documentId
    );
    setError("");

    try {
      const response =
        await fetch(
          "/api/patient/folder",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              documentId,
            }),
          }
        );

      const payload =
        await response.json() as
          FolderResponse;

      if (
        !response.ok ||
        !payload.signedUrl
      ) {
        throw new Error(
          locale === "ro" &&
          payload.error
            ? payload.error
            : t(
                "downloadError"
              )
        );
      }

      window.location.assign(
        payload.signedUrl
      );
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : t(
              "downloadError"
            )
      );
    } finally {
      setDownloadingId(null);
    }
  }

  async function generatePdf(
    documentId: string,
    title: string
  ) {
    setGeneratingPdfId(
      documentId
    );
    setError("");

    try {
      const response =
        await fetch(
          "/api/medical-folder/pdf",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              documentId,
            }),
          }
        );

      if (!response.ok) {
        const payload =
          (await response.json()) as
            FolderResponse;

        throw new Error(
          locale === "ro" &&
          payload.error
            ? payload.error
            : t(
                "pdfError"
              )
        );
      }

      const blob =
        await response.blob();

      const url =
        URL.createObjectURL(
          blob
        );

      const anchor =
        document.createElement(
          "a"
        );

      anchor.href = url;
      anchor.download =
        `${title}.pdf`;

      document.body.appendChild(
        anchor
      );

      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (pdfError) {
      setError(
        pdfError instanceof Error
          ? pdfError.message
          : t(
              "pdfError"
            )
      );
    } finally {
      setGeneratingPdfId(null);
    }
  }

  return (
    <section className="mt-[34px]">
      <div className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <div className="grid gap-[13px] lg:grid-cols-[minmax(0,1fr)_377px]">
          <div>
            <label
              htmlFor="folder-search"
              className="text-sm font-semibold text-gray-800"
            >
              {t(
                "searchLabel"
              )}
            </label>

            <input
              id="folder-search"
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder={t(
                "searchPlaceholder"
              )}
              className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="folder-type"
              className="text-sm font-semibold text-gray-800"
            >
              {t(
                "typeLabel"
              )}
            </label>

            <select
              id="folder-type"
              value={selectedType}
              onChange={(event) =>
                setSelectedType(
                  event.target.value as
                    | "all"
                    | DocumentType
                )
              }
              className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm"
            >
              {filterOptions.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-[21px] rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="mt-[21px] rounded-[21px] border border-gray-200 bg-white p-[34px] text-sm text-gray-600 shadow-sm">
          {t(
            "loading"
          )}
        </div>
      ) : documents.length === 0 ? (
        <div className="mt-[21px] rounded-[21px] border border-gray-200 bg-white p-[34px] shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            {t(
              "emptyTitle"
            )}
          </h2>

          <p className="mt-[13px] max-w-2xl text-sm leading-6 text-gray-600">
            {t(
              "emptyDescription"
            )}
          </p>
        </div>
      ) : visibleDocuments.length === 0 ? (
        <div className="mt-[21px] rounded-[21px] border border-gray-200 bg-white p-[34px] text-sm text-gray-600 shadow-sm">
          {t(
            "noMatches"
          )}
        </div>
      ) : (
        <div className="mt-[21px] grid gap-[21px] lg:grid-cols-2">
          {visibleDocuments.map(
            (medicalDocument) => {
              const appointmentDate =
                formatAppointmentDate(
                  medicalDocument.appointmentDate,
                  locale
                );

              return (
                <article
                  key={
                    medicalDocument.id
                  }
                  className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-[13px]">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#036661]">
                        {
                          documentLabels[
                            medicalDocument.documentType
                          ]
                        }
                      </p>

                      <h2 className="mt-[8px] text-xl font-bold text-gray-900">
                        {
                          medicalDocument.title
                        }
                      </h2>
                    </div>

                    <span className="rounded-full bg-gray-100 px-[13px] py-[5px] text-xs font-semibold text-gray-700">
                      {medicalDocument.contentFormat ===
                      "text"
                        ? t(
                            "note"
                          )
                        : t(
                            "file"
                          )}
                    </span>
                  </div>

                  {medicalDocument.description && (
                    <p className="mt-[13px] text-sm leading-6 text-gray-600">
                      {
                        medicalDocument.description
                      }
                    </p>
                  )}

                  <dl className="mt-[21px] grid gap-[13px] border-t border-gray-200 pt-[21px] text-sm sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-gray-500">
                        {t(
                          "doctor"
                        )}
                      </dt>

                      <dd className="mt-[5px] text-gray-900">
                        {
                          medicalDocument.doctorName
                        }
                      </dd>
                    </div>

                    <div>
                      <dt className="font-medium text-gray-500">
                        {t(
                          "addedAt"
                        )}
                      </dt>

                      <dd className="mt-[5px] text-gray-900">
                        {formatDate(
                          medicalDocument.createdAt,
                          locale
                        )}
                      </dd>
                    </div>

                    {appointmentDate && (
                      <div>
                        <dt className="font-medium text-gray-500">
                          {t(
                            "consultation"
                          )}
                        </dt>

                        <dd className="mt-[5px] text-gray-900">
                          {
                            appointmentDate
                          }
                        </dd>
                      </div>
                    )}

                    {medicalDocument.contentFormat ===
                      "file" && (
                      <div>
                        <dt className="font-medium text-gray-500">
                          {t(
                            "file"
                          )}
                        </dt>

                        <dd className="mt-[5px] break-all text-gray-900">
                          {
                            medicalDocument.originalFileName
                          }
                          {" · "}
                          {formatFileSize(
                            medicalDocument.fileSizeBytes,
                            locale
                          )}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {medicalDocument.contentFormat ===
                    "text" &&
                    medicalDocument.contentText && (
                      <div className="mt-[21px] rounded-[13px] border border-blue-100 bg-blue-50 p-[13px]">
                        <p className="whitespace-pre-line text-sm leading-7 text-blue-950">
                          {
                            medicalDocument.contentText
                          }
                        </p>
                      </div>
                    )}

                  {medicalDocument.contentFormat ===
                    "text" && (
                    <button
                      type="button"
                      disabled={
                        generatingPdfId ===
                        medicalDocument.id
                      }
                      onClick={() =>
                        void generatePdf(
                          medicalDocument.id,
                          medicalDocument.title
                        )
                      }
                      className="romdoc-button romdoc-button-primary mt-[21px]"
                    >
                      {generatingPdfId ===
                      medicalDocument.id
                        ? t(
                            "generating"
                          )
                        : t(
                            "downloadNotePdf"
                          )}
                    </button>
                  )}

                  <PatientDocumentSharing
                    documentId={
                      medicalDocument.id
                    }
                  />

                  {medicalDocument.canDownload && (
                    <button
                      type="button"
                      disabled={
                        downloadingId ===
                        medicalDocument.id
                      }
                      onClick={() =>
                        void downloadDocument(
                          medicalDocument.id
                        )
                      }
                      className="romdoc-button romdoc-button-primary mt-[21px]"
                    >
                      {downloadingId ===
                      medicalDocument.id
                        ? t(
                            "preparing"
                          )
                        : t(
                            "downloadDocument"
                          )}
                    </button>
                  )}
                </article>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}
