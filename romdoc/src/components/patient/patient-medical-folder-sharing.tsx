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
import QRCode from "qrcode";

import {
  defaultMedicalFolderShareGrantInput,
  type CreateMedicalFolderShareGrantInput,
  type MedicalFolderShareApiError,
  type MedicalFolderShareApiErrorCode,
  type MedicalFolderShareAuditResponse,
  type MedicalFolderShareDurationSeconds,
  type MedicalFolderShareGrantListItem,
  type MedicalFolderShareGrantListResponse,
  type MedicalFolderShareGrantMutationResponse,
  type MedicalFolderShareScope,
  type MedicalFolderShareTokenIssueResponse,
  validateMedicalFolderShareGrantInput,
} from "@/lib/medical-folder-share-grants";
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

type PatientDocument = {
  id: string;
  documentType: DocumentType;
  title: string;
  description: string | null;
  contentFormat: "file" | "text";
  createdAt: string;
  doctorName: string;
  canDownload: boolean;
};

type FolderResponse = {
  documents?: PatientDocument[];
  error?: string;
};

type ShareApiPayload =
  | MedicalFolderShareApiError
  | MedicalFolderShareGrantListResponse
  | MedicalFolderShareGrantMutationResponse;

type ShareTokenApiError = {
  error: string;
  message: string;
};

type GeneratedShare = {
  shareToken: string;
  linkUrl: string;
  qrDataUrl: string;
  tokenHint: string;
};

type ShareEmailApiPayload =
  | {
      success: true;
    }
  | {
      error: string;
      message: string;
    };

const INTL_LOCALE:
  Record<AppLocale, string> = {
    ro: "ro-RO",
    en: "en-GB",
    de: "de-DE",
  };

const ERROR_KEYS:
  Record<
    MedicalFolderShareApiErrorCode,
    string
  > = {
    authentication_required:
      "errors.authentication_required",
    active_patient_account_required:
      "errors.active_patient_account_required",
    invalid_request:
      "errors.invalid_request",
    invalid_share_grant_id:
      "errors.invalid_share_grant_id",
    invalid_scope:
      "errors.invalid_scope",
    invalid_duration:
      "errors.invalid_duration",
    invalid_access_mode:
      "errors.invalid_access_mode",
    downloads_not_available:
      "errors.downloads_not_available",
    selected_documents_required:
      "errors.selected_documents_required",
    too_many_selected_documents:
      "errors.too_many_selected_documents",
    documents_not_allowed:
      "errors.documents_not_allowed",
    invalid_document_id:
      "errors.invalid_document_id",
    selected_document_unavailable:
      "errors.selected_document_unavailable",
    share_grant_not_found:
      "errors.share_grant_not_found",
    share_grant_create_failed:
      "errors.share_grant_create_failed",
    share_grant_list_failed:
      "errors.share_grant_list_failed",
    share_grant_revoke_failed:
      "errors.share_grant_revoke_failed",
    share_audit_load_failed:
      "errors.share_audit_load_failed",
  };

const STATUS_CLASSES = {
  active:
    "border-emerald-200 bg-emerald-50 text-emerald-800",
  revoked:
    "border-gray-200 bg-gray-100 text-gray-700",
  expired:
    "border-amber-200 bg-amber-50 text-amber-800",
  consumed:
    "border-blue-200 bg-blue-50 text-blue-800",
} as const;

const EMAIL_ERROR_KEYS:
  Record<string, string> = {
    authentication_required:
      "email.errors.authentication_required",
    active_patient_account_required:
      "email.errors.active_patient_account_required",
    invalid_request:
      "email.errors.invalid_request",
    invalid_email:
      "email.errors.invalid_email",
    invalid_share_grant_id:
      "email.errors.invalid_share_grant_id",
    invalid_share_token:
      "email.errors.invalid_share_token",
    share_grant_not_found:
      "email.errors.share_grant_not_found",
    share_grant_revoked:
      "email.errors.share_grant_revoked",
    share_grant_expired:
      "email.errors.share_grant_expired",
    share_grant_consumed:
      "email.errors.share_grant_consumed",
    email_configuration_missing:
      "email.errors.email_configuration_missing",
    email_send_failed:
      "email.errors.email_send_failed",
  };

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

function durationFromGrant(
  grant: Pick<
    MedicalFolderShareGrantListItem,
    "createdAt" | "expiresAt"
  >
): MedicalFolderShareDurationSeconds | null {
  const createdAt =
    new Date(
      grant.createdAt
    ).getTime();

  const expiresAt =
    new Date(
      grant.expiresAt
    ).getTime();

  const seconds =
    Math.round(
      (
        expiresAt -
        createdAt
      ) / 1000
    );

  if (
    seconds === 600 ||
    seconds === 3_600 ||
    seconds === 86_400 ||
    seconds === 604_800
  ) {
    return seconds;
  }

  return null;
}

function isApiError(
  payload: ShareApiPayload
): payload is MedicalFolderShareApiError {
  return (
    "error" in payload &&
    typeof payload.error ===
      "string"
  );
}

async function copyText(
  value: string
) {
  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {
    await navigator.clipboard
      .writeText(value);
    return;
  }

  const textarea =
    document.createElement(
      "textarea"
    );

  textarea.value =
    value;
  textarea.readOnly =
    true;
  textarea.style.position =
    "fixed";
  textarea.style.opacity =
    "0";

  document.body
    .appendChild(
      textarea
    );

  textarea.select();

  const copied =
    document.execCommand(
      "copy"
    );

  textarea.remove();

  if (!copied) {
    throw new Error(
      "copy_failed"
    );
  }
}

export default function PatientMedicalFolderSharing() {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "PatientPages.folder.sharing"
    );

  const documentT =
    useTranslations(
      "PatientPages.folder.documents"
    );

  const [
    grants,
    setGrants,
  ] = useState<
    MedicalFolderShareGrantListItem[]
  >([]);

  const [
    documents,
    setDocuments,
  ] = useState<
    PatientDocument[]
  >([]);

  const [
    form,
    setForm,
  ] = useState<
    CreateMedicalFolderShareGrantInput
  >(
    defaultMedicalFolderShareGrantInput()
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isCreating,
    setIsCreating,
  ] = useState(false);

  const [
    revokingGrantId,
    setRevokingGrantId,
  ] = useState<
    string | null
  >(null);

  const [
    expandedAuditId,
    setExpandedAuditId,
  ] = useState<
    string | null
  >(null);

  const [
    loadingAuditId,
    setLoadingAuditId,
  ] = useState<
    string | null
  >(null);

  const [
    audits,
    setAudits,
  ] = useState<
    Record<
      string,
      MedicalFolderShareAuditResponse
    >
  >({});

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    generatingGrantId,
    setGeneratingGrantId,
  ] = useState<
    string | null
  >(null);

  const [
    generatedShares,
    setGeneratedShares,
  ] = useState<
    Record<
      string,
      GeneratedShare
    >
  >({});

  const [
    copyingGrantId,
    setCopyingGrantId,
  ] = useState<
    string | null
  >(null);

  const [
    recipientEmails,
    setRecipientEmails,
  ] = useState<
    Record<string, string>
  >({});

  const [
    sendingEmailGrantId,
    setSendingEmailGrantId,
  ] = useState<
    string | null
  >(null);

  const selectedDocumentSet =
    useMemo(
      () =>
        new Set(
          form.documentIds
        ),
      [
        form.documentIds,
      ]
    );

  const documentTypeLabels =
    useMemo(
      () => ({
        consultation_note:
          documentT(
            "types.consultation_note"
          ),
        prescription:
          documentT(
            "types.prescription"
          ),
        laboratory_result:
          documentT(
            "types.laboratory_result"
          ),
        imaging_result:
          documentT(
            "types.imaging_result"
          ),
        referral:
          documentT(
            "types.referral"
          ),
        medical_certificate:
          documentT(
            "types.medical_certificate"
          ),
        discharge_summary:
          documentT(
            "types.discharge_summary"
          ),
        other:
          documentT(
            "types.other"
          ),
      }),
      [
        documentT,
      ]
    );

  const translateApiError =
    useCallback(
      (
        payload:
          MedicalFolderShareApiError,
        fallbackKey: string
      ) => {
        const key =
          ERROR_KEYS[
            payload.error
          ];

        if (key) {
          return t(key);
        }

        if (
          locale === "ro" &&
          payload.message
        ) {
          return payload.message;
        }

        return t(
          fallbackKey
        );
      },
      [
        locale,
        t,
      ]
    );

  const loadData =
    useCallback(
      async () => {
        setIsLoading(true);
        setError("");

        try {
          const [
            grantsResponse,
            documentsResponse,
          ] =
            await Promise.all([
              fetch(
                "/api/patient/folder/share-grants",
                {
                  method: "GET",
                  cache: "no-store",
                }
              ),
              fetch(
                "/api/patient/folder",
                {
                  method: "GET",
                  cache: "no-store",
                }
              ),
            ]);

          const grantsPayload =
            await grantsResponse
              .json() as
              ShareApiPayload;

          const documentsPayload =
            await documentsResponse
              .json() as
              FolderResponse;

          if (
            !grantsResponse.ok
          ) {
            throw new Error(
              isApiError(
                grantsPayload
              )
                ? translateApiError(
                    grantsPayload,
                    "errors.share_grant_list_failed"
                  )
                : t(
                    "errors.share_grant_list_failed"
                  )
            );
          }

          if (
            !documentsResponse.ok
          ) {
            throw new Error(
              locale === "ro" &&
              documentsPayload.error
                ? documentsPayload.error
                : t(
                    "errors.documents_load_failed"
                  )
            );
          }

          setGrants(
            (
              grantsPayload as
                MedicalFolderShareGrantListResponse
            ).grants ?? []
          );

          setDocuments(
            documentsPayload.documents ??
              []
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : t(
                  "errors.load_failed"
                )
          );
        } finally {
          setIsLoading(false);
        }
      },
      [
        locale,
        t,
        translateApiError,
      ]
    );

  useEffect(() => {
    void loadData();
  }, [
    loadData,
  ]);

  function updateScope(
    scope: MedicalFolderShareScope
  ) {
    setForm(
      (current) => ({
        ...current,
        shareScope:
          scope,
        allowDocumentDownloads:
          scope ===
            "complete_folder" ||
          scope ===
            "selected_documents"
            ? current
                .allowDocumentDownloads
            : false,
        documentIds:
          scope ===
          "selected_documents"
            ? current.documentIds
            : [],
      })
    );

    setError("");
    setSuccess("");
  }

  function toggleDocument(
    documentId: string
  ) {
    setForm(
      (current) => ({
        ...current,
        documentIds:
          current.documentIds
            .includes(
              documentId
            )
            ? current.documentIds
                .filter(
                  (id) =>
                    id !==
                    documentId
                )
            : [
                ...current.documentIds,
                documentId,
              ],
      })
    );

    setError("");
    setSuccess("");
  }

  async function createGrant() {
    const validation =
      validateMedicalFolderShareGrantInput(
        form
      );

    if (!validation.ok) {
      setError(
        t(
          ERROR_KEYS[
            validation.error as
              MedicalFolderShareApiErrorCode
          ]
        )
      );

      return;
    }

    setIsCreating(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          "/api/patient/folder/share-grants",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                validation.value
              ),
          }
        );

      const payload =
        await response.json() as
          ShareApiPayload;

      if (
        !response.ok ||
        isApiError(payload)
      ) {
        throw new Error(
          isApiError(payload)
            ? translateApiError(
                payload,
                "errors.share_grant_create_failed"
              )
            : t(
                "errors.share_grant_create_failed"
              )
        );
      }

      const mutation =
        payload as
          MedicalFolderShareGrantMutationResponse;

      setGrants(
        (current) => [
          mutation.grant,
          ...current.filter(
            (grant) =>
              grant.id !==
              mutation.grant.id
          ),
        ]
      );

      setForm(
        defaultMedicalFolderShareGrantInput()
      );

      setSuccess(
        t(
          "messages.created"
        )
      );
    } catch (
      createError
    ) {
      setError(
        createError instanceof Error
          ? createError.message
          : t(
              "errors.share_grant_create_failed"
            )
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function revokeGrant(
    grantId: string
  ) {
    setRevokingGrantId(
      grantId
    );
    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          "/api/patient/folder/share-grants",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                shareGrantId:
                  grantId,
              }),
          }
        );

      const payload =
        await response.json() as
          ShareApiPayload;

      if (
        !response.ok ||
        isApiError(payload)
      ) {
        throw new Error(
          isApiError(payload)
            ? translateApiError(
                payload,
                "errors.share_grant_revoke_failed"
              )
            : t(
                "errors.share_grant_revoke_failed"
              )
        );
      }

      const mutation =
        payload as
          MedicalFolderShareGrantMutationResponse;

      setGrants(
        (current) =>
          current.map(
            (grant) =>
              grant.id ===
              mutation.grant.id
                ? mutation.grant
                : grant
          )
      );

      setGeneratedShares(
        (current) => {
          const next = {
            ...current,
          };

          delete next[
            grantId
          ];

          return next;
        }
      );

      setAudits(
        (current) => {
          const next = {
            ...current,
          };

          delete next[
            grantId
          ];

          return next;
        }
      );

      setSuccess(
        t(
          "messages.revoked"
        )
      );
    } catch (
      revokeError
    ) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : t(
              "errors.share_grant_revoke_failed"
            )
      );
    } finally {
      setRevokingGrantId(
        null
      );
    }
  }

  async function generateShare(
    grantId: string
  ) {
    setGeneratingGrantId(
      grantId
    );
    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          "/api/patient/folder/share-token",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                shareGrantId:
                  grantId,
              }),
          }
        );

      const payload =
        await response
          .json() as
          | MedicalFolderShareTokenIssueResponse
          | ShareTokenApiError;

      if (
        !response.ok ||
        !("success" in payload)
      ) {
        throw new Error(
          "message" in payload
            ? payload.message
            : t(
                "tokens.generateError"
              )
        );
      }

      const baseUrl =
        `${window.location.origin}/share/medical-folder`;

      const encodedToken =
        encodeURIComponent(
          payload.shareToken
        );

      const linkUrl =
        `${baseUrl}#token=${encodedToken}&channel=secure_link`;

      const qrUrl =
        `${baseUrl}#token=${encodedToken}&channel=qr`;

      const qrDataUrl =
        await QRCode
          .toDataURL(
            qrUrl,
            {
              width:
                280,
              margin:
                2,
              errorCorrectionLevel:
                "M",
            }
          );

      setGeneratedShares(
        (current) => ({
          ...current,
          [grantId]: {
            shareToken:
              payload.shareToken,
            linkUrl,
            qrDataUrl,
            tokenHint:
              payload.tokenHint,
          },
        })
      );

      try {
        await copyText(
          linkUrl
        );

        setSuccess(
          t(
            "tokens.generatedAndCopied"
          )
        );
      } catch {
        setSuccess(
          t(
            "tokens.generated"
          )
        );
      }
    } catch (
      generateError
    ) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : t(
              "tokens.generateError"
            )
      );
    } finally {
      setGeneratingGrantId(
        null
      );
    }
  }

  async function copyShareLink(
    grantId: string,
    linkUrl: string
  ) {
    setCopyingGrantId(
      grantId
    );
    setError("");
    setSuccess("");

    try {
      await copyText(
        linkUrl
      );

      setSuccess(
        t(
          "tokens.copied"
        )
      );
    } catch {
      setError(
        t(
          "tokens.copyError"
        )
      );
    } finally {
      setCopyingGrantId(
        null
      );
    }
  }

  async function sendShareEmail(
    grantId: string,
    shareToken: string
  ) {
    const recipientEmail =
      recipientEmails[
        grantId
      ]?.trim() ?? "";

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        recipientEmail
      )
    ) {
      setError(
        t(
          "email.invalid"
        )
      );
      return;
    }

    setSendingEmailGrantId(
      grantId
    );
    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          "/api/patient/folder/share-email",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                shareGrantId:
                  grantId,
                shareToken,
                recipientEmail,
                locale,
              }),
          }
        );

      const payload =
        await response
          .json() as
          ShareEmailApiPayload;

      if (
        !response.ok ||
        !("success" in payload)
      ) {
        const errorKey =
          "error" in payload
            ? EMAIL_ERROR_KEYS[
                payload.error
              ]
            : null;

        throw new Error(
          errorKey
            ? t(
                errorKey
              )
            : t(
                "email.sendError"
              )
        );
      }

      setRecipientEmails(
        (current) => ({
          ...current,
          [grantId]:
            "",
        })
      );

      setAudits(
        (current) => {
          const next = {
            ...current,
          };

          delete next[
            grantId
          ];

          return next;
        }
      );

      setSuccess(
        t(
          "email.sent"
        )
      );
    } catch (
      sendError
    ) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : t(
              "email.sendError"
            )
      );
    } finally {
      setSendingEmailGrantId(
        null
      );
    }
  }

  async function toggleAudit(
    grantId: string
  ) {
    if (
      expandedAuditId ===
      grantId
    ) {
      setExpandedAuditId(
        null
      );
      return;
    }

    setExpandedAuditId(
      grantId
    );

    if (
      audits[
        grantId
      ]
    ) {
      return;
    }

    setLoadingAuditId(
      grantId
    );
    setError("");

    try {
      const response =
        await fetch(
          `/api/patient/folder/share-grants/audit?shareGrantId=${encodeURIComponent(
            grantId
          )}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const payload =
        await response.json() as
          | MedicalFolderShareApiError
          | MedicalFolderShareAuditResponse;

      if (
        !response.ok ||
        "error" in payload
      ) {
        throw new Error(
          "error" in payload
            ? translateApiError(
                payload,
                "errors.share_audit_load_failed"
              )
            : t(
                "errors.share_audit_load_failed"
              )
        );
      }

      setAudits(
        (current) => ({
          ...current,
          [grantId]:
            payload,
        })
      );
    } catch (
      auditError
    ) {
      setExpandedAuditId(
        null
      );

      setError(
        auditError instanceof Error
          ? auditError.message
          : t(
              "errors.share_audit_load_failed"
            )
      );
    } finally {
      setLoadingAuditId(
        null
      );
    }
  }

  const activeGrantCount =
    grants.filter(
      (grant) =>
        grant.status ===
        "active"
    ).length;

  return (
    <section className="mt-[34px] space-y-[34px]">
      {error && (
        <div
          role="alert"
          className="rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-[13px] border border-emerald-200 bg-emerald-50 p-[13px] text-sm text-emerald-800"
        >
          {success}
        </div>
      )}

      <div className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
        <p className="text-sm font-semibold text-[#036661]">
          {t(
            "form.eyebrow"
          )}
        </p>

        <h2 className="mt-[5px] text-2xl font-bold text-gray-900">
          {t(
            "form.title"
          )}
        </h2>

        <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
          {t(
            "form.description"
          )}
        </p>

        <div className="mt-[21px] grid gap-[21px] lg:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-gray-800">
              {t(
                "form.scopeLabel"
              )}
            </span>

            <select
              value={
                form.shareScope
              }
              onChange={(
                event: {
                  target: {
                    value: string;
                  };
                }
              ) =>
                updateScope(
                  event.target
                    .value as
                    MedicalFolderShareScope
                )
              }
              className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm"
            >
              {[
                "emergency_summary",
                "medical_profile",
                "complete_folder",
                "selected_documents",
              ].map(
                (scope) => (
                  <option
                    key={scope}
                    value={scope}
                  >
                    {t(
                      `scopes.${scope}`
                    )}
                  </option>
                )
              )}
            </select>

            <span className="mt-[8px] block text-xs leading-5 text-gray-500">
              {t(
                `scopeDescriptions.${form.shareScope}`
              )}
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-gray-800">
              {t(
                "form.durationLabel"
              )}
            </span>

            <select
              value={
                form.durationSeconds
              }
              onChange={(
                event: {
                  target: {
                    value: string;
                  };
                }
              ) =>
                setForm(
                  (current) => ({
                    ...current,
                    durationSeconds:
                      Number(
                        event.target
                          .value
                      ) as
                        MedicalFolderShareDurationSeconds,
                  })
                )
              }
              className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm"
            >
              {[600, 3600, 86400, 604800].map(
                (duration) => (
                  <option
                    key={duration}
                    value={duration}
                  >
                    {t(
                      `durations.${duration}`
                    )}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-gray-800">
              {t(
                "form.accessModeLabel"
              )}
            </span>

            <select
              value={
                form.accessMode
              }
              onChange={(
                event: {
                  target: {
                    value: string;
                  };
                }
              ) =>
                setForm(
                  (current) => ({
                    ...current,
                    accessMode:
                      event.target
                        .value as
                        CreateMedicalFolderShareGrantInput[
                          "accessMode"
                        ],
                  })
                )
              }
              className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm"
            >
              <option value="one_time">
                {t(
                  "accessModes.one_time"
                )}
              </option>

              <option value="multiple">
                {t(
                  "accessModes.multiple"
                )}
              </option>
            </select>

            <span className="mt-[8px] block text-xs leading-5 text-gray-500">
              {t(
                `accessModeDescriptions.${form.accessMode}`
              )}
            </span>
          </label>

          <label className="flex min-h-[89px] items-start gap-[13px] rounded-[13px] border border-gray-200 bg-gray-50 p-[13px]">
            <input
              type="checkbox"
              checked={
                form.allowDocumentDownloads
              }
              disabled={
                form.shareScope !==
                  "complete_folder" &&
                form.shareScope !==
                  "selected_documents"
              }
              onChange={(
                event: {
                  target: {
                    checked: boolean;
                  };
                }
              ) =>
                setForm(
                  (current) => ({
                    ...current,
                    allowDocumentDownloads:
                      event.target
                        .checked,
                  })
                )
              }
              className="romdoc-focus-ring mt-[3px] h-[18px] w-[18px] rounded border-gray-300 text-[#036661]"
            />

            <span>
              <span className="block text-sm font-semibold text-gray-800">
                {t(
                  "form.downloadsLabel"
                )}
              </span>

              <span className="mt-[5px] block text-xs leading-5 text-gray-500">
                {t(
                  "form.downloadsDescription"
                )}
              </span>
            </span>
          </label>
        </div>

        {form.shareScope ===
          "selected_documents" && (
          <div className="mt-[21px] rounded-[17px] border border-gray-200 bg-gray-50 p-[13px] sm:p-[21px]">
            <div className="flex flex-col justify-between gap-[8px] sm:flex-row sm:items-end">
              <div>
                <h3 className="font-bold text-gray-900">
                  {t(
                    "documents.title"
                  )}
                </h3>

                <p className="mt-[5px] text-sm leading-6 text-gray-600">
                  {t(
                    "documents.description"
                  )}
                </p>
              </div>

              <span className="text-sm font-semibold text-[#036661]">
                {t(
                  "documents.selectedCount",
                  {
                    count:
                      form.documentIds
                        .length,
                  }
                )}
              </span>
            </div>

            {documents.length ===
            0 ? (
              <p className="mt-[13px] rounded-[13px] border border-dashed border-gray-300 bg-white p-[13px] text-sm text-gray-600">
                {t(
                  "documents.empty"
                )}
              </p>
            ) : (
              <div className="mt-[13px] grid max-h-[377px] gap-[8px] overflow-y-auto pr-[5px]">
                {documents.map(
                  (
                    medicalDocument
                  ) => (
                    <label
                      key={
                        medicalDocument.id
                      }
                      className="flex cursor-pointer items-start gap-[13px] rounded-[13px] border border-gray-200 bg-white p-[13px] transition hover:border-[#036661]/50"
                    >
                      <input
                        type="checkbox"
                        checked={
                          selectedDocumentSet.has(
                            medicalDocument.id
                          )
                        }
                        onChange={() =>
                          toggleDocument(
                            medicalDocument.id
                          )
                        }
                        className="romdoc-focus-ring mt-[3px] h-[18px] w-[18px] rounded border-gray-300 text-[#036661]"
                      />

                      <span className="min-w-0">
                        <span className="block font-semibold text-gray-900">
                          {
                            medicalDocument.title
                          }
                        </span>

                        <span className="mt-[5px] block text-xs text-gray-500">
                          {
                            documentTypeLabels[
                              medicalDocument
                                .documentType
                            ]
                          }
                          {" · "}
                          {
                            medicalDocument.doctorName
                          }
                          {" · "}
                          {formatDateTime(
                            medicalDocument.createdAt,
                            locale
                          )}
                        </span>
                      </span>
                    </label>
                  )
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-[21px] flex flex-col gap-[13px] border-t border-gray-200 pt-[21px] sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs leading-5 text-gray-500">
            {t(
              "form.consentNotice"
            )}
          </p>

          <button
            type="button"
            onClick={() =>
              void createGrant()
            }
            disabled={
              isCreating ||
              (
                form.shareScope ===
                  "selected_documents" &&
                form.documentIds
                  .length === 0
              )
            }
            className="romdoc-button romdoc-button-primary"
          >
            {isCreating
              ? t(
                  "form.creating"
                )
              : t(
                  "form.create"
                )}
          </button>
        </div>
      </div>

      <div>
        <div className="flex flex-col justify-between gap-[13px] sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-[#036661]">
              {t(
                "list.eyebrow"
              )}
            </p>

            <h2 className="mt-[5px] text-2xl font-bold text-gray-900">
              {t(
                "list.title"
              )}
            </h2>

            <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
              {t(
                "list.description"
              )}
            </p>
          </div>

          {!isLoading && (
            <span className="rounded-full border border-gray-200 bg-white px-[13px] py-[8px] text-sm font-semibold text-gray-700 shadow-sm">
              {t(
                "list.activeCount",
                {
                  count:
                    activeGrantCount,
                }
              )}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="mt-[21px] rounded-[21px] border border-gray-200 bg-white p-[34px] text-sm text-gray-600 shadow-sm">
            {t(
              "list.loading"
            )}
          </div>
        ) : grants.length ===
          0 ? (
          <div className="mt-[21px] rounded-[21px] border border-gray-200 bg-white p-[34px] shadow-sm">
            <h3 className="text-xl font-bold text-gray-900">
              {t(
                "list.emptyTitle"
              )}
            </h3>

            <p className="mt-[13px] max-w-2xl text-sm leading-6 text-gray-600">
              {t(
                "list.emptyDescription"
              )}
            </p>
          </div>
        ) : (
          <div className="mt-[21px] grid gap-[21px]">
            {grants.map(
              (grant) => {
                const duration =
                  durationFromGrant(
                    grant
                  );

                const audit =
                  audits[
                    grant.id
                  ];

                const isAuditOpen =
                  expandedAuditId ===
                  grant.id;

                return (
                  <article
                    key={
                      grant.id
                    }
                    className="overflow-hidden rounded-[21px] border border-gray-200 bg-white shadow-sm"
                  >
                    <div className="p-[21px] sm:p-[34px]">
                      <div className="flex flex-col justify-between gap-[13px] sm:flex-row sm:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-[8px]">
                            <span
                              className={`inline-flex rounded-full border px-[10px] py-[5px] text-xs font-bold ${STATUS_CLASSES[grant.status]}`}
                            >
                              {t(
                                `statuses.${grant.status}`
                              )}
                            </span>

                            <span className="text-xs font-semibold uppercase tracking-wide text-[#036661]">
                              {t(
                                `scopes.${grant.shareScope}`
                              )}
                            </span>
                          </div>

                          <h3 className="mt-[13px] text-xl font-bold text-gray-900">
                            {t(
                              "list.grantTitle",
                              {
                                date:
                                  formatDateTime(
                                    grant.createdAt,
                                    locale
                                  ),
                              }
                            )}
                          </h3>
                        </div>

                        {grant.status ===
                          "active" && (
                          <button
                            type="button"
                            onClick={() =>
                              void revokeGrant(
                                grant.id
                              )
                            }
                            disabled={
                              revokingGrantId ===
                              grant.id
                            }
                            className="romdoc-button romdoc-button-secondary romdoc-button-sm border-red-200 text-red-700 hover:bg-red-50"
                          >
                            {revokingGrantId ===
                            grant.id
                              ? t(
                                  "actions.revoking"
                                )
                              : t(
                                  "actions.revoke"
                                )}
                          </button>
                        )}
                      </div>

                      <dl className="mt-[21px] grid gap-[13px] border-t border-gray-200 pt-[21px] text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <dt className="font-medium text-gray-500">
                            {t(
                              "labels.expires"
                            )}
                          </dt>

                          <dd className="mt-[5px] font-semibold text-gray-900">
                            {formatDateTime(
                              grant.expiresAt,
                              locale
                            )}
                          </dd>
                        </div>

                        <div>
                          <dt className="font-medium text-gray-500">
                            {t(
                              "labels.duration"
                            )}
                          </dt>

                          <dd className="mt-[5px] font-semibold text-gray-900">
                            {duration
                              ? t(
                                  `durations.${duration}`
                                )
                              : t(
                                  "labels.customDuration"
                                )}
                          </dd>
                        </div>

                        <div>
                          <dt className="font-medium text-gray-500">
                            {t(
                              "labels.accessMode"
                            )}
                          </dt>

                          <dd className="mt-[5px] font-semibold text-gray-900">
                            {t(
                              `accessModes.${grant.accessMode}`
                            )}
                          </dd>
                        </div>

                        <div>
                          <dt className="font-medium text-gray-500">
                            {t(
                              "labels.accessCount"
                            )}
                          </dt>

                          <dd className="mt-[5px] font-semibold text-gray-900">
                            {
                              grant.accessCount
                            }
                          </dd>
                        </div>

                        <div>
                          <dt className="font-medium text-gray-500">
                            {t(
                              "labels.downloads"
                            )}
                          </dt>

                          <dd className="mt-[5px] font-semibold text-gray-900">
                            {grant.allowDocumentDownloads
                              ? t(
                                  "common.yes"
                                )
                              : t(
                                  "common.no"
                                )}
                          </dd>
                        </div>

                        {grant.lastAccessedAt && (
                          <div>
                            <dt className="font-medium text-gray-500">
                              {t(
                                "labels.lastAccess"
                              )}
                            </dt>

                            <dd className="mt-[5px] font-semibold text-gray-900">
                              {formatDateTime(
                                grant.lastAccessedAt,
                                locale
                              )}
                            </dd>
                          </div>
                        )}

                        {grant.revokedAt && (
                          <div>
                            <dt className="font-medium text-gray-500">
                              {t(
                                "labels.revokedAt"
                              )}
                            </dt>

                            <dd className="mt-[5px] font-semibold text-gray-900">
                              {formatDateTime(
                                grant.revokedAt,
                                locale
                              )}
                            </dd>
                          </div>
                        )}
                      </dl>

                      {grant.selectedDocuments
                        .length > 0 && (
                        <div className="mt-[21px] rounded-[13px] border border-gray-200 bg-gray-50 p-[13px]">
                          <p className="text-sm font-semibold text-gray-800">
                            {t(
                              "labels.selectedDocuments",
                              {
                                count:
                                  grant.selectedDocuments
                                    .length,
                              }
                            )}
                          </p>

                          <ul className="mt-[8px] space-y-[5px] text-sm text-gray-600">
                            {grant.selectedDocuments.map(
                              (
                                document
                              ) => (
                                <li
                                  key={
                                    document.id
                                  }
                                >
                                  {
                                    document.title
                                  }
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                      {grant.status ===
                        "active" && (
                        <div className="mt-[21px] rounded-[17px] border border-[#036661]/20 bg-[#036661]/5 p-[13px] sm:p-[21px]">
                          <div className="flex flex-col justify-between gap-[13px] sm:flex-row sm:items-start">
                            <div>
                              <p className="font-bold text-gray-900">
                                {t(
                                  "tokens.title"
                                )}
                              </p>

                              <p className="mt-[5px] max-w-2xl text-xs leading-5 text-gray-600">
                                {grant.shareScope ===
                                  "emergency_summary"
                                  ? t(
                                      "tokens.emergencyDescription"
                                    )
                                  : t(
                                      "tokens.description"
                                    )}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                void generateShare(
                                  grant.id
                                )
                              }
                              disabled={
                                generatingGrantId ===
                                grant.id
                              }
                              className="romdoc-button romdoc-button-primary romdoc-button-sm"
                            >
                              {generatingGrantId ===
                              grant.id
                                ? t(
                                    "tokens.generating"
                                  )
                                : t(
                                    "tokens.generate"
                                  )}
                            </button>
                          </div>

                          {generatedShares[
                            grant.id
                          ] && (
                            <div className="mt-[17px] grid gap-[17px] rounded-[13px] border border-emerald-200 bg-white p-[13px] sm:grid-cols-[minmax(0,1fr)_280px] sm:p-[17px]">
                              <div className="min-w-0">
                                <label
                                  htmlFor={`share-link-${grant.id}`}
                                  className="text-xs font-bold text-gray-700"
                                >
                                  {t(
                                    "tokens.linkLabel"
                                  )}
                                </label>

                                <input
                                  id={`share-link-${grant.id}`}
                                  type="text"
                                  readOnly
                                  value={
                                    generatedShares[
                                      grant.id
                                    ].linkUrl
                                  }
                                  onFocus={(
                                    event: {
                                      currentTarget:
                                        HTMLInputElement;
                                    }
                                  ) =>
                                    event.currentTarget
                                      .select()
                                  }
                                  className="romdoc-focus-ring mt-[8px] w-full rounded-[10px] border border-gray-300 bg-gray-50 px-[13px] py-[10px] font-mono text-xs text-gray-900"
                                />

                                <div className="mt-[13px] flex flex-wrap gap-[8px]">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void copyShareLink(
                                        grant.id,
                                        generatedShares[
                                          grant.id
                                        ].linkUrl
                                      )
                                    }
                                    disabled={
                                      copyingGrantId ===
                                      grant.id
                                    }
                                    className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                                  >
                                    {copyingGrantId ===
                                    grant.id
                                      ? t(
                                          "tokens.copying"
                                        )
                                      : t(
                                          "tokens.copy"
                                        )}
                                  </button>

                                  <a
                                    href={
                                      generatedShares[
                                        grant.id
                                      ].qrDataUrl
                                    }
                                    download={`romdoc-${generatedShares[
                                      grant.id
                                    ].tokenHint}-qr.png`}
                                    className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                                  >
                                    {t(
                                      "tokens.downloadQr"
                                    )}
                                  </a>
                                </div>

                                <div className="mt-[17px] rounded-[13px] border border-gray-200 bg-gray-50 p-[13px]">
                                  <label
                                    htmlFor={`share-email-${grant.id}`}
                                    className="text-xs font-bold text-gray-700"
                                  >
                                    {t(
                                      "email.title"
                                    )}
                                  </label>

                                  <p className="mt-[5px] text-xs leading-5 text-gray-500">
                                    {t(
                                      "email.description"
                                    )}
                                  </p>

                                  <div className="mt-[10px] flex flex-col gap-[8px] sm:flex-row">
                                    <input
                                      id={`share-email-${grant.id}`}
                                      type="email"
                                      inputMode="email"
                                      autoComplete="email"
                                      value={
                                        recipientEmails[
                                          grant.id
                                        ] ?? ""
                                      }
                                      onChange={(
                                        event: {
                                          target: {
                                            value: string;
                                          };
                                        }
                                      ) =>
                                        setRecipientEmails(
                                          (current) => ({
                                            ...current,
                                            [grant.id]:
                                              event.target
                                                .value,
                                          })
                                        )
                                      }
                                      placeholder={t(
                                        "email.placeholder"
                                      )}
                                      className="romdoc-focus-ring min-w-0 flex-1 rounded-[10px] border border-gray-300 bg-white px-[13px] py-[10px] text-sm text-gray-900"
                                    />

                                    <button
                                      type="button"
                                      onClick={() =>
                                        void sendShareEmail(
                                          grant.id,
                                          generatedShares[
                                            grant.id
                                          ].shareToken
                                        )
                                      }
                                      disabled={
                                        sendingEmailGrantId ===
                                          grant.id ||
                                        !(
                                          recipientEmails[
                                            grant.id
                                          ]?.trim()
                                        )
                                      }
                                      className="romdoc-button romdoc-button-primary romdoc-button-sm"
                                    >
                                      {sendingEmailGrantId ===
                                      grant.id
                                        ? t(
                                            "email.sending"
                                          )
                                        : t(
                                            "email.send"
                                          )}
                                    </button>
                                  </div>

                                  <p className="mt-[8px] text-xs leading-5 text-gray-500">
                                    {t(
                                      "email.privacyNotice"
                                    )}
                                  </p>
                                </div>

                                <p className="mt-[13px] text-xs leading-5 text-gray-500">
                                  {t(
                                    "tokens.securityNotice"
                                  )}
                                </p>
                              </div>

                              <div className="flex flex-col items-center">
                                <img
                                  src={
                                    generatedShares[
                                      grant.id
                                    ].qrDataUrl
                                  }
                                  alt={t(
                                    "tokens.qrAlt"
                                  )}
                                  width={
                                    280
                                  }
                                  height={
                                    280
                                  }
                                  className="h-auto w-full max-w-[280px] rounded-[10px] border border-gray-200 bg-white"
                                />

                                <p className="mt-[8px] text-center text-xs font-semibold text-[#036661]">
                                  {t(
                                    "tokens.scan"
                                  )}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-[21px] flex justify-end border-t border-gray-200 pt-[21px]">
                        <button
                          type="button"
                          onClick={() =>
                            void toggleAudit(
                              grant.id
                            )
                          }
                          disabled={
                            loadingAuditId ===
                            grant.id
                          }
                          className="w-fit text-sm font-semibold text-[#036661] underline-offset-4 hover:underline"
                        >
                          {loadingAuditId ===
                          grant.id
                            ? t(
                                "actions.loadingHistory"
                              )
                            : isAuditOpen
                              ? t(
                                  "actions.hideHistory"
                                )
                              : t(
                                  "actions.viewHistory"
                                )}
                        </button>
                      </div>
                    </div>

                    {isAuditOpen && (
                      <div className="border-t border-gray-200 bg-gray-50 p-[21px] sm:p-[34px]">
                        <h4 className="font-bold text-gray-900">
                          {t(
                            "audit.title"
                          )}
                        </h4>

                        {!audit ? (
                          <p className="mt-[13px] text-sm text-gray-600">
                            {t(
                              "audit.loading"
                            )}
                          </p>
                        ) : audit.events.length ===
                          0 ? (
                          <p className="mt-[13px] text-sm text-gray-600">
                            {t(
                              "audit.empty"
                            )}
                          </p>
                        ) : (
                          <ol className="mt-[13px] space-y-[13px]">
                            {audit.events.map(
                              (
                                event
                              ) => (
                                <li
                                  key={
                                    event.id
                                  }
                                  className="rounded-[13px] border border-gray-200 bg-white p-[13px]"
                                >
                                  <div className="flex flex-col justify-between gap-[5px] sm:flex-row sm:items-start">
                                    <p className="font-semibold text-gray-900">
                                      {t(
                                        `events.${event.eventType}`
                                      )}
                                    </p>

                                    <time className="text-xs text-gray-500">
                                      {formatDateTime(
                                        event.createdAt,
                                        locale
                                      )}
                                    </time>
                                  </div>

                                  <p className="mt-[5px] text-xs text-gray-500">
                                    {t(
                                      "audit.actorAndChannel",
                                      {
                                        actor:
                                          t(
                                            `actorRoles.${event.actorRole}`
                                          ),
                                        channel:
                                          t(
                                            `channels.${event.accessChannel}`
                                          ),
                                      }
                                    )}
                                  </p>

                                  {event.documentTitle && (
                                    <p className="mt-[8px] text-sm text-gray-700">
                                      {t(
                                        "audit.document",
                                        {
                                          title:
                                            event.documentTitle,
                                        }
                                      )}
                                    </p>
                                  )}
                                </li>
                              )
                            )}
                          </ol>
                        )}
                      </div>
                    )}
                  </article>
                );
              }
            )}
          </div>
        )}
      </div>
    </section>
  );
}
