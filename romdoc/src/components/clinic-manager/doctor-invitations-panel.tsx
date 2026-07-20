"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  useRouter,
} from "next/navigation";
import {
  type FormEvent,
  useMemo,
  useState,
} from "react";

import {
  type AppLocale,
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type ClinicOrganizationOption = {
  id: string;
  name: string;
  status: string;
};

type DoctorInvitation = {
  id: string;
  organization_id: string;

  invited_doctor_email:
    | string
    | null;

  invitation_status: string;
  payment_responsibility: string;
  coverage_status: string;

  expires_at:
    | string
    | null;

  created_at: string;
};

type DoctorInvitationsPanelProps = {
  organizations:
    ClinicOrganizationOption[];

  invitations:
    DoctorInvitation[];
};

type InvitationResponse = {
  message?: string;
  error?: string;
  inviteUrl?: string;
  emailSent?: boolean;

  emailError?:
    | string
    | null;
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

function statusClasses(
  status:
    string
) {
  switch (
    status
  ) {
    case "accepted":
    case "active":
      return "border-green-200 bg-green-50 text-green-800";

    case "pending":
    case "none":
      return "border-amber-200 bg-amber-50 text-amber-900";

    case "paused":
      return "border-orange-200 bg-orange-50 text-orange-900";

    case "declined":
    case "expired":
    case "cancelled":
    case "ended":
      return "border-red-200 bg-red-50 text-red-800";

    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;

  value:
    number;

  helper: string;
}) {
  return (
    <div className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-[8px] text-3xl font-bold text-gray-900">
        {value}
      </p>

      <p className="mt-[8px] text-sm leading-6 text-gray-600">
        {helper}
      </p>
    </div>
  );
}

export default function DoctorInvitationsPanel({
  organizations,
  invitations,
}: DoctorInvitationsPanelProps) {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "ClinicOrganisationDashboard.invitationsPanel"
    );

  const router =
    useRouter();

  const activeOrganizations =
    useMemo(
      () =>
        organizations.filter(
          (
            organization
          ) =>
            organization.status ===
            "active"
        ),
      [
        organizations,
      ]
    );

  const [
    organizationId,
    setOrganizationId,
  ] =
    useState(
      activeOrganizations[0]
        ?.id ??
      ""
    );

  const [
    doctorEmail,
    setDoctorEmail,
  ] =
    useState(
      ""
    );

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(
      false
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

  const [
    success,
    setSuccess,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    warning,
    setWarning,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    inviteUrl,
    setInviteUrl,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    copyMessage,
    setCopyMessage,
  ] =
    useState<
      string | null
    >(
      null
    );

  const organizationNameById =
    useMemo(
      () =>
        new Map(
          organizations.map(
            (
              organization
            ) => [
              organization.id,
              organization.name,
            ]
          )
        ),
      [
        organizations,
      ]
    );

  const pendingCount =
    invitations.filter(
      (
        invitation
      ) =>
        invitation.invitation_status ===
        "pending"
    ).length;

  const acceptedCount =
    invitations.filter(
      (
        invitation
      ) =>
        invitation.invitation_status ===
        "accepted"
    ).length;

  const activeCoverageCount =
    invitations.filter(
      (
        invitation
      ) =>
        invitation.coverage_status ===
        "active"
    ).length;

  const closedCount =
    invitations.filter(
      (
        invitation
      ) =>
        [
          "declined",
          "expired",
          "cancelled",
        ].includes(
          invitation.invitation_status
        )
    ).length;

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
          day:
            "2-digit",

          month:
            "long",

          year:
            "numeric",
        }
      )
      .format(
        new Date(
          value
        )
      );
  }

  function invitationStatusLabel(
    status:
      string
  ) {
    const normalized =
      [
        "pending",
        "accepted",
        "declined",
        "expired",
        "cancelled",
      ].includes(
        status
      )
        ? status
        : "pending";

    return t(
      `statuses.invitation.${normalized}`
    );
  }

  function coverageStatusLabel(
    status:
      string
  ) {
    const normalized =
      [
        "active",
        "paused",
        "cancelled",
        "ended",
        "none",
      ].includes(
        status
      )
        ? status
        : "pending";

    return t(
      `statuses.coverage.${normalized}`
    );
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      isSubmitting
    ) {
      return;
    }

    setIsSubmitting(
      true
    );

    setError(
      null
    );

    setSuccess(
      null
    );

    setWarning(
      null
    );

    setInviteUrl(
      null
    );

    setCopyMessage(
      null
    );

    try {
      const response =
        await fetch(
          "/api/clinic-manager/invitations",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                organizationId,
                doctorEmail,
                locale,
              }),
          }
        );

      const result =
        (await response.json()) as
          InvitationResponse;

      if (
        !response.ok
      ) {
        throw new Error(
          locale ===
            "ro" &&
          result.error
            ? result.error
            : t(
                "createError"
              )
        );
      }

      const emailWasSent =
        result.emailSent !==
        false;

      setSuccess(
        emailWasSent
          ? t(
              "created"
            )
          : t(
              "createdWithoutEmail"
            )
      );

      if (
        !emailWasSent
      ) {
        setWarning(
          t(
            "emailDeliveryWarning"
          )
        );
      }

      setInviteUrl(
        result.inviteUrl ??
        null
      );

      setDoctorEmail(
        ""
      );

      router.refresh();
    } catch (
      submitError
    ) {
      setError(
        submitError instanceof
          Error
          ? submitError.message
          : t(
              "createError"
            )
      );
    } finally {
      setIsSubmitting(
        false
      );
    }
  }

  async function copyInviteUrl() {
    if (
      !inviteUrl
    ) {
      return;
    }

    try {
      await navigator.clipboard
        .writeText(
          inviteUrl
        );

      setCopyMessage(
        t(
          "copied"
        )
      );
    } catch {
      setCopyMessage(
        t(
          "copyManual"
        )
      );
    }
  }

  function StatusBadge({
    value,
    type,
  }: {
    value: string;

    type:
      | "invitation"
      | "coverage";
  }) {
    return (
      <span
        className={`inline-flex rounded-full border px-[8px] py-[5px] text-xs font-semibold ${statusClasses(
          value
        )}`}
      >
        {type ===
        "invitation"
          ? invitationStatusLabel(
              value
            )
          : coverageStatusLabel(
              value
            )}
      </span>
    );
  }

  function InvitationDetails({
    invitation,
    compact = false,
  }: {
    invitation:
      DoctorInvitation;

    compact?: boolean;
  }) {
    const doctor =
      invitation.invited_doctor_email ??
      t(
        "associatedDoctor"
      );

    const organization =
      organizationNameById.get(
        invitation.organization_id
      ) ??
      "—";

    const payment =
      invitation.payment_responsibility ===
      "clinic_paid"
        ? t(
            "clinicPaid"
          )
        : t(
            "individualPaid"
          );

    if (
      compact
    ) {
      return (
        <article className="rounded-[13px] border border-gray-200 bg-white p-[13px]">
          <div className="flex flex-wrap items-start justify-between gap-[8px]">
            <div className="min-w-0">
              <p className="break-all font-semibold text-gray-900">
                {doctor}
              </p>

              <p className="mt-[5px] text-sm text-gray-600">
                {
                  organization
                }
              </p>
            </div>

            <StatusBadge
              value={
                invitation.invitation_status
              }
              type="invitation"
            />
          </div>

          <dl className="mt-[13px] grid gap-[8px] text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t(
                  "coverage"
                )}
              </dt>

              <dd className="mt-[5px]">
                <StatusBadge
                  value={
                    invitation.coverage_status
                  }
                  type="coverage"
                />
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t(
                  "payment"
                )}
              </dt>

              <dd className="mt-[5px] text-gray-700">
                {
                  payment
                }
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t(
                  "createdAt"
                )}
              </dt>

              <dd className="mt-[5px] text-gray-700">
                {formatDate(
                  invitation.created_at
                )}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t(
                  "expiresAt"
                )}
              </dt>

              <dd className="mt-[5px] text-gray-700">
                {formatDate(
                  invitation.expires_at
                )}
              </dd>
            </div>
          </dl>
        </article>
      );
    }

    return (
      <tr>
        <td className="px-[13px] py-[13px] font-medium text-gray-900">
          {doctor}
        </td>

        <td className="px-[13px] py-[13px] text-gray-700">
          {
            organization
          }
        </td>

        <td className="px-[13px] py-[13px]">
          <StatusBadge
            value={
              invitation.invitation_status
            }
            type="invitation"
          />
        </td>

        <td className="px-[13px] py-[13px] text-gray-700">
          {
            payment
          }
        </td>

        <td className="px-[13px] py-[13px]">
          <StatusBadge
            value={
              invitation.coverage_status
            }
            type="coverage"
          />
        </td>

        <td className="px-[13px] py-[13px] text-gray-700">
          {formatDate(
            invitation.created_at
          )}
        </td>

        <td className="px-[13px] py-[13px] text-gray-700">
          {formatDate(
            invitation.expires_at
          )}
        </td>
      </tr>
    );
  }

  return (
    <div className="space-y-[21px]">
      <div className="grid gap-[13px] sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label={t(
            "summary.pending"
          )}
          value={
            pendingCount
          }
          helper={t(
            "summary.pendingHelper"
          )}
        />

        <SummaryCard
          label={t(
            "summary.accepted"
          )}
          value={
            acceptedCount
          }
          helper={t(
            "summary.acceptedHelper"
          )}
        />

        <SummaryCard
          label={t(
            "summary.activeCoverage"
          )}
          value={
            activeCoverageCount
          }
          helper={t(
            "summary.activeCoverageHelper"
          )}
        />

        <SummaryCard
          label={t(
            "summary.closed"
          )}
          value={
            closedCount
          }
          helper={t(
            "summary.closedHelper"
          )}
        />
      </div>

      <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">
          {t(
            "inviteTitle"
          )}
        </h2>

        <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
          {t(
            "inviteDescription"
          )}
        </p>

        {activeOrganizations.length ===
        0 ? (
          <div className="mt-[21px] rounded-[13px] border border-amber-200 bg-amber-50 p-[13px] text-sm leading-6 text-amber-900">
            {t(
              "noActiveOrganization"
            )}
          </div>
        ) : (
          <form
            onSubmit={
              handleSubmit
            }
            className="mt-[21px] grid gap-[13px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end"
          >
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t(
                  "organization"
                )}
              </span>

              <select
                value={
                  organizationId
                }
                onChange={(
                  event
                ) =>
                  setOrganizationId(
                    event.target
                      .value
                  )
                }
                disabled={
                  isSubmitting
                }
                className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[8px] text-sm text-gray-900"
                required
              >
                {activeOrganizations.map(
                  (
                    organization
                  ) => (
                    <option
                      key={
                        organization.id
                      }
                      value={
                        organization.id
                      }
                    >
                      {
                        organization.name
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t(
                  "doctorEmail"
                )}
              </span>

              <input
                type="email"
                value={
                  doctorEmail
                }
                onChange={(
                  event
                ) =>
                  setDoctorEmail(
                    event.target
                      .value
                  )
                }
                disabled={
                  isSubmitting
                }
                placeholder="doctor@example.com"
                className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[8px] text-sm text-gray-900"
                required
              />
            </label>

            <button
              type="submit"
              disabled={
                isSubmitting
              }
              className="romdoc-focus-ring min-h-[44px] rounded-[13px] bg-[#036661] px-[21px] py-[8px] text-sm font-semibold text-white transition hover:bg-[#024d49] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? t(
                    "sending"
                  )
                : t(
                    "send"
                  )}
            </button>
          </form>
        )}

        {error && (
          <div
            role="alert"
            className="mt-[21px] rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mt-[21px] rounded-[13px] border border-green-200 bg-green-50 p-[13px] text-sm leading-6 text-green-800"
          >
            <p>
              {
                success
              }
            </p>

            {warning && (
              <p className="mt-[8px] font-semibold text-amber-800">
                {
                  warning
                }
              </p>
            )}

            {inviteUrl && (
              <div className="mt-[13px] space-y-[8px]">
                <p className="text-xs font-semibold uppercase tracking-wide text-green-900">
                  {t(
                    "inviteLink"
                  )}
                </p>

                <div className="flex flex-col gap-[8px] rounded-[8px] bg-white p-[13px] text-xs text-gray-700 sm:flex-row sm:items-center sm:justify-between">
                  <span className="break-all">
                    {
                      inviteUrl
                    }
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      void copyInviteUrl()
                    }
                    className="romdoc-focus-ring shrink-0 rounded-[8px] border border-green-300 px-[13px] py-[8px] font-semibold text-green-800 hover:bg-green-50"
                  >
                    {t(
                      "copy"
                    )}
                  </button>
                </div>

                {copyMessage && (
                  <p className="text-xs text-green-900">
                    {
                      copyMessage
                    }
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-[13px]">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {t(
                "historyTitle"
              )}
            </h2>

            <p className="mt-[8px] text-sm leading-6 text-gray-600">
              {t(
                "historyDescription"
              )}
            </p>
          </div>

          <span className="rounded-full bg-[#F0EEE9] px-[13px] py-[5px] text-sm font-semibold text-gray-700">
            {t(
              "count",
              {
                count:
                  invitations.length,
              }
            )}
          </span>
        </div>

        {invitations.length ===
        0 ? (
          <div className="mt-[21px] rounded-[13px] border border-dashed border-gray-300 bg-gray-50 p-[21px] text-sm leading-6 text-gray-600">
            {t(
              "empty"
            )}
          </div>
        ) : (
          <>
            <div className="mt-[21px] space-y-[13px] md:hidden">
              {invitations.map(
                (
                  invitation
                ) => (
                  <InvitationDetails
                    key={
                      invitation.id
                    }
                    invitation={
                      invitation
                    }
                    compact
                  />
                )
              )}
            </div>

            <div className="mt-[21px] hidden overflow-hidden rounded-[13px] border border-gray-200 md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-[13px] py-[13px]">
                        {t(
                          "doctor"
                        )}
                      </th>

                      <th className="px-[13px] py-[13px]">
                        {t(
                          "organization"
                        )}
                      </th>

                      <th className="px-[13px] py-[13px]">
                        {t(
                          "invitation"
                        )}
                      </th>

                      <th className="px-[13px] py-[13px]">
                        {t(
                          "payment"
                        )}
                      </th>

                      <th className="px-[13px] py-[13px]">
                        {t(
                          "coverage"
                        )}
                      </th>

                      <th className="px-[13px] py-[13px]">
                        {t(
                          "createdAt"
                        )}
                      </th>

                      <th className="px-[13px] py-[13px]">
                        {t(
                          "expiresAt"
                        )}
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 bg-white">
                    {invitations.map(
                      (
                        invitation
                      ) => (
                        <InvitationDetails
                          key={
                            invitation.id
                          }
                          invitation={
                            invitation
                          }
                        />
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
