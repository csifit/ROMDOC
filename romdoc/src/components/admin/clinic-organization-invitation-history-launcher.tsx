"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

type InvitationEvent = {
  id: string;
  invitation_id: string;
  event_type: string;
  reason: string | null;
  created_at: string;
};

type Invitation = {
  id: string;
  organization_id: string | null;
  organization_name: string;
  email: string;
  first_name: string;
  last_name: string;
  locale: "ro" | "en" | "de";
  trial_months: number;
  status: string;
  sent_at: string | null;
  accepted_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  resend_count: number;
  last_resent_at: string | null;
  last_resend_failure_at: string | null;
  last_resend_failure_code: string | null;
  last_resend_failure_message: string | null;
  failure_code: string | null;
  failure_message: string | null;
  created_at: string;
  updated_at: string;
  events: InvitationEvent[];
};

type OrganizationHistory = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  invitations: Invitation[];
};

type HistoryResponse = {
  organizations?: OrganizationHistory[];
  unlinkedInvitations?: Invitation[];
  error?: string;
};

type Props = {
  locale: AppLocale;
};

type SelectedHistory =
  | {
      kind: "organization";
      organization: OrganizationHistory;
    }
  | {
      kind: "unlinked";
      invitation: Invitation;
    };

const COPY = {
  ro: {
    button: "Invitații și istoric",
    title: "Invitații organizații clinice",
    description:
      "O singură linie pentru fiecare organizație. Deschide Istoric pentru toate trimiterile și evenimentele.",
    close: "Închide",
    loading: "Se încarcă...",
    loadFailed: "Istoricul invitațiilor nu a putut fi încărcat.",
    empty: "Nu există organizații.",
    organization: "Organizație",
    recipient: "Destinatar",
    status: "Status",
    trial: "Trial",
    lastActivity: "Ultima activitate",
    resends: "Retrimiteri",
    actions: "Acțiuni",
    noInvitation: "Fără invitație",
    months: "luni",
    history: "Istoric",
    resend: "Retrimite",
    resending: "Se retrimite...",
    resent: "Invitația a fost retrimisă.",
    back: "Înapoi la organizații",
    invitation: "Invitație",
    sent: "Trimisă",
    accepted: "Acceptată",
    expires: "Expiră",
    trialPeriod: "Perioadă trial",
    events: "Evenimente",
    noEvents: "Nu există evenimente înregistrate.",
    unlinkedTitle: "Invitații fără organizație creată încă",
    unlinkedDescription:
      "Invitații de tip invite-first care nu au încă un organization_id.",
    failure: "Eroare",
    statusDraft: "Draft",
    statusSent: "Trimisă",
    statusAccepted: "Acceptată",
    statusExpired: "Expirată",
    statusCancelled: "Anulată",
    statusFailed: "Eșuată",
    eventCreated: "Invitație creată",
    eventSent: "Invitație trimisă",
    eventFailed: "Trimitere eșuată",
    eventResent: "Invitație retrimisă",
    eventAccepted: "Invitație acceptată",
    eventExpired: "Invitație expirată",
    eventCancelled: "Invitație anulată",
    eventLinked: "Organizație asociată",
    eventTrialStarted: "Trial început",
    eventTrialEnded: "Trial încheiat",
  },
  en: {
    button: "Invitations & history",
    title: "Clinic organisation invitations",
    description:
      "One compact row per organisation. Open History for all sends and events.",
    close: "Close",
    loading: "Loading...",
    loadFailed: "Invitation history could not be loaded.",
    empty: "There are no organisations.",
    organization: "Organisation",
    recipient: "Recipient",
    status: "Status",
    trial: "Trial",
    lastActivity: "Last activity",
    resends: "Resends",
    actions: "Actions",
    noInvitation: "No invitation",
    months: "months",
    history: "History",
    resend: "Resend",
    resending: "Resending...",
    resent: "Invitation resent.",
    back: "Back to organisations",
    invitation: "Invitation",
    sent: "Sent",
    accepted: "Accepted",
    expires: "Expires",
    trialPeriod: "Trial period",
    events: "Events",
    noEvents: "No events recorded.",
    unlinkedTitle: "Invitations without an organisation yet",
    unlinkedDescription:
      "Invite-first records that do not yet have an organization_id.",
    failure: "Error",
    statusDraft: "Draft",
    statusSent: "Sent",
    statusAccepted: "Accepted",
    statusExpired: "Expired",
    statusCancelled: "Cancelled",
    statusFailed: "Failed",
    eventCreated: "Invitation created",
    eventSent: "Invitation sent",
    eventFailed: "Send failed",
    eventResent: "Invitation resent",
    eventAccepted: "Invitation accepted",
    eventExpired: "Invitation expired",
    eventCancelled: "Invitation cancelled",
    eventLinked: "Organisation linked",
    eventTrialStarted: "Trial started",
    eventTrialEnded: "Trial ended",
  },
  de: {
    button: "Einladungen & Verlauf",
    title: "Einladungen für Klinikorganisationen",
    description:
      "Eine kompakte Zeile pro Organisation. Unter Verlauf sehen Sie alle Sendungen und Ereignisse.",
    close: "Schließen",
    loading: "Wird geladen...",
    loadFailed: "Der Einladungsverlauf konnte nicht geladen werden.",
    empty: "Es gibt keine Organisationen.",
    organization: "Organisation",
    recipient: "Empfänger",
    status: "Status",
    trial: "Testphase",
    lastActivity: "Letzte Aktivität",
    resends: "Erneut gesendet",
    actions: "Aktionen",
    noInvitation: "Keine Einladung",
    months: "Monate",
    history: "Verlauf",
    resend: "Erneut senden",
    resending: "Wird erneut gesendet...",
    resent: "Einladung wurde erneut gesendet.",
    back: "Zurück zu Organisationen",
    invitation: "Einladung",
    sent: "Gesendet",
    accepted: "Angenommen",
    expires: "Läuft ab",
    trialPeriod: "Testphase",
    events: "Ereignisse",
    noEvents: "Keine Ereignisse vorhanden.",
    unlinkedTitle: "Einladungen ohne erstellte Organisation",
    unlinkedDescription:
      "Invite-first-Einträge ohne organization_id.",
    failure: "Fehler",
    statusDraft: "Entwurf",
    statusSent: "Gesendet",
    statusAccepted: "Angenommen",
    statusExpired: "Abgelaufen",
    statusCancelled: "Storniert",
    statusFailed: "Fehlgeschlagen",
    eventCreated: "Einladung erstellt",
    eventSent: "Einladung gesendet",
    eventFailed: "Senden fehlgeschlagen",
    eventResent: "Einladung erneut gesendet",
    eventAccepted: "Einladung angenommen",
    eventExpired: "Einladung abgelaufen",
    eventCancelled: "Einladung storniert",
    eventLinked: "Organisation verknüpft",
    eventTrialStarted: "Testphase gestartet",
    eventTrialEnded: "Testphase beendet",
  },
} as const;

function getLocaleTag(
  locale: AppLocale
) {
  if (locale === "en") return "en-GB";
  if (locale === "de") return "de-DE";
  return "ro-RO";
}

function effectiveStatus(
  invitation: Invitation
) {
  if (
    invitation.status === "sent" &&
    invitation.expires_at &&
    new Date(invitation.expires_at).getTime() < Date.now()
  ) {
    return "expired";
  }

  return invitation.status;
}

function canResend(
  invitation: Invitation
) {
  return [
    "sent",
    "expired",
    "failed",
  ].includes(
    effectiveStatus(invitation)
  );
}

function latestActivity(
  invitation: Invitation
) {
  return (
    invitation.accepted_at ??
    invitation.last_resent_at ??
    invitation.sent_at ??
    invitation.updated_at ??
    invitation.created_at
  );
}

export default function ClinicOrganizationInvitationHistoryLauncher({
  locale,
}: Props) {
  const copy = COPY[locale];
  const localeTag = getLocaleTag(locale);

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [organizations, setOrganizations] =
    useState<OrganizationHistory[]>([]);
  const [unlinkedInvitations, setUnlinkedInvitations] =
    useState<Invitation[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] =
    useState<SelectedHistory | null>(null);
  const [resendingId, setResendingId] =
    useState<string | null>(null);

  const formatDate = useCallback(
    (value: string | null | undefined) => {
      if (!value) return "—";

      return new Intl.DateTimeFormat(localeTag, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Bucharest",
      }).format(new Date(value));
    },
    [localeTag]
  );

  const statusLabel = useCallback(
    (status: string) => {
      switch (status) {
        case "draft":
          return copy.statusDraft;
        case "sent":
          return copy.statusSent;
        case "accepted":
          return copy.statusAccepted;
        case "expired":
          return copy.statusExpired;
        case "cancelled":
          return copy.statusCancelled;
        case "failed":
          return copy.statusFailed;
        default:
          return status;
      }
    },
    [copy]
  );

  const eventLabel = useCallback(
    (eventType: string) => {
      switch (eventType) {
        case "invitation_created":
          return copy.eventCreated;
        case "invitation_sent":
          return copy.eventSent;
        case "invitation_send_failed":
          return copy.eventFailed;
        case "invitation_resent":
          return copy.eventResent;
        case "invitation_accepted":
          return copy.eventAccepted;
        case "invitation_expired":
          return copy.eventExpired;
        case "invitation_cancelled":
          return copy.eventCancelled;
        case "organization_linked":
          return copy.eventLinked;
        case "trial_started":
          return copy.eventTrialStarted;
        case "trial_ended":
          return copy.eventTrialEnded;
        default:
          return eventType;
      }
    },
    [copy]
  );

  const statusClass = useCallback(
    (status: string) => {
      switch (status) {
        case "accepted":
          return "bg-green-100 text-green-800";
        case "sent":
          return "bg-blue-100 text-blue-800";
        case "expired":
          return "bg-amber-100 text-amber-900";
        case "failed":
          return "bg-red-100 text-red-800";
        case "cancelled":
          return "bg-slate-200 text-slate-800";
        default:
          return "bg-gray-100 text-gray-700";
      }
    },
    []
  );

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/clinic-organizations/invitations",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = (await response.json()) as HistoryResponse;

      if (!response.ok) {
        throw new Error(result.error ?? copy.loadFailed);
      }

      setOrganizations(result.organizations ?? []);
      setUnlinkedInvitations(
        result.unlinkedInvitations ?? []
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : copy.loadFailed
      );
    } finally {
      setIsLoading(false);
    }
  }, [copy.loadFailed]);

  async function openModal() {
    setIsOpen(true);
    setSelected(null);
    setNotice("");
    await loadHistory();
  }

  async function resendInvitation(
    invitation: Invitation
  ) {
    setResendingId(invitation.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/admin/clinic-organizations/invitations/${encodeURIComponent(
          invitation.id
        )}/resend`,
        {
          method: "POST",
        }
      );

      const result = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? copy.loadFailed);
      }

      setNotice(result.message ?? copy.resent);
      await loadHistory();
      setSelected(null);
    } catch (resendError) {
      setError(
        resendError instanceof Error
          ? resendError.message
          : copy.loadFailed
      );
    } finally {
      setResendingId(null);
    }
  }

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !resendingId) {
        setIsOpen(false);
        setSelected(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () =>
      window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, resendingId]);

  const rows = useMemo(
    () =>
      organizations.map((organization) => ({
        organization,
        latestInvitation:
          organization.invitations[0] ?? null,
      })),
    [organizations]
  );

  function renderResendButton(
    invitation: Invitation,
    allowResend = true
  ) {
    if (
      !allowResend ||
      !canResend(invitation)
    ) {
      return null;
    }

    return (
      <button
        type="button"
        disabled={resendingId === invitation.id}
        onClick={() => void resendInvitation(invitation)}
        className="romdoc-focus-ring rounded-[8px] border border-[#036661] bg-white px-[10px] py-[5px] text-xs font-semibold text-[#036661] transition hover:bg-[#036661] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {resendingId === invitation.id
          ? copy.resending
          : copy.resend}
      </button>
    );
  }

  function renderInvitationHistory(
    invitation: Invitation,
    allowResend = true
  ) {
    const status = effectiveStatus(invitation);

    return (
      <section
        key={invitation.id}
        className="rounded-[13px] border border-gray-200 bg-white p-[13px]"
      >
        <div className="flex flex-wrap items-start justify-between gap-[13px]">
          <div>
            <div className="flex flex-wrap items-center gap-[8px]">
              <h3 className="font-semibold text-gray-950">
                {copy.invitation} · {invitation.email}
              </h3>

              <span
                className={`rounded-full px-[8px] py-[5px] text-xs font-semibold ${statusClass(
                  status
                )}`}
              >
                {statusLabel(status)}
              </span>
            </div>

            <p className="mt-[5px] text-xs text-gray-500">
              {invitation.first_name} {invitation.last_name}
              {" · "}
              {invitation.trial_months} {copy.months}
            </p>
          </div>

          {renderResendButton(
            invitation,
            allowResend
          )}
        </div>

        <dl className="mt-[13px] grid gap-[8px] text-xs text-gray-600 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="font-semibold text-gray-800">
              {copy.sent}
            </dt>
            <dd className="mt-[3px]">
              {formatDate(invitation.sent_at)}
            </dd>
          </div>

          <div>
            <dt className="font-semibold text-gray-800">
              {copy.accepted}
            </dt>
            <dd className="mt-[3px]">
              {formatDate(invitation.accepted_at)}
            </dd>
          </div>

          <div>
            <dt className="font-semibold text-gray-800">
              {copy.expires}
            </dt>
            <dd className="mt-[3px]">
              {formatDate(invitation.expires_at)}
            </dd>
          </div>

          <div>
            <dt className="font-semibold text-gray-800">
              {copy.resends}
            </dt>
            <dd className="mt-[3px]">
              {invitation.resend_count}
            </dd>
          </div>
        </dl>

        {invitation.trial_started_at ||
        invitation.trial_ends_at ? (
          <p className="mt-[10px] text-xs text-gray-600">
            <span className="font-semibold text-gray-800">
              {copy.trialPeriod}:
            </span>{" "}
            {formatDate(invitation.trial_started_at)}
            {" → "}
            {formatDate(invitation.trial_ends_at)}
          </p>
        ) : null}

        {invitation.failure_message ||
        invitation.last_resend_failure_message ? (
          <div className="mt-[10px] rounded-[10px] border border-red-200 bg-red-50 p-[10px] text-xs text-red-800">
            <span className="font-semibold">
              {copy.failure}:
            </span>{" "}
            {invitation.last_resend_failure_message ??
              invitation.failure_message}
          </div>
        ) : null}

        <div className="mt-[13px] border-t border-gray-200 pt-[13px]">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
            {copy.events}
          </p>

          {invitation.events.length ? (
            <div className="mt-[8px] space-y-[8px]">
              {invitation.events.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-col gap-[3px] rounded-[8px] bg-gray-50 px-[10px] py-[8px] text-xs sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <span className="font-semibold text-gray-800">
                      {eventLabel(event.event_type)}
                    </span>

                    {event.reason ? (
                      <span className="ml-[5px] text-gray-500">
                        · {event.reason}
                      </span>
                    ) : null}
                  </div>

                  <span className="shrink-0 text-gray-500">
                    {formatDate(event.created_at)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-[8px] text-xs text-gray-500">
              {copy.noEvents}
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void openModal()}
        className="romdoc-focus-ring rounded-[13px] border border-[#036661] bg-white px-[21px] py-[13px] font-semibold text-[#036661] transition-colors hover:bg-[#036661] hover:text-white"
      >
        {copy.button}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-[13px] sm:p-[21px]">
          <button
            type="button"
            aria-label={copy.close}
            onClick={() => {
              if (!resendingId) {
                setIsOpen(false);
                setSelected(null);
              }
            }}
            className="absolute inset-0 bg-black/60"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="clinic-organization-invitation-history-title"
            className="relative max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-2xl sm:p-[34px]"
          >
            <div className="flex items-start justify-between gap-[13px]">
              <div>
                {selected ? (
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="romdoc-focus-ring mb-[8px] text-sm font-semibold text-[#036661] hover:text-[#ff2800]"
                  >
                    ← {copy.back}
                  </button>
                ) : null}

                <h2
                  id="clinic-organization-invitation-history-title"
                  className="text-2xl font-bold text-gray-950"
                >
                  {selected?.kind === "organization"
                    ? selected.organization.name
                    : selected?.kind === "unlinked"
                      ? selected.invitation.organization_name
                      : copy.title}
                </h2>

                {!selected ? (
                  <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
                    {copy.description}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                disabled={Boolean(resendingId)}
                onClick={() => {
                  setIsOpen(false);
                  setSelected(null);
                }}
                aria-label={copy.close}
                className="romdoc-focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-60"
              >
                ✕
              </button>
            </div>

            {notice ? (
              <div
                role="status"
                className="mt-[13px] rounded-[13px] border border-green-200 bg-green-50 p-[13px] text-sm text-green-800"
              >
                {notice}
              </div>
            ) : null}

            {error ? (
              <div
                role="alert"
                className="mt-[13px] rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
              >
                {error}
              </div>
            ) : null}

            {isLoading ? (
              <div className="mt-[21px] rounded-[13px] border border-gray-200 bg-gray-50 p-[21px] text-sm text-gray-600">
                {copy.loading}
              </div>
            ) : selected?.kind === "organization" ? (
              <div className="mt-[21px] space-y-[13px]">
                {selected.organization.invitations.length ? (
                  selected.organization.invitations.map(
                    (
                      invitation,
                      index
                    ) =>
                      renderInvitationHistory(
                        invitation,
                        index === 0
                      )
                  )
                ) : (
                  <p className="rounded-[13px] border border-dashed border-gray-300 bg-gray-50 p-[21px] text-sm text-gray-600">
                    {copy.noInvitation}
                  </p>
                )}
              </div>
            ) : selected?.kind === "unlinked" ? (
              <div className="mt-[21px]">
                {renderInvitationHistory(selected.invitation)}
              </div>
            ) : (
              <div className="mt-[21px]">
                {rows.length ? (
                  <div className="overflow-x-auto rounded-[13px] border border-gray-200">
                    <table className="min-w-full border-collapse text-left text-sm">
                      <thead className="bg-[#F0EEE9] text-xs uppercase tracking-wide text-gray-600">
                        <tr>
                          <th className="px-[13px] py-[10px]">
                            {copy.organization}
                          </th>
                          <th className="px-[13px] py-[10px]">
                            {copy.recipient}
                          </th>
                          <th className="px-[13px] py-[10px]">
                            {copy.status}
                          </th>
                          <th className="px-[13px] py-[10px]">
                            {copy.trial}
                          </th>
                          <th className="px-[13px] py-[10px]">
                            {copy.lastActivity}
                          </th>
                          <th className="px-[13px] py-[10px]">
                            {copy.resends}
                          </th>
                          <th className="px-[13px] py-[10px] text-right">
                            {copy.actions}
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {rows.map(
                          ({
                            organization,
                            latestInvitation,
                          }) => {
                            const status = latestInvitation
                              ? effectiveStatus(latestInvitation)
                              : null;

                            return (
                              <tr
                                key={organization.id}
                                className="border-t border-gray-200 align-middle"
                              >
                                <td className="whitespace-nowrap px-[13px] py-[10px]">
                                  <p className="font-semibold text-gray-900">
                                    {organization.name}
                                  </p>
                                </td>

                                <td className="px-[13px] py-[10px] text-gray-700">
                                  {latestInvitation
                                    ? latestInvitation.email
                                    : "—"}
                                </td>

                                <td className="px-[13px] py-[10px]">
                                  {latestInvitation && status ? (
                                    <span
                                      className={`inline-flex rounded-full px-[8px] py-[5px] text-xs font-semibold ${statusClass(
                                        status
                                      )}`}
                                    >
                                      {statusLabel(status)}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-500">
                                      {copy.noInvitation}
                                    </span>
                                  )}
                                </td>

                                <td className="whitespace-nowrap px-[13px] py-[10px] text-gray-700">
                                  {latestInvitation
                                    ? `${latestInvitation.trial_months} ${copy.months}`
                                    : "—"}
                                </td>

                                <td className="whitespace-nowrap px-[13px] py-[10px] text-xs text-gray-600">
                                  {latestInvitation
                                    ? formatDate(
                                        latestActivity(
                                          latestInvitation
                                        )
                                      )
                                    : "—"}
                                </td>

                                <td className="px-[13px] py-[10px] text-center text-gray-700">
                                  {latestInvitation
                                    ? latestInvitation.resend_count
                                    : "—"}
                                </td>

                                <td className="px-[13px] py-[10px]">
                                  <div className="flex justify-end gap-[8px]">
                                    {latestInvitation
                                      ? renderResendButton(
                                          latestInvitation
                                        )
                                      : null}

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSelected({
                                          kind: "organization",
                                          organization,
                                        })
                                      }
                                      className="romdoc-focus-ring rounded-[8px] border border-gray-300 bg-white px-[10px] py-[5px] text-xs font-semibold text-gray-700 hover:bg-gray-100"
                                    >
                                      {copy.history}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="rounded-[13px] border border-dashed border-gray-300 bg-gray-50 p-[21px] text-sm text-gray-600">
                    {copy.empty}
                  </p>
                )}

                {unlinkedInvitations.length ? (
                  <section className="mt-[21px] rounded-[13px] border border-amber-200 bg-amber-50 p-[13px]">
                    <h3 className="font-semibold text-amber-950">
                      {copy.unlinkedTitle}
                    </h3>

                    <p className="mt-[5px] text-xs leading-5 text-amber-900">
                      {copy.unlinkedDescription}
                    </p>

                    <div className="mt-[10px] space-y-[8px]">
                      {unlinkedInvitations.map((invitation) => {
                        const status = effectiveStatus(invitation);

                        return (
                          <div
                            key={invitation.id}
                            className="flex flex-col gap-[8px] rounded-[10px] border border-amber-200 bg-white p-[10px] sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {invitation.organization_name}
                              </p>

                              <p className="mt-[3px] text-xs text-gray-600">
                                {invitation.email}
                                {" · "}
                                {statusLabel(status)}
                              </p>
                            </div>

                            <div className="flex gap-[8px]">
                              {renderResendButton(invitation)}

                              <button
                                type="button"
                                onClick={() =>
                                  setSelected({
                                    kind: "unlinked",
                                    invitation,
                                  })
                                }
                                className="romdoc-focus-ring rounded-[8px] border border-gray-300 bg-white px-[10px] py-[5px] text-xs font-semibold text-gray-700 hover:bg-gray-100"
                              >
                                {copy.history}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ) : null}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
