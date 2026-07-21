"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocale } from "next-intl";

import Button from "@/components/ui/button";
import type { PlatformOperatorDoctorApiPayload } from "@/lib/api/platform-operator-doctor-codes";
import {
  normalizeAppLocale,
  selectTranslation,
} from "@/lib/i18n/app-locale";
import {
  getPlatformDoctorApiMessage,
  getPlatformOperatorDoctors,
  interpolatePlatformDoctorCopy,
  PLATFORM_OPERATOR_DOCTOR_LOCALE_TAGS,
} from "@/lib/i18n/platform-operator-doctors";

type VerificationStatus =
  | "submitted"
  | "under_review"
  | "verified"
  | "rejected"
  | "expired";

type VerificationDocument = {
  id: string;
  document_type: string;
  original_file_name: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
};

type AdminNote = {
  id: string;
  note: string;
  created_at: string;
  author:
    | {
        first_name: string | null;
        last_name: string | null;
      }
    | null;
};

type AuditEvent = {
  id: string;
  event_type:
    | "draft_created"
    | "submitted"
    | "review_started"
    | "approved"
    | "rejected"
    | "expired_manual"
    | "expired_automatic"
    | "withdrawn";
  from_status: string | null;
  to_status: string;
  source: "application" | "admin" | "system";
  created_at: string;
  actor:
    | {
        first_name: string | null;
        last_name: string | null;
      }
    | null;
};

type Submission = {
  id: string;
  status: VerificationStatus;
  professional_registration_number: string | null;
  issuing_authority: string | null;
  professional_title: string | null;
  registration_country: string;
  registration_expires_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  doctor:
    | {
        id: string;
        slug: string;
        verification_status: string;
        name: string;
        title: string | null;
        translations?: Array<{
          locale: string;
          title: string | null;
        }>;
      }
    | null;
  documents: VerificationDocument[];
  admin_notes: AdminNote[];
  audit_events: AuditEvent[];
};

type ApiResponse = PlatformOperatorDoctorApiPayload & {
  submissions?: Submission[];
  signedUrl?: string;
};

type StatusFilter =
  | "all"
  | VerificationStatus;

type ReviewAction =
  | "start_review"
  | "approve"
  | "reject"
  | "mark_expired";

function getStatusClasses(
  status: VerificationStatus
) {
  switch (status) {
    case "submitted":
      return "bg-amber-100 text-amber-800";
    case "under_review":
      return "bg-blue-100 text-blue-800";
    case "verified":
      return "bg-emerald-100 text-emerald-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "expired":
      return "bg-gray-200 text-gray-700";
  }
}

function formatFileSize(
  bytes: number
) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
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

export default function DoctorVerificationsManagement() {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const copy =
    getPlatformOperatorDoctors(
      locale
    );

  const [
    submissions,
    setSubmissions,
  ] =
    useState<Submission[]>([]);

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      "all"
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    selectedId,
    setSelectedId,
  ] =
    useState<string | null>(
      null
    );

  const [
    rejectionReason,
    setRejectionReason,
  ] =
    useState("");

  const [
    privateNote,
    setPrivateNote,
  ] =
    useState("");

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    busyAction,
    setBusyAction,
  ] =
    useState<string | null>(
      null
    );

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  const statusLabels =
    copy.verifications
      .statuses as
      Record<
        VerificationStatus,
        string
      >;

  const formatDate =
    useCallback(
      (
        value:
          | string
          | null
      ) => {
        if (!value) {
          return copy.common.none;
        }

        return new Intl.DateTimeFormat(
          PLATFORM_OPERATOR_DOCTOR_LOCALE_TAGS[
            locale
          ],
          {
            dateStyle:
              "medium",
            timeStyle:
              value.includes(
                "T"
              )
                ? "short"
                : undefined,
            timeZone:
              "Europe/Bucharest",
          }
        ).format(
          new Date(value)
        );
      },
      [
        copy.common.none,
        locale,
      ]
    );

  const getDoctorTitle =
    useCallback(
      (
        submission: Submission
      ) =>
        selectTranslation(
          submission.doctor
            ?.translations,
          locale
        )?.title ??
        submission.doctor
          ?.title ??
        copy.verifications
          .queue
          .medicalProfile,
      [
        copy.verifications
          .queue
          .medicalProfile,
        locale,
      ]
    );

  const getActorName =
    useCallback(
      (
        event: AuditEvent
      ) => {
        if (
          event.source ===
          "system"
        ) {
          return copy.verifications
            .actors
            .system;
        }

        const name = [
          event.actor
            ?.first_name,
          event.actor
            ?.last_name,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();

        if (name) {
          return name;
        }

        return event.source ===
          "admin"
          ? copy.verifications
              .actors
              .admin
          : copy.verifications
              .actors
              .doctor;
      },
      [
        copy.verifications
          .actors,
      ]
    );

  const getNoteAuthor =
    useCallback(
      (
        note: AdminNote
      ) => {
        const name = [
          note.author
            ?.first_name,
          note.author
            ?.last_name,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();

        return (
          name ||
          copy.verifications
            .actors
            .admin
        );
      },
      [
        copy.verifications
          .actors
          .admin,
      ]
    );

  const loadSubmissions =
    useCallback(
      async () => {
        setIsLoading(true);
        setError("");

        try {
          const response =
            await fetch(
              `/api/admin/verifications?status=${encodeURIComponent(
                statusFilter
              )}`,
              {
                method:
                  "GET",
                cache:
                  "no-store",
              }
            );

          const payload =
            (await response.json()) as
              ApiResponse;

          if (
            !response.ok
          ) {
            throw new Error(
              getPlatformDoctorApiMessage(
                locale,
                payload.code,
                payload.error ??
                  copy.verifications
                    .states
                    .loadFailed
              )
            );
          }

          const nextSubmissions =
            payload.submissions ??
            [];

          setSubmissions(
            nextSubmissions
          );

          setSelectedId(
            (
              current
            ) => {
              if (
                current &&
                nextSubmissions.some(
                  (
                    submission
                  ) =>
                    submission.id ===
                    current
                )
              ) {
                return current;
              }

              return (
                nextSubmissions[0]
                  ?.id ??
                null
              );
            }
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : copy.verifications
                  .states
                  .loadFailed
          );

          setSubmissions(
            []
          );

          setSelectedId(
            null
          );
        } finally {
          setIsLoading(
            false
          );
        }
      },
      [
        copy.verifications
          .states
          .loadFailed,
        locale,
        statusFilter,
      ]
    );

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  const filteredSubmissions =
    useMemo(() => {
      const normalized =
        search
          .trim()
          .toLowerCase();

      if (!normalized) {
        return submissions;
      }

      return submissions.filter(
        (
          submission
        ) =>
          [
            submission.doctor
              ?.name,
            getDoctorTitle(
              submission
            ),
            submission
              .professional_registration_number,
            submission
              .issuing_authority,
          ]
            .filter(Boolean)
            .some(
              (
                value
              ) =>
                value
                  ?.toLowerCase()
                  .includes(
                    normalized
                  )
            )
      );
    }, [
      getDoctorTitle,
      search,
      submissions,
    ]);

  const selectedSubmission =
    useMemo(
      () =>
        filteredSubmissions.find(
          (
            submission
          ) =>
            submission.id ===
            selectedId
        ) ??
        filteredSubmissions[0] ??
        null,
      [
        filteredSubmissions,
        selectedId,
      ]
    );

  const totalCount =
    submissions.length;

  const submittedCount =
    submissions.filter(
      (
        submission
      ) =>
        submission.status ===
        "submitted"
    ).length;

  const underReviewCount =
    submissions.filter(
      (
        submission
      ) =>
        submission.status ===
        "under_review"
    ).length;

  const verifiedCount =
    submissions.filter(
      (
        submission
      ) =>
        submission.status ===
        "verified"
    ).length;

  async function openDocument(
    documentId: string
  ) {
    setBusyAction(
      `document:${documentId}`
    );

    setError("");

    try {
      const response =
        await fetch(
          `/api/admin/verifications?documentId=${encodeURIComponent(
            documentId
          )}`,
          {
            method:
              "GET",
            cache:
              "no-store",
          }
        );

      const payload =
        (await response.json()) as
          ApiResponse;

      if (
        !response.ok ||
        !payload.signedUrl
      ) {
        throw new Error(
          getPlatformDoctorApiMessage(
            locale,
            payload.code,
            payload.error ??
              copy.verifications
                .states
                .documentFailed
          )
        );
      }

      window.open(
        payload.signedUrl,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (
      documentError
    ) {
      setError(
        documentError instanceof
          Error
          ? documentError.message
          : copy.verifications
              .states
              .documentFailed
      );
    } finally {
      setBusyAction(
        null
      );
    }
  }

  async function reviewSubmission(
    action:
      ReviewAction
  ) {
    if (
      !selectedSubmission ||
      busyAction
    ) {
      return;
    }

    if (
      action ===
        "reject" &&
      !rejectionReason
        .trim()
    ) {
      setError(
        copy.verifications
          .states
          .rejectionRequired
      );
      return;
    }

    const confirmations:
      Partial<
        Record<
          ReviewAction,
          string
        >
      > = {
        approve:
          copy.verifications
            .detail
            .approveConfirm,
        reject:
          copy.verifications
            .detail
            .rejectConfirm,
        mark_expired:
          copy.verifications
            .detail
            .expireConfirm,
      };

    const confirmation =
      confirmations[
        action
      ];

    if (
      confirmation &&
      !window.confirm(
        confirmation
      )
    ) {
      return;
    }

    setBusyAction(
      action
    );

    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/verifications",
          {
            method:
              "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                submissionId:
                  selectedSubmission.id,
                action,
                rejectionReason:
                  action ===
                  "reject"
                    ? rejectionReason.trim()
                    : null,
                privateNote:
                  privateNote
                    .trim() ||
                  null,
              }),
          }
        );

      const payload =
        (await response.json()) as
          ApiResponse;

      const fallback =
        (
          {
            start_review:
              copy
                .verifications
                .detail
                .startReview,
            approve:
              copy
                .verifications
                .detail
                .approve,
            reject:
              copy
                .verifications
                .detail
                .reject,
            mark_expired:
              copy
                .verifications
                .detail
                .markExpired,
          } as const
        )[
          action
        ];

      const resolved =
        getPlatformDoctorApiMessage(
          locale,
          payload.code,
          payload.message ??
            payload.error ??
            fallback
        );

      if (
        !response.ok
      ) {
        throw new Error(
          resolved
        );
      }

      setMessage(
        resolved
      );

      setRejectionReason(
        ""
      );

      setPrivateNote(
        ""
      );

      await loadSubmissions();
    } catch (
      reviewError
    ) {
      setError(
        reviewError instanceof
          Error
          ? reviewError.message
          : copy.verifications
              .states
              .updateFailed
      );
    } finally {
      setBusyAction(
        null
      );
    }
  }

  const documentTypeLabels =
    copy.verifications
      .documentTypes as
      Record<
        string,
        string
      >;

  const auditEventLabels =
    copy.verifications
      .auditEvents as
      Record<
        AuditEvent["event_type"],
        string
      >;

  return (
    <section className="space-y-[21px]">
      <section className="grid gap-[13px] sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label:
              copy.verifications
                .metrics
                .total,
            value:
              totalCount,
            className:
              "text-gray-900",
          },
          {
            label:
              copy.verifications
                .metrics
                .submitted,
            value:
              submittedCount,
            className:
              "text-amber-800",
          },
          {
            label:
              copy.verifications
                .metrics
                .underReview,
            value:
              underReviewCount,
            className:
              "text-blue-700",
          },
          {
            label:
              copy.verifications
                .metrics
                .verified,
            value:
              verifiedCount,
            className:
              "text-emerald-700",
          },
        ].map(
          (
            metric
          ) => (
            <div
              key={
                metric.label
              }
              className="rounded-[13px] border border-gray-200 bg-white p-[21px] shadow-sm"
            >
              <p className="text-sm font-semibold text-gray-500">
                {
                  metric.label
                }
              </p>
              <p
                className={`mt-[8px] text-3xl font-bold ${metric.className}`}
              >
                {
                  metric.value
                }
              </p>
            </div>
          )
        )}
      </section>

      <div className="rounded-[13px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <div className="grid gap-[13px] md:grid-cols-[minmax(0,1fr)_14rem_auto] md:items-end">
          <label>
            <span className="text-sm font-semibold text-gray-800">
              {
                copy.verifications
                  .filters
                  .searchLabel
              }
            </span>
            <input
              type="search"
              value={
                search
              }
              onChange={(
                event: { target: { value: string } }
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder={
                copy.verifications
                  .filters
                  .searchPlaceholder
              }
              className="romdoc-focus-ring mt-[8px] block w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px] text-sm text-gray-900"
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-gray-800">
              {
                copy.verifications
                  .filters
                  .statusLabel
              }
            </span>
            <select
              value={
                statusFilter
              }
              onChange={(
                event: { target: { value: string } }
              ) =>
                setStatusFilter(
                  event.target
                    .value as
                    StatusFilter
                )
              }
              className="romdoc-focus-ring mt-[8px] block w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm text-gray-900"
            >
              <option value="all">
                {
                  copy.verifications
                    .filters
                    .all
                }
              </option>
              {(
                Object.keys(
                  statusLabels
                ) as
                  VerificationStatus[]
              ).map(
                (
                  value
                ) => (
                  <option
                    key={
                      value
                    }
                    value={
                      value
                    }
                  >
                    {
                      statusLabels[
                        value
                      ]
                    }
                  </option>
                )
              )}
            </select>
          </label>

          <button
            type="button"
            onClick={() =>
              void loadSubmissions()
            }
            disabled={
              isLoading
            }
            className="romdoc-focus-ring rounded-[13px] border border-gray-300 px-[13px] py-[13px] text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading
              ? copy.common
                  .loading
              : copy.common
                  .reload}
          </button>
        </div>

        <p className="mt-[8px] text-xs text-gray-500">
          {interpolatePlatformDoctorCopy(
            copy.common.showing,
            {
              filtered:
                filteredSubmissions.length,
              total:
                submissions.length,
            }
          )}
        </p>
      </div>

      {message && (
        <div
          role="status"
          className="rounded-[13px] border border-emerald-200 bg-emerald-50 px-[13px] py-[13px] text-sm text-emerald-800"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-[13px] border border-red-200 bg-red-50 px-[13px] py-[13px] text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-[13px] border border-gray-200 bg-white p-[34px] text-center text-sm text-gray-600 shadow-sm">
          {
            copy.verifications
              .states
              .loading
          }
        </div>
      ) : filteredSubmissions.length ===
        0 ? (
        <div className="rounded-[13px] border border-dashed border-gray-300 bg-white p-[34px] text-center shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            {
              copy.verifications
                .states
                .emptyTitle
            }
          </h2>

          <p className="mt-[8px] text-sm text-gray-600">
            {
              copy.verifications
                .states
                .emptyDescription
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-[21px] xl:grid-cols-[21rem_minmax(0,1fr)]">
          <div className="space-y-[8px]">
            {filteredSubmissions.map(
              (
                submission
              ) => {
                const selected =
                  submission.id ===
                  selectedSubmission
                    ?.id;

                return (
                  <button
                    key={
                      submission.id
                    }
                    type="button"
                    onClick={() => {
                      setSelectedId(
                        submission.id
                      );

                      setRejectionReason(
                        ""
                      );

                      setPrivateNote(
                        ""
                      );

                      setMessage(
                        ""
                      );

                      setError(
                        ""
                      );
                    }}
                    className={`romdoc-focus-ring w-full rounded-[13px] border p-[13px] text-left shadow-sm transition ${
                      selected
                        ? "border-[#036661] bg-emerald-50/50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-[8px]">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {submission
                            .doctor
                            ?.name ??
                            copy
                              .verifications
                              .queue
                              .unknownDoctor}
                        </p>

                        <p className="mt-[5px] text-xs text-gray-500">
                          {getDoctorTitle(
                            submission
                          )}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-[8px] py-[5px] text-xs font-semibold ${getStatusClasses(
                          submission.status
                        )}`}
                      >
                        {
                          statusLabels[
                            submission
                              .status
                          ]
                        }
                      </span>
                    </div>

                    <p className="mt-[8px] text-xs text-gray-500">
                      {interpolatePlatformDoctorCopy(
                        copy
                          .verifications
                          .queue
                          .submittedAt,
                        {
                          date:
                            formatDate(
                              submission.submitted_at
                            ),
                        }
                      )}
                    </p>
                  </button>
                );
              }
            )}
          </div>

          {selectedSubmission && (
            <article className="space-y-[21px] rounded-[13px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
              <div className="flex flex-col gap-[13px] border-b border-gray-200 pb-[21px] sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#036661]">
                    {
                      copy.verifications
                        .detail
                        .eyebrow
                    }
                  </p>

                  <h2 className="mt-[5px] text-2xl font-bold text-gray-900">
                    {selectedSubmission
                      .doctor
                      ?.name ??
                      copy
                        .verifications
                        .queue
                        .unknownDoctor}
                  </h2>

                  {selectedSubmission.doctor && (
                    <Link
                      href={`/doctor/${selectedSubmission.doctor.slug}`}
                      target="_blank"
                      className="romdoc-focus-ring mt-[8px] inline-flex rounded-md text-sm font-semibold text-[#036661] underline-offset-4 hover:underline"
                    >
                      {
                        copy.common
                          .publicProfile
                      }
                    </Link>
                  )}
                </div>

                <span
                  className={`self-start rounded-full px-[13px] py-[8px] text-sm font-semibold ${getStatusClasses(
                    selectedSubmission.status
                  )}`}
                >
                  {
                    statusLabels[
                      selectedSubmission
                        .status
                    ]
                  }
                </span>
              </div>

              <dl className="grid gap-[13px] sm:grid-cols-2">
                {[
                  {
                    label:
                      copy
                        .verifications
                        .detail
                        .professionalNumber,
                    value:
                      selectedSubmission
                        .professional_registration_number,
                  },
                  {
                    label:
                      copy
                        .verifications
                        .detail
                        .issuingAuthority,
                    value:
                      selectedSubmission
                        .issuing_authority,
                  },
                  {
                    label:
                      copy
                        .verifications
                        .detail
                        .professionalTitle,
                    value:
                      selectedSubmission
                        .professional_title,
                  },
                  {
                    label:
                      copy
                        .verifications
                        .detail
                        .countryExpiry,
                    value:
                      `${selectedSubmission.registration_country} · ${formatDate(
                        selectedSubmission.registration_expires_at
                      )}`,
                  },
                ].map(
                  (
                    item
                  ) => (
                    <div
                      key={
                        item.label
                      }
                      className="rounded-[13px] bg-gray-50 p-[13px]"
                    >
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {
                          item.label
                        }
                      </dt>
                      <dd className="mt-[5px] text-sm font-medium text-gray-900">
                        {item.value ||
                          copy
                            .common
                            .none}
                      </dd>
                    </div>
                  )
                )}
              </dl>

              <details
                open={
                  selectedSubmission
                    .documents
                    .length > 0 &&
                  (
                    selectedSubmission.status ===
                      "submitted" ||
                    selectedSubmission.status ===
                      "under_review"
                  )
                }
                className="group rounded-[13px] border border-gray-200"
              >
                <summary className="romdoc-focus-ring flex cursor-pointer list-none items-center justify-between gap-[13px] rounded-[13px] p-[13px]">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {
                      copy.verifications
                        .detail
                        .documents
                    }{" "}
                    (
                    {
                      selectedSubmission
                        .documents
                        .length
                    }
                    )
                  </h3>
                  <span
                    aria-hidden="true"
                    className="text-lg text-gray-500 transition group-open:rotate-180"
                  >
                    ⌄
                  </span>
                </summary>

                <div className="border-t border-gray-200 p-[13px]">
                  {selectedSubmission
                    .documents
                    .length ===
                  0 ? (
                    <p className="rounded-[13px] border border-dashed border-gray-300 p-[13px] text-sm text-gray-600">
                      {
                        copy.verifications
                          .detail
                          .noDocuments
                      }
                    </p>
                  ) : (
                    <div className="space-y-[8px]">
                      {selectedSubmission.documents.map(
                        (
                          document
                        ) => (
                          <div
                            key={
                              document.id
                            }
                            className="flex flex-col gap-[13px] rounded-[13px] border border-gray-200 p-[13px] sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {
                                  document.original_file_name
                                }
                              </p>
                              <p className="mt-[5px] text-xs text-gray-500">
                                {documentTypeLabels[
                                  document
                                    .document_type
                                ] ??
                                  documentTypeLabels
                                    .unknown}{" "}
                                ·{" "}
                                {formatFileSize(
                                  document.file_size_bytes
                                )}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                void openDocument(
                                  document.id
                                )
                              }
                              disabled={
                                Boolean(
                                  busyAction
                                )
                              }
                              className="romdoc-focus-ring rounded-[13px] border border-[#036661] px-[13px] py-[8px] text-sm font-semibold text-[#036661] transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {busyAction ===
                              `document:${document.id}`
                                ? copy
                                    .verifications
                                    .detail
                                    .opening
                                : copy
                                    .verifications
                                    .detail
                                    .openDocument}
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </details>

              {selectedSubmission.rejection_reason && (
                <section className="rounded-[13px] border border-red-200 bg-red-50 p-[13px]">
                  <h3 className="text-sm font-semibold text-red-900">
                    {
                      copy.verifications
                        .detail
                        .rejectionReason
                    }
                  </h3>
                  <p className="mt-[8px] whitespace-pre-wrap text-sm text-red-800">
                    {
                      selectedSubmission.rejection_reason
                    }
                  </p>
                </section>
              )}

              <details className="group rounded-[13px] border border-gray-200">
                <summary className="romdoc-focus-ring flex cursor-pointer list-none items-center justify-between gap-[13px] rounded-[13px] p-[13px]">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {
                        copy.verifications
                          .detail
                          .audit
                      }
                    </h3>
                    <p className="mt-[5px] text-sm text-gray-600">
                      {
                        copy.verifications
                          .detail
                          .auditDescription
                      }
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="text-lg text-gray-500 transition group-open:rotate-180"
                  >
                    ⌄
                  </span>
                </summary>

                <div className="border-t border-gray-200 p-[13px]">
                  {selectedSubmission
                    .audit_events
                    .length ===
                  0 ? (
                    <p className="rounded-[13px] border border-dashed border-gray-300 p-[13px] text-sm text-gray-600">
                      {
                        copy.verifications
                          .detail
                          .noAudit
                      }
                    </p>
                  ) : (
                    <ol className="space-y-[13px] border-l-2 border-gray-200 pl-[21px]">
                      {selectedSubmission.audit_events.map(
                        (
                          event
                        ) => (
                          <li
                            key={
                              event.id
                            }
                            className="relative"
                          >
                            <span
                              aria-hidden="true"
                              className="absolute -left-[27px] top-1.5 h-[13px] w-[13px] rounded-full border-2 border-white bg-[#036661] shadow"
                            />

                            <p className="text-sm font-semibold text-gray-900">
                              {
                                auditEventLabels[
                                  event
                                    .event_type
                                ]
                              }
                            </p>

                            <p className="mt-[5px] text-xs text-gray-500">
                              {getActorName(
                                event
                              )}{" "}
                              ·{" "}
                              {formatDate(
                                event.created_at
                              )}
                            </p>

                            {event.from_status &&
                              event.from_status !==
                                event.to_status && (
                                <p className="mt-[5px] text-xs text-gray-500">
                                  {(
                                    statusLabels as
                                      Record<
                                        string,
                                        string
                                      >
                                  )[
                                    event.from_status
                                  ] ??
                                    event.from_status}{" "}
                                  →{" "}
                                  {(
                                    statusLabels as
                                      Record<
                                        string,
                                        string
                                      >
                                  )[
                                    event.to_status
                                  ] ??
                                    event.to_status}
                                </p>
                              )}
                          </li>
                        )
                      )}
                    </ol>
                  )}
                </div>
              </details>

              <details className="group rounded-[13px] border border-gray-200">
                <summary className="romdoc-focus-ring flex cursor-pointer list-none items-center justify-between gap-[13px] rounded-[13px] p-[13px]">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {
                      copy.verifications
                        .detail
                        .internalNotes
                    }{" "}
                    (
                    {
                      selectedSubmission
                        .admin_notes
                        .length
                    }
                    )
                  </h3>
                  <span
                    aria-hidden="true"
                    className="text-lg text-gray-500 transition group-open:rotate-180"
                  >
                    ⌄
                  </span>
                </summary>

                <div className="border-t border-gray-200 p-[13px]">
                  {selectedSubmission
                    .admin_notes
                    .length >
                  0 ? (
                    <div className="space-y-[8px]">
                      {selectedSubmission.admin_notes.map(
                        (
                          note
                        ) => (
                          <div
                            key={
                              note.id
                            }
                            className="rounded-[13px] border border-gray-200 bg-gray-50 p-[13px]"
                          >
                            <p className="whitespace-pre-wrap text-sm text-gray-800">
                              {
                                note.note
                              }
                            </p>
                            <p className="mt-[8px] text-xs text-gray-500">
                              {getNoteAuthor(
                                note
                              )}{" "}
                              ·{" "}
                              {formatDate(
                                note.created_at
                              )}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      {
                        copy.verifications
                          .detail
                          .noNotes
                      }
                    </p>
                  )}

                  {(
                    selectedSubmission.status ===
                      "submitted" ||
                    selectedSubmission.status ===
                      "under_review" ||
                    selectedSubmission.status ===
                      "verified"
                  ) && (
                    <textarea
                      value={
                        privateNote
                      }
                      onChange={(
                        event: { target: { value: string } }
                      ) =>
                        setPrivateNote(
                          event.target
                            .value
                        )
                      }
                      maxLength={
                        5000
                      }
                      rows={
                        4
                      }
                      placeholder={
                        copy.verifications
                          .detail
                          .notePlaceholder
                      }
                      className="romdoc-focus-ring mt-[13px] block w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px] text-sm text-gray-900"
                    />
                  )}
                </div>
              </details>

              {selectedSubmission.status ===
                "rejected" ||
              selectedSubmission.status ===
                "expired" ? null : (
                <section className="space-y-[13px] border-t border-gray-200 pt-[21px]">
                  {selectedSubmission.status ===
                    "under_review" && (
                    <label>
                      <span className="text-sm font-semibold text-gray-800">
                        {
                          copy.verifications
                            .detail
                            .rejectionReason
                        }
                      </span>

                      <textarea
                        value={
                          rejectionReason
                        }
                        onChange={(
                          event: { target: { value: string } }
                        ) =>
                          setRejectionReason(
                            event.target
                              .value
                          )
                        }
                        maxLength={
                          2000
                        }
                        rows={
                          4
                        }
                        placeholder={
                          copy.verifications
                            .detail
                            .rejectionPlaceholder
                        }
                        className="romdoc-focus-ring mt-[8px] block w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px] text-sm text-gray-900"
                      />
                    </label>
                  )}

                  <div className="flex flex-wrap gap-[13px]">
                    {selectedSubmission.status ===
                      "submitted" && (
                      <Button
                        type="button"
                        onClick={() =>
                          void reviewSubmission(
                            "start_review"
                          )
                        }
                        disabled={
                          Boolean(
                            busyAction
                          )
                        }
                      >
                        {busyAction ===
                        "start_review"
                          ? copy
                              .verifications
                              .detail
                              .startingReview
                          : copy
                              .verifications
                              .detail
                              .startReview}
                      </Button>
                    )}

                    {selectedSubmission.status ===
                      "under_review" && (
                      <>
                        <Button
                          type="button"
                          onClick={() =>
                            void reviewSubmission(
                              "approve"
                            )
                          }
                          disabled={
                            Boolean(
                              busyAction
                            )
                          }
                        >
                          {busyAction ===
                          "approve"
                            ? copy
                                .verifications
                                .detail
                                .approving
                            : copy
                                .verifications
                                .detail
                                .approve}
                        </Button>

                        <button
                          type="button"
                          onClick={() =>
                            void reviewSubmission(
                              "reject"
                            )
                          }
                          disabled={
                            Boolean(
                              busyAction
                            )
                          }
                          className="romdoc-focus-ring rounded-[13px] bg-red-600 px-[21px] py-[13px] text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busyAction ===
                          "reject"
                            ? copy
                                .verifications
                                .detail
                                .rejecting
                            : copy
                                .verifications
                                .detail
                                .reject}
                        </button>
                      </>
                    )}

                    {selectedSubmission.status ===
                      "verified" && (
                      <button
                        type="button"
                        onClick={() =>
                          void reviewSubmission(
                            "mark_expired"
                          )
                        }
                        disabled={
                          Boolean(
                            busyAction
                          )
                        }
                        className="romdoc-focus-ring rounded-[13px] border border-gray-300 px-[21px] py-[13px] text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyAction ===
                        "mark_expired"
                          ? copy
                              .verifications
                              .detail
                              .updating
                          : copy
                              .verifications
                              .detail
                              .markExpired}
                      </button>
                    )}
                  </div>
                </section>
              )}
            </article>
          )}
        </div>
      )}
    </section>
  );
}
