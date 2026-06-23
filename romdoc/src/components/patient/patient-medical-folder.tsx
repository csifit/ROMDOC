"use client";

import PatientDocumentSharing from "@/components/patient/patient-document-sharing";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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

const documentLabels:
  Record<DocumentType, string> = {
    consultation_note:
      "Notă de consultație",
    prescription:
      "Rețetă",
    laboratory_result:
      "Rezultat de laborator",
    imaging_result:
      "Rezultat imagistic",
    referral:
      "Trimitere",
    medical_certificate:
      "Adeverință medicală",
    discharge_summary:
      "Scrisoare medicală",
    other:
      "Alt document",
  };

const filterOptions:
  Array<{
    value: "all" | DocumentType;
    label: string;
  }> = [
    {
      value: "all",
      label: "Toate",
    },
    ...Object.entries(
      documentLabels
    ).map(
      ([value, label]) => ({
        value:
          value as DocumentType,
        label,
      })
    ),
  ];

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ro-RO",
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
  value: string | null
) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "ro-RO",
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
  bytes: number
) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

export default function PatientMedicalFolder() {
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

  const [search, setSearch] =
    useState("");

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

  const [error, setError] =
    useState("");

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
          (await response.json()) as FolderResponse;

        if (!response.ok) {
          throw new Error(
            payload.error ??
              "Dosarul medical nu a putut fi încărcat."
          );
        }

        setDocuments(
          payload.documents ??
            []
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Dosarul medical nu a putut fi încărcat."
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const visibleDocuments =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLocaleLowerCase(
            "ro"
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
                  "ro"
                )
                .includes(
                  normalizedSearch
                )
            );
        }
      );
    }, [
      documents,
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
        await response.json() as FolderResponse;

      if (
        !response.ok ||
        !payload.signedUrl
      ) {
        throw new Error(
          payload.error ??
            "Documentul nu a putut fi descărcat."
        );
      }

      window.location.assign(
        payload.signedUrl
      );
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Documentul nu a putut fi descărcat."
      );
    } finally {
      setDownloadingId(
        null
      );
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
          (await response.json()) as FolderResponse;

        throw new Error(
          payload.error ??
            "PDF-ul nu a putut fi generat."
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
          : "PDF-ul nu a putut fi generat."
      );
    } finally {
      setGeneratingPdfId(
        null
      );
    }
  }

  return (
    <section className="mt-8">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <label
              htmlFor="folder-search"
              className="text-sm font-semibold text-gray-800"
            >
              Caută în Dosar
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
              placeholder="Titlu, medic sau fișier"
              className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="folder-type"
              className="text-sm font-semibold text-gray-800"
            >
              Tip document
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
              className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm"
            >
              {filterOptions.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
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
          className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-600 shadow-sm">
          Se încarcă Dosarul medical...
        </div>
      ) : documents.length ===
        0 ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            Dosarul este gol
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
            Documentele și notele medicale adăugate de medicii tăi vor apărea aici.
          </p>
        </div>
      ) : visibleDocuments.length ===
        0 ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-600 shadow-sm">
          Nu există documente care corespund filtrelor selectate.
        </div>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {visibleDocuments.map(
            (document) => {
              const appointmentDate =
                formatAppointmentDate(
                  document.appointmentDate
                );

              return (
                <article
                  key={document.id}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#036661]">
                        {
                          documentLabels[
                            document.documentType
                          ]
                        }
                      </p>

                      <h2 className="mt-2 text-xl font-bold text-gray-900">
                        {document.title}
                      </h2>
                    </div>

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                      {document.contentFormat ===
                      "text"
                        ? "Notă"
                        : "Fișier"}
                    </span>
                  </div>

                  {document.description && (
                    <p className="mt-4 text-sm leading-6 text-gray-600">
                      {
                        document.description
                      }
                    </p>
                  )}

                  <dl className="mt-5 grid gap-4 border-t border-gray-200 pt-5 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-gray-500">
                        Medic
                      </dt>
                      <dd className="mt-1 text-gray-900">
                        {
                          document.doctorName
                        }
                      </dd>
                    </div>

                    <div>
                      <dt className="font-medium text-gray-500">
                        Adăugat la
                      </dt>
                      <dd className="mt-1 text-gray-900">
                        {formatDate(
                          document.createdAt
                        )}
                      </dd>
                    </div>

                    {appointmentDate && (
                      <div>
                        <dt className="font-medium text-gray-500">
                          Consultație
                        </dt>
                        <dd className="mt-1 text-gray-900">
                          {
                            appointmentDate
                          }
                        </dd>
                      </div>
                    )}

                    {document.contentFormat ===
                      "file" && (
                      <div>
                        <dt className="font-medium text-gray-500">
                          Fișier
                        </dt>
                        <dd className="mt-1 break-all text-gray-900">
                          {
                            document.originalFileName
                          }
                          {" · "}
                          {formatFileSize(
                            document.fileSizeBytes
                          )}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {document.contentFormat ===
                    "text" &&
                    document.contentText && (
                      <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                        <p className="whitespace-pre-line text-sm leading-7 text-blue-950">
                          {
                            document.contentText
                          }
                        </p>
                      </div>
                    )}

                  {document.contentFormat ===
                    "text" && (
                    <button
                      type="button"
                      disabled={
                        generatingPdfId ===
                        document.id
                      }
                      onClick={() =>
                        void generatePdf(
                          document.id,
                          document.title
                        )
                      }
                      className="romdoc-button romdoc-button-primary mt-5"
                    >
                      {generatingPdfId ===
                      document.id
                        ? "Se generează..."
                        : "Descarcă nota ca PDF"}
                    </button>
                  )}

                  <PatientDocumentSharing
                    documentId={document.id}
                  />

                  {document.canDownload && (
                    <button
                      type="button"
                      disabled={
                        downloadingId ===
                        document.id
                      }
                      onClick={() =>
                        void downloadDocument(
                          document.id
                        )
                      }
                      className="romdoc-button romdoc-button-primary mt-5"
                    >
                      {downloadingId ===
                      document.id
                        ? "Se pregătește..."
                        : "Descarcă documentul"}
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
