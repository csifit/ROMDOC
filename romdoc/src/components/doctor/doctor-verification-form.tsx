"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  type AppLocale,
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type SubmissionStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "verified"
  | "rejected"
  | "expired"
  | "withdrawn";

type VerificationSubmission = {
  id: string;
  status:
    SubmissionStatus;

  professional_registration_number:
    | string
    | null;

  issuing_authority:
    | string
    | null;

  professional_title:
    | string
    | null;

  registration_country:
    string;

  registration_expires_at:
    | string
    | null;

  submitted_at:
    | string
    | null;

  reviewed_at:
    | string
    | null;

  rejection_reason:
    | string
    | null;

  created_at: string;
  updated_at: string;
};

type VerificationDocument = {
  id: string;
  document_type: string;
  original_file_name: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
};

type VerificationResponse = {
  verificationStatus?:
    string;

  submission?:
    | VerificationSubmission
    | null;

  documents?:
    VerificationDocument[];

  success?: boolean;
  message?: string;
  error?: string;
  partialSuccess?: boolean;
};

const DATE_LOCALE:
  Record<
    AppLocale,
    string
  > = {
    ro:
      "ro-RO",
    en:
      "en-GB",
    de:
      "de-DE",
  };

function formatFileSize(
  bytes:
    number
) {
  if (
    bytes <
    1024
  ) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 *
      1024
  ) {
    return `${(
      bytes /
      1024
    ).toFixed(
      1
    )} KB`;
  }

  return `${(
    bytes /
    (
      1024 *
      1024
    )
  ).toFixed(
    1
  )} MB`;
}

export default function DoctorVerificationForm() {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "DoctorConfiguration.verification"
    );

  const fileInputRef =
    useRef<
      HTMLInputElement
    >(
      null
    );

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true
    );

  const [
    isUploading,
    setIsUploading,
  ] =
    useState(
      false
    );

  const [
    isDeletingId,
    setIsDeletingId,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    verificationStatus,
    setVerificationStatus,
  ] =
    useState(
      "not_submitted"
    );

  const [
    submission,
    setSubmission,
  ] =
    useState<
      VerificationSubmission | null
    >(
      null
    );

  const [
    documents,
    setDocuments,
  ] =
    useState<
      VerificationDocument[]
    >(
      []
    );

  const [
    registrationNumber,
    setRegistrationNumber,
  ] =
    useState(
      ""
    );

  const [
    issuingAuthority,
    setIssuingAuthority,
  ] =
    useState(
      ""
    );

  const [
    professionalTitle,
    setProfessionalTitle,
  ] =
    useState(
      ""
    );

  const [
    registrationCountry,
    setRegistrationCountry,
  ] =
    useState(
      "RO"
    );

  const [
    registrationExpiresAt,
    setRegistrationExpiresAt,
  ] =
    useState(
      ""
    );

  const [
    documentType,
    setDocumentType,
  ] =
    useState(
      "professional_certificate"
    );

  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState<
      File | null
    >(
      null
    );

  const [
    message,
    setMessage,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    );

  const isEditable =
    !submission ||
    submission.status ===
      "draft";

  function localizedError(
    apiError:
      | string
      | undefined,
    fallback:
      string
  ) {
    return locale ===
      "ro" &&
      apiError
      ? apiError
      : fallback;
  }

  function applyResponse(
    result:
      VerificationResponse
  ) {
    const nextSubmission =
      result.submission ??
      null;

    setVerificationStatus(
      result.verificationStatus ??
      verificationStatus
    );

    setSubmission(
      nextSubmission
    );

    setDocuments(
      result.documents ??
      []
    );

    if (
      nextSubmission
    ) {
      setRegistrationNumber(
        nextSubmission
          .professional_registration_number ??
        ""
      );

      setIssuingAuthority(
        nextSubmission
          .issuing_authority ??
        ""
      );

      setProfessionalTitle(
        nextSubmission
          .professional_title ??
        ""
      );

      setRegistrationCountry(
        nextSubmission
          .registration_country ||
        "RO"
      );

      setRegistrationExpiresAt(
        nextSubmission
          .registration_expires_at ??
        ""
      );
    }
  }

  async function loadVerification() {
    setIsLoading(
      true
    );

    setError(
      null
    );

    try {
      const response =
        await fetch(
          "/api/doctor/verification",
          {
            method:
              "GET",

            cache:
              "no-store",
          }
        );

      const result =
        (await response.json()) as
          VerificationResponse;

      if (
        !response.ok
      ) {
        throw new Error(
          localizedError(
            result.error,
            t(
              "loadError"
            )
          )
        );
      }

      applyResponse(
        result
      );
    } catch (
      loadError
    ) {
      setError(
        loadError instanceof
          Error
          ? loadError.message
          : t(
              "loadError"
            )
      );
    } finally {
      setIsLoading(
        false
      );
    }
  }

  useEffect(() => {
    void loadVerification();
  }, []);

  function saveSubmission(
    action:
      | "save"
      | "submit"
  ) {
    setMessage(
      null
    );

    setError(
      null
    );

    startTransition(
      async () => {
        try {
          const response =
            await fetch(
              "/api/doctor/verification",
              {
                method:
                  "PATCH",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    action,

                    professionalRegistrationNumber:
                      registrationNumber,

                    issuingAuthority,

                    professionalTitle,

                    registrationCountry,

                    registrationExpiresAt:
                      registrationExpiresAt ||
                      null,
                  }),
              }
            );

          const result =
            (await response.json()) as
              VerificationResponse;

          if (
            !response.ok
          ) {
            throw new Error(
              localizedError(
                result.error,
                t(
                  "saveError"
                )
              )
            );
          }

          setMessage(
            locale ===
              "ro" &&
            result.message
              ? result.message
              : t(
                  "saved"
                )
          );

          await loadVerification();
        } catch (
          submitError
        ) {
          setError(
            submitError instanceof
              Error
              ? submitError.message
              : t(
                  "saveError"
                )
          );
        }
      }
    );
  }

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    saveSubmission(
      "save"
    );
  }

  async function handleUpload() {
    if (
      !selectedFile
    ) {
      setError(
        t(
          "selectDocument"
        )
      );

      return;
    }

    setIsUploading(
      true
    );

    setMessage(
      null
    );

    setError(
      null
    );

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        selectedFile
      );

      formData.append(
        "documentType",
        documentType
      );

      const response =
        await fetch(
          "/api/doctor/verification/documents",
          {
            method:
              "POST",

            body:
              formData,
          }
        );

      const result =
        (await response.json()) as
          VerificationResponse;

      if (
        !response.ok
      ) {
        throw new Error(
          localizedError(
            result.error,
            t(
              "uploadError"
            )
          )
        );
      }

      setSelectedFile(
        null
      );

      if (
        fileInputRef.current
      ) {
        fileInputRef.current
          .value =
          "";
      }

      setMessage(
        t(
          "uploaded"
        )
      );

      await loadVerification();
    } catch (
      uploadError
    ) {
      setError(
        uploadError instanceof
          Error
          ? uploadError.message
          : t(
              "uploadError"
            )
      );
    } finally {
      setIsUploading(
        false
      );
    }
  }

  async function handleDeleteDocument(
    documentId:
      string
  ) {
    setIsDeletingId(
      documentId
    );

    setMessage(
      null
    );

    setError(
      null
    );

    try {
      const response =
        await fetch(
          "/api/doctor/verification/documents",
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                documentId,
              }),
          }
        );

      const result =
        (await response.json()) as
          VerificationResponse;

      if (
        !response.ok
      ) {
        throw new Error(
          localizedError(
            result.error,
            t(
              "deleteError"
            )
          )
        );
      }

      setMessage(
        t(
          "deleted"
        )
      );

      await loadVerification();
    } catch (
      deleteError
    ) {
      setError(
        deleteError instanceof
          Error
          ? deleteError.message
          : t(
              "deleteError"
            )
      );
    } finally {
      setIsDeletingId(
        null
      );
    }
  }

  function handleFileChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    setSelectedFile(
      event.target
        .files?.[0] ??
      null
    );
  }

  function formatDate(
    value:
      | string
      | null
  ) {
    if (
      !value
    ) {
      return "—";
    }

    return new Intl
      .DateTimeFormat(
        DATE_LOCALE[
          locale
        ],
        {
          dateStyle:
            "medium",

          timeStyle:
            "short",
        }
      )
      .format(
        new Date(
          value
        )
      );
  }

  function statusLabel(
    status:
      string
  ) {
    if (
      [
        "draft",
        "submitted",
        "under_review",
        "verified",
        "rejected",
        "expired",
        "withdrawn",
      ].includes(
        status
      )
    ) {
      return t(
        `statuses.${status}`
      );
    }

    return status;
  }

  function documentTypeLabel(
    type:
      string
  ) {
    if (
      [
        "identity_document",
        "professional_certificate",
        "membership_certificate",
        "practice_authorization",
        "other",
      ].includes(
        type
      )
    ) {
      return t(
        `documentTypes.${type}`
      );
    }

    return t(
      "documentFallback"
    );
  }

  if (
    isLoading
  ) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-600">
          {t(
            "loading"
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-medium text-gray-500">
              {t(
                "statusEyebrow"
              )}
            </p>

            <h2 className="mt-1 text-2xl font-bold text-gray-900">
              {submission
                ? statusLabel(
                    submission.status
                  )
                : t(
                    "notSubmitted"
                  )}
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              {t(
                "statusDescription"
              )}
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full bg-[#036661]/10 px-3 py-1 text-sm font-semibold text-[#036661]">
            {verificationStatus ===
            "verified"
              ? t(
                  "verifiedBadge"
                )
              : t(
                  "noBadge"
                )}
          </span>
        </div>

        {submission
          ?.submitted_at && (
          <p className="mt-4 text-sm text-gray-600">
            {t(
              "submittedAt",
              {
                date:
                  formatDate(
                    submission
                      .submitted_at
                  ),
              }
            )}
          </p>
        )}

        {submission
          ?.rejection_reason && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <strong>
              {t(
                "rejectionReason"
              )}
            </strong>{" "}
            {
              submission
                .rejection_reason
            }
          </div>
        )}
      </section>

      <form
        onSubmit={
          handleSubmit
        }
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-2xl font-bold text-gray-900">
          {t(
            "professionalInfo"
          )}
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          {t(
            "professionalDescription"
          )}
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label>
            <span className="text-sm font-medium text-gray-700">
              {t(
                "registrationNumber"
              )}
            </span>

            <input
              type="text"
              value={
                registrationNumber
              }
              onChange={(
                event
              ) =>
                setRegistrationNumber(
                  event.target
                    .value
                )
              }
              disabled={
                !isEditable ||
                isPending
              }
              maxLength={
                150
              }
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 disabled:bg-gray-100"
            />
          </label>

          <label>
            <span className="text-sm font-medium text-gray-700">
              {t(
                "issuingAuthority"
              )}
            </span>

            <input
              type="text"
              value={
                issuingAuthority
              }
              onChange={(
                event
              ) =>
                setIssuingAuthority(
                  event.target
                    .value
                )
              }
              disabled={
                !isEditable ||
                isPending
              }
              maxLength={
                250
              }
              placeholder={t(
                "issuingAuthorityPlaceholder"
              )}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 disabled:bg-gray-100"
            />
          </label>

          <label>
            <span className="text-sm font-medium text-gray-700">
              {t(
                "professionalTitle"
              )}
            </span>

            <input
              type="text"
              value={
                professionalTitle
              }
              onChange={(
                event
              ) =>
                setProfessionalTitle(
                  event.target
                    .value
                )
              }
              disabled={
                !isEditable ||
                isPending
              }
              maxLength={
                250
              }
              placeholder={t(
                "professionalTitlePlaceholder"
              )}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 disabled:bg-gray-100"
            />
          </label>

          <label>
            <span className="text-sm font-medium text-gray-700">
              {t(
                "registrationCountry"
              )}
            </span>

            <input
              type="text"
              value={
                registrationCountry
              }
              onChange={(
                event
              ) =>
                setRegistrationCountry(
                  event.target
                    .value
                    .toUpperCase()
                )
              }
              disabled={
                !isEditable ||
                isPending
              }
              minLength={
                2
              }
              maxLength={
                2
              }
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 uppercase disabled:bg-gray-100"
            />
          </label>

          <label className="sm:col-span-2">
            <span className="text-sm font-medium text-gray-700">
              {t(
                "expirationDate"
              )}
            </span>

            <input
              type="date"
              value={
                registrationExpiresAt
              }
              onChange={(
                event
              ) =>
                setRegistrationExpiresAt(
                  event.target
                    .value
                )
              }
              disabled={
                !isEditable ||
                isPending
              }
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 disabled:bg-gray-100 sm:max-w-sm"
            />
          </label>
        </div>

        {isEditable && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="submit"
              disabled={
                isPending
              }
              className="rounded-xl border border-[#036661] px-5 py-3 font-semibold text-[#036661] disabled:opacity-60"
            >
              {isPending
                ? t(
                    "saving"
                  )
                : t(
                    "saveDraft"
                  )}
            </button>

            <button
              type="button"
              onClick={() =>
                saveSubmission(
                  "submit"
                )
              }
              disabled={
                isPending
              }
              className="rounded-xl bg-[#036661] px-5 py-3 font-semibold text-white disabled:opacity-60"
            >
              {isPending
                ? t(
                    "submitting"
                  )
                : t(
                    "submit"
                  )}
            </button>
          </div>
        )}
      </form>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">
          {t(
            "supportingDocuments"
          )}
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          {t(
            "documentsDescription"
          )}
        </p>

        {isEditable && (
          <div className="mt-6 grid gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
            <label>
              <span className="text-sm font-medium text-gray-700">
                {t(
                  "documentType"
                )}
              </span>

              <select
                value={
                  documentType
                }
                onChange={(
                  event
                ) =>
                  setDocumentType(
                    event.target
                      .value
                  )
                }
                disabled={
                  isUploading
                }
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
              >
                {[
                  "identity_document",
                  "professional_certificate",
                  "membership_certificate",
                  "practice_authorization",
                  "other",
                ].map(
                  (
                    type
                  ) => (
                    <option
                      key={
                        type
                      }
                      value={
                        type
                      }
                    >
                      {documentTypeLabel(
                        type
                      )}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span className="text-sm font-medium text-gray-700">
                {t(
                  "file"
                )}
              </span>

              <input
                ref={
                  fileInputRef
                }
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                onChange={
                  handleFileChange
                }
                disabled={
                  isUploading
                }
                className="mt-2 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm"
              />
            </label>

            <button
              type="button"
              onClick={() =>
                void handleUpload()
              }
              disabled={
                isUploading ||
                !selectedFile ||
                !submission
              }
              className="rounded-xl bg-[#036661] px-5 py-3 font-semibold text-white disabled:opacity-60"
            >
              {isUploading
                ? t(
                    "uploading"
                  )
                : t(
                    "upload"
                  )}
            </button>
          </div>
        )}

        {isEditable &&
          !submission && (
          <p className="mt-3 text-sm text-amber-700">
            {t(
              "saveDraftFirst"
            )}
          </p>
        )}

        <div className="mt-6 space-y-3">
          {documents.length ===
          0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-600">
              {t(
                "noDocuments"
              )}
            </div>
          ) : (
            documents.map(
              (
                document
              ) => (
                <div
                  key={
                    document.id
                  }
                  className="flex flex-col justify-between gap-3 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900">
                      {
                        document
                          .original_file_name
                      }
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {documentTypeLabel(
                        document
                          .document_type
                      )}
                      {" · "}
                      {formatFileSize(
                        document
                          .file_size_bytes
                      )}
                      {" · "}
                      {formatDate(
                        document
                          .created_at
                      )}
                    </p>
                  </div>

                  {isEditable && (
                    <button
                      type="button"
                      onClick={() =>
                        void handleDeleteDocument(
                          document.id
                        )
                      }
                      disabled={
                        isDeletingId ===
                        document.id
                      }
                      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60"
                    >
                      {isDeletingId ===
                      document.id
                        ? t(
                            "deleting"
                          )
                        : t(
                            "delete"
                          )}
                    </button>
                  )}
                </div>
              )
            )
          )}
        </div>
      </section>

      {message && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}
    </div>
  );
}
