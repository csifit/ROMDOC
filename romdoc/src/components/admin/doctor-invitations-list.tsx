"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocale } from "next-intl";

import { normalizeAppLocale } from "@/lib/i18n/app-locale";
import {
  getPlatformDoctorApiMessage,
  getPlatformOperatorDoctors,
  interpolatePlatformDoctorCopy,
  PLATFORM_OPERATOR_DOCTOR_LOCALE_TAGS,
} from "@/lib/i18n/platform-operator-doctors";
import type { PlatformOperatorDoctorApiPayload } from "@/lib/api/platform-operator-doctor-codes";

type InvitationStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "expired"
  | "cancelled"
  | "failed";

type DoctorInvitation = {
  id: string;
  email: string;
  normalized_email: string;
  first_name: string;
  last_name: string;
  locale: "ro" | "en";
  personal_message: string | null;
  complimentary_months: number;
  status: InvitationStatus;
  invited_by_profile_id: string;
  auth_user_id: string | null;
  accepted_profile_id: string | null;
  doctor_id: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  resend_count: number;
  last_resent_at: string | null;
  last_resend_failure_at: string | null;
  last_resend_failure_code: string | null;
  last_resend_failure_message: string | null;
  failure_code: string | null;
  failure_message: string | null;
  created_at: string;
  updated_at: string;
};

type InvitationsResponse = PlatformOperatorDoctorApiPayload & {
  invitations?: DoctorInvitation[];
};

type InvitationLinkResponse = {
  code?: string;
  error?: string;
  actionLink?: string;
  expiresAt?: string;
};

type InvitationResendResponse = {
  code?: string;
  error?: string;
  message?: string;
  invitation?: DoctorInvitation;
};

type DoctorInvitationsListProps = {
  refreshKey: number;
};

type LinkCopy = {
  title: string;
  description: string;
  show: string;
  hide: string;
  copy: string;
  copied: string;
  loading: string;
  unavailable: string;
  warning: string;
};

type ResendCopy = {
  title: string;
  description: string;
  action: string;
  sending: string;
  success: string;
  failed: string;
  confirm: string;
  count: string;
  lastResent: string;
  lastFailure: string;
};

const LINK_COPY: Record<"ro" | "en" | "de", LinkCopy> = {
  ro: {
    title: "Link invitație",
    description:
      "Linkul este afișat numai la cerere și poate fi trimis manual medicului.",
    show: "Afișează linkul",
    hide: "Ascunde linkul",
    copy: "Copiază linkul",
    copied: "Link copiat",
    loading: "Se încarcă linkul...",
    unavailable: "Linkul nu este disponibil.",
    warning:
      "Oricine deține acest link poate accepta invitația. Nu îl distribui altei persoane.",
  },
  en: {
    title: "Invitation link",
    description:
      "The link is displayed only on request and can be sent manually to the doctor.",
    show: "Show link",
    hide: "Hide link",
    copy: "Copy link",
    copied: "Link copied",
    loading: "Loading link...",
    unavailable: "The link is unavailable.",
    warning:
      "Anyone with this link can accept the invitation. Do not share it with another person.",
  },
  de: {
    title: "Einladungslink",
    description:
      "Der Link wird nur auf Anforderung angezeigt und kann manuell an den Arzt gesendet werden.",
    show: "Link anzeigen",
    hide: "Link ausblenden",
    copy: "Link kopieren",
    copied: "Link kopiert",
    loading: "Link wird geladen...",
    unavailable: "Der Link ist nicht verfügbar.",
    warning:
      "Jede Person mit diesem Link kann die Einladung annehmen. Geben Sie ihn nicht an andere Personen weiter.",
  },
};

const RESEND_COPY: Record<"ro" | "en" | "de", ResendCopy> = {
  ro: {
    title: "Retrimite invitația",
    description:
      "Generează un link nou, prelungește perioada de valabilitate și trimite din nou e-mailul. Istoricul existent rămâne neschimbat.",
    action: "Retrimite invitația",
    sending: "Se retrimite...",
    success: "Invitația medicului a fost retrimisă.",
    failed: "Invitația nu a putut fi retrimisă.",
    confirm:
      "Retrimiți invitația acestui medic? Linkul anterior va fi înlocuit numai dacă noul e-mail este trimis cu succes.",
    count: "Retrimiteri reușite",
    lastResent: "Ultima retrimitere",
    lastFailure: "Ultima eroare la retrimitere",
  },
  en: {
    title: "Resend invitation",
    description:
      "Generate a new link, extend its validity and send the email again. Existing history remains unchanged.",
    action: "Resend invitation",
    sending: "Resending...",
    success: "The doctor invitation was resent.",
    failed: "The invitation could not be resent.",
    confirm:
      "Resend this doctor invitation? The previous link will be replaced only after the new email is sent successfully.",
    count: "Successful resends",
    lastResent: "Last resent",
    lastFailure: "Last resend error",
  },
  de: {
    title: "Einladung erneut senden",
    description:
      "Einen neuen Link erzeugen, die Gültigkeit verlängern und die E-Mail erneut senden. Der bestehende Verlauf bleibt unverändert.",
    action: "Einladung erneut senden",
    sending: "Wird erneut gesendet...",
    success: "Die Arzteinladung wurde erneut gesendet.",
    failed: "Die Einladung konnte nicht erneut gesendet werden.",
    confirm:
      "Diese Arzteinladung erneut senden? Der vorherige Link wird erst ersetzt, nachdem die neue E-Mail erfolgreich gesendet wurde.",
    count: "Erfolgreiche Wiederholungen",
    lastResent: "Zuletzt erneut gesendet",
    lastFailure: "Letzter Fehler beim erneuten Senden",
  },
};

function getStatusClasses(status: InvitationStatus) {
  switch (status) {
    case "accepted":
      return "bg-green-100 text-green-800";
    case "sent":
      return "bg-blue-100 text-blue-800";
    case "failed":
      return "bg-red-100 text-red-800";
    case "expired":
      return "bg-amber-100 text-amber-800";
    case "cancelled":
      return "bg-gray-200 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function DoctorInvitationsList({
  refreshKey,
}: DoctorInvitationsListProps) {
  const locale = normalizeAppLocale(useLocale());
  const copy = getPlatformOperatorDoctors(locale);
  const linkCopy = LINK_COPY[locale];
  const resendCopy = RESEND_COPY[locale];
  const [invitations, setInvitations] = useState<DoctorInvitation[]>([]);
  const [status, setStatus] = useState<"all" | InvitationStatus>("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedInvitationId, setExpandedInvitationId] =
    useState<string | null>(null);
  const [visibleLinkInvitationId, setVisibleLinkInvitationId] =
    useState<string | null>(null);
  const [invitationLinks, setInvitationLinks] = useState<
    Record<string, string>
  >({});
  const [linkErrors, setLinkErrors] = useState<Record<string, string>>({});
  const [loadingLinkId, setLoadingLinkId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [resendingInvitationId, setResendingInvitationId] =
    useState<string | null>(null);
  const [resendMessages, setResendMessages] = useState<
    Record<string, string>
  >({});
  const [resendErrors, setResendErrors] = useState<Record<string, string>>({});

  const formatDateTime = useCallback(
    (value: string | null) => {
      if (!value) {
        return copy.common.none;
      }

      return new Intl.DateTimeFormat(
        PLATFORM_OPERATOR_DOCTOR_LOCALE_TAGS[locale],
        {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Europe/Bucharest",
        }
      ).format(new Date(value));
    },
    [copy.common.none, locale]
  );

  const loadInvitations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const query =
        status === "all" ? "" : `?status=${encodeURIComponent(status)}`;

      const response = await fetch(
        `/api/admin/doctors/invitations${query}`,
        {
          cache: "no-store",
        }
      );

      const result = (await response.json()) as InvitationsResponse;

      if (!response.ok) {
        throw new Error(
          getPlatformDoctorApiMessage(
            locale,
            result.code,
            result.error ?? copy.invitations.states.loadFailed
          )
        );
      }

      setInvitations(result.invitations ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : copy.invitations.states.loadFailed
      );
    } finally {
      setIsLoading(false);
    }
  }, [copy.invitations.states.loadFailed, locale, status]);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations, refreshKey]);

  const filteredInvitations = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return invitations;
    }

    return invitations.filter((invitation) =>
      [
        invitation.first_name,
        invitation.last_name,
        invitation.email,
        invitation.personal_message,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalized))
    );
  }, [invitations, search]);

  const statusLabels = copy.invitations.statuses as Record<
    InvitationStatus,
    string
  >;

  const loadInvitationLink = useCallback(
    async (invitationId: string) => {
      if (invitationLinks[invitationId]) {
        setVisibleLinkInvitationId(invitationId);
        return;
      }

      setLoadingLinkId(invitationId);
      setLinkErrors((current) => ({
        ...current,
        [invitationId]: "",
      }));

      try {
        const response = await fetch(
          `/api/admin/doctors/invitations/${encodeURIComponent(
            invitationId
          )}/link`,
          {
            cache: "no-store",
          }
        );

        const result = (await response.json()) as InvitationLinkResponse;

        if (!response.ok || !result.actionLink) {
          throw new Error(result.error ?? linkCopy.unavailable);
        }

        setInvitationLinks((current) => ({
          ...current,
          [invitationId]: result.actionLink as string,
        }));
        setVisibleLinkInvitationId(invitationId);
      } catch (linkError) {
        setLinkErrors((current) => ({
          ...current,
          [invitationId]:
            linkError instanceof Error
              ? linkError.message
              : linkCopy.unavailable,
        }));
      } finally {
        setLoadingLinkId(null);
      }
    },
    [invitationLinks, linkCopy.unavailable]
  );

  const copyInvitationLink = useCallback(
    async (invitationId: string) => {
      const actionLink = invitationLinks[invitationId];

      if (!actionLink) {
        return;
      }

      try {
        await navigator.clipboard.writeText(actionLink);
        setCopiedLinkId(invitationId);
        window.setTimeout(() => {
          setCopiedLinkId((current) =>
            current === invitationId ? null : current
          );
        }, 2000);
      } catch {
        setLinkErrors((current) => ({
          ...current,
          [invitationId]: linkCopy.unavailable,
        }));
      }
    },
    [invitationLinks, linkCopy.unavailable]
  );

  const resendInvitation = useCallback(
    async (invitation: DoctorInvitation) => {
      if (!window.confirm(resendCopy.confirm)) {
        return;
      }

      setResendingInvitationId(invitation.id);
      setResendMessages((current) => ({
        ...current,
        [invitation.id]: "",
      }));
      setResendErrors((current) => ({
        ...current,
        [invitation.id]: "",
      }));

      try {
        const response = await fetch(
          `/api/admin/doctors/invitations/${encodeURIComponent(
            invitation.id
          )}/resend`,
          {
            method: "POST",
            cache: "no-store",
          }
        );

        const result = (await response.json()) as InvitationResendResponse;

        if (!response.ok || !result.invitation) {
          throw new Error(result.error ?? resendCopy.failed);
        }

        setInvitations((current) =>
          current.map((item) =>
            item.id === invitation.id
              ? (result.invitation as DoctorInvitation)
              : item
          )
        );

        setInvitationLinks((current) => {
          const next = { ...current };
          delete next[invitation.id];
          return next;
        });
        setVisibleLinkInvitationId((current) =>
          current === invitation.id ? null : current
        );
        setLinkErrors((current) => ({
          ...current,
          [invitation.id]: "",
        }));
        setResendMessages((current) => ({
          ...current,
          [invitation.id]: result.message ?? resendCopy.success,
        }));
      } catch (resendError) {
        setResendErrors((current) => ({
          ...current,
          [invitation.id]:
            resendError instanceof Error
              ? resendError.message
              : resendCopy.failed,
        }));
      } finally {
        setResendingInvitationId(null);
      }
    },
    [resendCopy.confirm, resendCopy.failed, resendCopy.success]
  );

  return (
    <section className="overflow-hidden rounded-[13px] border border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-[21px]">
        <div className="grid gap-[13px] lg:grid-cols-[minmax(0,1fr)_13rem]">
          <label>
            <span className="sr-only">
              {copy.invitations.filters.searchLabel}
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.invitations.filters.searchPlaceholder}
              className="romdoc-focus-ring w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px]"
            />
          </label>

          <label>
            <span className="sr-only">
              {copy.invitations.filters.status}
            </span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as "all" | InvitationStatus)
              }
              className="romdoc-focus-ring w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px]"
            >
              <option value="all">{copy.invitations.filters.all}</option>
              {(Object.keys(statusLabels) as InvitationStatus[]).map(
                (value) => (
                  <option key={value} value={value}>
                    {statusLabels[value]}
                  </option>
                )
              )}
            </select>
          </label>
        </div>

        <p className="mt-[8px] text-xs text-gray-500">
          {interpolatePlatformDoctorCopy(copy.common.showing, {
            filtered: filteredInvitations.length,
            total: invitations.length,
          })}
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="border-b border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
        >
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="p-[21px] text-sm text-gray-600">
          {copy.invitations.states.loading}
        </div>
      ) : filteredInvitations.length === 0 ? (
        <div className="p-[21px] text-sm text-gray-600">
          {copy.invitations.states.empty}
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {filteredInvitations.map((invitation) => {
            const expanded = expandedInvitationId === invitation.id;
            const linkVisible =
              visibleLinkInvitationId === invitation.id;
            const invitationLink = invitationLinks[invitation.id];
            const linkError = linkErrors[invitation.id];
            const resendMessage = resendMessages[invitation.id];
            const resendError = resendErrors[invitation.id];
            const canResend =
              ["sent", "expired", "failed"].includes(invitation.status) &&
              Boolean(invitation.auth_user_id) &&
              !invitation.accepted_at &&
              !invitation.accepted_profile_id &&
              !invitation.doctor_id;
            const canShowLink =
              invitation.status === "sent" &&
              Boolean(invitation.expires_at) &&
              new Date(invitation.expires_at as string).getTime() >
                Date.now();

            return (
              <article key={invitation.id} className="p-[21px]">
                <div className="grid gap-[13px] lg:grid-cols-[1.2fr_0.7fr_0.8fr_auto] lg:items-center">
                  <div>
                    <p className="font-semibold text-gray-950">
                      {invitation.first_name} {invitation.last_name}
                    </p>
                    <p className="mt-[5px] text-sm text-gray-600">
                      {invitation.email}
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full px-[13px] py-[5px] text-xs font-semibold ${getStatusClasses(
                      invitation.status
                    )}`}
                  >
                    {statusLabels[invitation.status]}
                  </span>

                  <div className="text-sm text-gray-600">
                    <p>
                      {interpolatePlatformDoctorCopy(
                        copy.common.monthsFree,
                        {
                          count: invitation.complimentary_months,
                        }
                      )}
                    </p>
                    <p className="mt-[5px] text-xs text-gray-500">
                      {interpolatePlatformDoctorCopy(
                        copy.common.createdAt,
                        {
                          date: formatDateTime(invitation.created_at),
                        }
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setExpandedInvitationId(expanded ? null : invitation.id);
                      if (expanded) {
                        setVisibleLinkInvitationId(null);
                      }
                    }}
                    className="romdoc-focus-ring rounded-[13px] border border-gray-300 px-[13px] py-[8px] text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    {expanded ? copy.common.hide : copy.common.details}
                  </button>
                </div>

                {expanded ? (
                  <div className="mt-[21px] grid gap-[21px] rounded-[13px] bg-[#F0EEE9] p-[21px] text-sm text-gray-700 sm:grid-cols-2">
                    <div className="space-y-[8px]">
                      <p>
                        <strong>
                          {copy.invitations.details.language}:
                        </strong>{" "}
                        {invitation.locale === "en"
                          ? copy.common.languageEnglish
                          : copy.common.languageRomanian}
                      </p>
                      <p>
                        <strong>{copy.invitations.details.sent}:</strong>{" "}
                        {formatDateTime(invitation.sent_at)}
                      </p>
                      <p>
                        <strong>{copy.invitations.details.expires}:</strong>{" "}
                        {formatDateTime(invitation.expires_at)}
                      </p>
                      <p>
                        <strong>{copy.invitations.details.accepted}:</strong>{" "}
                        {formatDateTime(invitation.accepted_at)}
                      </p>
                      <p>
                        <strong>{resendCopy.count}:</strong>{" "}
                        {invitation.resend_count}
                      </p>
                      <p>
                        <strong>{resendCopy.lastResent}:</strong>{" "}
                        {formatDateTime(invitation.last_resent_at)}
                      </p>
                    </div>

                    <div className="space-y-[8px]">
                      <p className="break-all">
                        <strong>{copy.invitations.details.authUser}:</strong>{" "}
                        {invitation.auth_user_id ?? copy.common.none}
                      </p>
                      <p className="break-all">
                        <strong>{copy.invitations.details.doctor}:</strong>{" "}
                        {invitation.doctor_id ?? copy.common.none}
                      </p>

                      {invitation.failure_message ? (
                        <p className="rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-red-800">
                          <strong>{copy.invitations.details.error}:</strong>{" "}
                          {invitation.failure_message}
                        </p>
                      ) : null}

                      {invitation.last_resend_failure_message ? (
                        <p className="rounded-[13px] border border-amber-200 bg-amber-50 p-[13px] text-amber-900">
                          <strong>{resendCopy.lastFailure}:</strong>{" "}
                          {invitation.last_resend_failure_message}
                          {invitation.last_resend_failure_at
                            ? ` (${formatDateTime(
                                invitation.last_resend_failure_at
                              )})`
                            : ""}
                        </p>
                      ) : null}
                    </div>

                    {canResend ? (
                      <div className="sm:col-span-2 rounded-[13px] border border-blue-200 bg-blue-50 p-[21px]">
                        <div className="flex flex-col gap-[13px] sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold text-blue-950">
                              {resendCopy.title}
                            </p>
                            <p className="mt-[5px] text-sm leading-6 text-blue-900">
                              {resendCopy.description}
                            </p>
                          </div>

                          <button
                            type="button"
                            disabled={resendingInvitationId === invitation.id}
                            onClick={() => void resendInvitation(invitation)}
                            className="romdoc-focus-ring shrink-0 rounded-[13px] bg-[#036661] px-[21px] py-[13px] text-sm font-semibold text-white hover:bg-[#ff2800] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {resendingInvitationId === invitation.id
                              ? resendCopy.sending
                              : resendCopy.action}
                          </button>
                        </div>

                        {resendMessage ? (
                          <p
                            role="status"
                            className="mt-[13px] rounded-[13px] border border-green-200 bg-green-50 p-[13px] text-green-800"
                          >
                            {resendMessage}
                          </p>
                        ) : null}

                        {resendError ? (
                          <p
                            role="alert"
                            className="mt-[13px] rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-red-800"
                          >
                            {resendError}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {canShowLink ? (
                      <div className="sm:col-span-2 rounded-[13px] border border-[#036661]/20 bg-white p-[21px]">
                        <div className="flex flex-col gap-[13px] sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold text-gray-950">
                              {linkCopy.title}
                            </p>
                            <p className="mt-[5px] text-sm text-gray-600">
                              {linkCopy.description}
                            </p>
                          </div>

                          <button
                            type="button"
                            disabled={loadingLinkId === invitation.id}
                            onClick={() => {
                              if (linkVisible) {
                                setVisibleLinkInvitationId(null);
                              } else {
                                void loadInvitationLink(invitation.id);
                              }
                            }}
                            className="romdoc-focus-ring shrink-0 rounded-[13px] border border-[#036661] px-[13px] py-[8px] text-sm font-semibold text-[#036661] hover:bg-[#036661] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {loadingLinkId === invitation.id
                              ? linkCopy.loading
                              : linkVisible
                                ? linkCopy.hide
                                : linkCopy.show}
                          </button>
                        </div>

                        {linkError ? (
                          <p
                            role="alert"
                            className="mt-[13px] rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-red-800"
                          >
                            {linkError}
                          </p>
                        ) : null}

                        {linkVisible && invitationLink ? (
                          <div className="mt-[13px] space-y-[13px]">
                            <div className="flex flex-col gap-[8px] sm:flex-row">
                              <input
                                type="text"
                                readOnly
                                value={invitationLink}
                                aria-label={linkCopy.title}
                                className="romdoc-focus-ring min-w-0 flex-1 rounded-[13px] border border-gray-300 bg-gray-50 px-[13px] py-[13px] text-sm"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  void copyInvitationLink(invitation.id)
                                }
                                className="romdoc-focus-ring rounded-[13px] bg-[#036661] px-[21px] py-[13px] text-sm font-semibold text-white hover:bg-[#ff2800]"
                              >
                                {copiedLinkId === invitation.id
                                  ? linkCopy.copied
                                  : linkCopy.copy}
                              </button>
                            </div>

                            <p className="rounded-[13px] border border-amber-200 bg-amber-50 p-[13px] text-xs leading-5 text-amber-900">
                              {linkCopy.warning}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {invitation.personal_message ? (
                      <div className="sm:col-span-2">
                        <p className="font-semibold text-gray-900">
                          {copy.invitations.details.personalMessage}
                        </p>
                        <p className="mt-[8px] whitespace-pre-wrap leading-6">
                          {invitation.personal_message}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
