"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { AppLocale } from "@/lib/i18n/app-locale";

type Organization = {
  id: string;
  name: string;
  status: string;
};

type Invitation = {
  id: string;
  organization_id: string;
  invited_doctor_email: string | null;
  invitation_status: string;
  expires_at: string | null;
};

type Props = {
  locale: AppLocale;
  organizations: Organization[];
  invitations: Invitation[];
};

type ApiResponse = {
  message?: string;
  error?: string;
  inviteUrl?: string;
  emailSent?: boolean;
};

const DATE_LOCALE = {
  ro: "ro-RO",
  en: "en-GB",
  de: "de-DE",
} as const;

const COPY = {
  ro: {
    title: "Retrimite invitația",
    description:
      "Generează un token nou, invalidează linkul vechi și prelungește invitația cu 30 de zile.",
    empty:
      "Nu există invitații în așteptare sau expirate care pot fi retrimise.",
    expires: "Expiră",
    pending: "În așteptare",
    expired: "Expirată",
    resend: "Retrimite",
    sending: "Se retrimite...",
    copy: "Copiază linkul nou",
    copied: "Linkul nou a fost copiat.",
    copyFailed: "Copiază manual linkul afișat.",
    genericError: "Invitația nu a putut fi retrimisă.",
    emailWarning:
      "Tokenul a fost actualizat, dar e-mailul nu a putut fi trimis.",
  },
  en: {
    title: "Resend invitation",
    description:
      "Generate a new token, invalidate the old link, and extend the invitation by 30 days.",
    empty:
      "There are no pending or expired invitations that can be resent.",
    expires: "Expires",
    pending: "Pending",
    expired: "Expired",
    resend: "Resend",
    sending: "Resending...",
    copy: "Copy new link",
    copied: "The new link was copied.",
    copyFailed: "Copy the displayed link manually.",
    genericError: "The invitation could not be resent.",
    emailWarning:
      "The token was updated, but the email could not be sent.",
  },
  de: {
    title: "Einladung erneut senden",
    description:
      "Erstellen Sie einen neuen Token, machen Sie den alten Link ungültig und verlängern Sie die Einladung um 30 Tage.",
    empty:
      "Es gibt keine ausstehenden oder abgelaufenen Einladungen, die erneut gesendet werden können.",
    expires: "Läuft ab",
    pending: "Ausstehend",
    expired: "Abgelaufen",
    resend: "Erneut senden",
    sending: "Wird erneut gesendet...",
    copy: "Neuen Link kopieren",
    copied: "Der neue Link wurde kopiert.",
    copyFailed: "Kopieren Sie den angezeigten Link manuell.",
    genericError: "Die Einladung konnte nicht erneut gesendet werden.",
    emailWarning:
      "Der Token wurde aktualisiert, aber die E-Mail konnte nicht gesendet werden.",
  },
} satisfies Record<AppLocale, Record<string, string>>;

export default function DoctorInvitationResendPanel({
  locale,
  organizations,
  invitations,
}: Props) {
  const router = useRouter();
  const copy = COPY[locale];

  const organizationNames = useMemo(
    () =>
      new Map(
        organizations.map((organization) => [
          organization.id,
          organization.name,
        ])
      ),
    [organizations]
  );

  const resendable = useMemo(
    () =>
      invitations.filter((invitation) =>
        ["pending", "expired"].includes(
          invitation.invitation_status
        )
      ),
    [invitations]
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  function formatDate(value: string | null) {
    if (!value) {
      return "—";
    }

    return new Intl.DateTimeFormat(DATE_LOCALE[locale], {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(value));
  }

  async function resend(invitationId: string) {
    setActiveId(invitationId);
    setMessage("");
    setError("");
    setWarning("");
    setInviteUrl("");
    setCopyMessage("");

    try {
      const response = await fetch(
        "/api/clinic-manager/invitations/resend",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            invitationId,
            locale,
          }),
        }
      );

      const result = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(result.error ?? copy.genericError);
      }

      setMessage(result.message ?? copy.resend);
      setInviteUrl(result.inviteUrl ?? "");

      if (result.emailSent === false) {
        setWarning(copy.emailWarning);
      }

      router.refresh();
    } catch (resendError) {
      setError(
        resendError instanceof Error
          ? resendError.message
          : copy.genericError
      );
    } finally {
      setActiveId(null);
    }
  }

  async function copyLink() {
    if (!inviteUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyMessage(copy.copied);
    } catch {
      setCopyMessage(copy.copyFailed);
    }
  }

  return (
    <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
      <h2 className="text-xl font-bold text-gray-900">{copy.title}</h2>
      <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
        {copy.description}
      </p>

      {resendable.length === 0 ? (
        <div className="mt-[21px] rounded-[13px] border border-dashed border-gray-300 bg-gray-50 p-[13px] text-sm text-gray-600">
          {copy.empty}
        </div>
      ) : (
        <div className="mt-[21px] space-y-[8px]">
          {resendable.map((invitation) => {
            const isSending = activeId === invitation.id;

            return (
              <article
                key={invitation.id}
                className="flex flex-col gap-[13px] rounded-[13px] border border-gray-200 p-[13px] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="break-all font-semibold text-gray-900">
                    {invitation.invited_doctor_email ?? "—"}
                  </p>
                  <p className="mt-[5px] text-sm text-gray-600">
                    {organizationNames.get(
                      invitation.organization_id
                    ) ?? "—"}
                  </p>
                  <p className="mt-[5px] text-xs text-gray-500">
                    {invitation.invitation_status === "expired"
                      ? copy.expired
                      : copy.pending}
                    {" · "}
                    {copy.expires}: {formatDate(invitation.expires_at)}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={activeId !== null}
                  onClick={() => void resend(invitation.id)}
                  className="romdoc-focus-ring min-h-[44px] shrink-0 rounded-[13px] border border-[#036661] px-[13px] py-[8px] text-sm font-semibold text-[#036661] transition hover:bg-[#036661]/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSending ? copy.sending : copy.resend}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-[13px] rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mt-[13px] rounded-[13px] border border-green-200 bg-green-50 p-[13px] text-sm text-green-800"
        >
          <p>{message}</p>
          {warning && (
            <p className="mt-[8px] font-semibold text-amber-800">
              {warning}
            </p>
          )}
          {inviteUrl && (
            <div className="mt-[13px] space-y-[8px]">
              <p className="break-all rounded-[8px] bg-white p-[13px] text-xs text-gray-700">
                {inviteUrl}
              </p>
              <button
                type="button"
                onClick={() => void copyLink()}
                className="romdoc-focus-ring rounded-[8px] border border-green-300 px-[13px] py-[8px] text-xs font-semibold text-green-800 hover:bg-green-50"
              >
                {copy.copy}
              </button>
              {copyMessage && (
                <p className="text-xs text-green-900">
                  {copyMessage}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
