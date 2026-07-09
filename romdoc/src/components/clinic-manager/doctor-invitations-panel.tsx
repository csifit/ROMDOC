"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type ClinicOrganizationOption = {
  id: string;
  name: string;
  status: string;
};

type DoctorInvitation = {
  id: string;
  organization_id: string;
  invited_doctor_email: string | null;
  invitation_status: string;
  payment_responsibility: string;
  coverage_status: string;
  expires_at: string | null;
  created_at: string;
};

type DoctorInvitationsPanelProps = {
  organizations: ClinicOrganizationOption[];
  invitations: DoctorInvitation[];
};

type InvitationResponse = {
  message?: string;
  error?: string;
  inviteUrl?: string;
  emailSent?: boolean;
  emailError?: string | null;
};

function getInvitationStatusLabel(status: string) {
  switch (status) {
    case "accepted":
      return "Acceptată";

    case "declined":
      return "Refuzată";

    case "expired":
      return "Expirată";

    case "cancelled":
      return "Anulată";

    default:
      return "Trimisă";
  }
}

function getCoverageStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "Acoperire activă";

    case "paused":
      return "Suspendată";

    case "cancelled":
      return "Anulată";

    case "ended":
      return "Încheiată";

    case "none":
      return "Fără acoperire";

    default:
      return "Așteaptă aprobarea RomDoc";
  }
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default function DoctorInvitationsPanel({
  organizations,
  invitations,
}: DoctorInvitationsPanelProps) {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState(
    organizations[0]?.id ?? ""
  );
  const [doctorEmail, setDoctorEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const activeOrganizations = useMemo(
    () => organizations.filter((organization) => organization.status === "active"),
    [organizations]
  );

  const organizationNameById = useMemo(
    () =>
      new Map(
        organizations.map((organization) => [organization.id, organization.name])
      ),
    [organizations]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    setInviteUrl(null);
    setCopyMessage(null);

    try {
      const response = await fetch("/api/clinic-manager/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          doctorEmail,
        }),
      });

      const result = (await response.json()) as InvitationResponse;

      if (!response.ok) {
        throw new Error(result.error ?? "Invitația nu a putut fi creată.");
      }

      setSuccess(result.message ?? "Invitația a fost creată.");
      setInviteUrl(result.inviteUrl ?? null);
      setDoctorEmail("");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Invitația nu a putut fi creată."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyInviteUrl() {
    if (!inviteUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyMessage("Link copiat.");
    } catch {
      setCopyMessage("Copiază manual linkul afișat mai jos.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Invită un medic
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Clinica poate invita un medic prin e-mail. Invitația pornește ca
            acoperire plătită de clinică și rămâne în așteptarea aprobării
            RomDoc înainte să ofere acces complet prin clinică.
          </p>
        </div>

        {activeOrganizations.length === 0 ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Nu există o organizație activă pentru acest cont. Poți invita medici
            doar după aprobarea organizației de către RomDoc.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Organizație clinică
              </span>
              <select
                value={organizationId}
                onChange={(event) => setOrganizationId(event.target.value)}
                className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900"
                required
              >
                {activeOrganizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                E-mail medic
              </span>
              <input
                type="email"
                value={doctorEmail}
                onChange={(event) => setDoctorEmail(event.target.value)}
                placeholder="medic@example.com"
                className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900"
                required
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="romdoc-focus-ring min-h-11 rounded-xl bg-[#036661] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#024d49] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Se trimite..." : "Trimite invitația"}
            </button>
          </form>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800">
            <p>{success}</p>

            {inviteUrl && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-green-900">
                  Link invitație
                </p>
                <div className="flex flex-col gap-2 rounded-lg bg-white p-3 text-xs text-gray-700 sm:flex-row sm:items-center sm:justify-between">
                  <span className="break-all">{inviteUrl}</span>
                  <button
                    type="button"
                    onClick={copyInviteUrl}
                    className="romdoc-focus-ring shrink-0 rounded-lg border border-green-300 px-3 py-2 font-semibold text-green-800 hover:bg-green-50"
                  >
                    Copiază
                  </button>
                </div>
                {copyMessage && <p className="text-xs text-green-900">{copyMessage}</p>}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Invitații existente
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Urmărește invitațiile trimise de clinică și statusul acoperirii.
            </p>
          </div>

          <span className="rounded-full bg-[#F0EEE9] px-3 py-1 text-sm font-semibold text-gray-700">
            {invitations.length} invitații
          </span>
        </div>

        {invitations.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm leading-6 text-gray-600">
            Nu există încă invitații pentru organizațiile asociate contului tău.
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-xl border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Medic</th>
                    <th className="px-4 py-3">Organizație</th>
                    <th className="px-4 py-3">Invitație</th>
                    <th className="px-4 py-3">Plată</th>
                    <th className="px-4 py-3">Acoperire</th>
                    <th className="px-4 py-3">Expiră</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {invitations.map((invitation) => (
                    <tr key={invitation.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {invitation.invited_doctor_email ?? "Medic asociat"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {organizationNameById.get(invitation.organization_id) ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {getInvitationStatusLabel(invitation.invitation_status)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {invitation.payment_responsibility === "clinic_paid"
                          ? "Plătit de clinică"
                          : "Plătit individual"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {getCoverageStatusLabel(invitation.coverage_status)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatDate(invitation.expires_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
