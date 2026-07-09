"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DoctorClinicInviteAcceptPanelProps = {
  token: string;
};

type AcceptResponse = {
  message?: string;
  error?: string;
};

export default function DoctorClinicInviteAcceptPanel({
  token,
}: DoctorClinicInviteAcceptPanelProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function acceptInvitation() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/clinic-doctor-invitations/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
        }),
      });

      const result = (await response.json()) as AcceptResponse;

      if (!response.ok) {
        throw new Error(result.error ?? "Invitația nu a putut fi acceptată.");
      }

      setSuccess(result.message ?? "Invitația a fost acceptată.");
      router.refresh();
    } catch (acceptError) {
      setError(
        acceptError instanceof Error
          ? acceptError.message
          : "Invitația nu a putut fi acceptată."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={acceptInvitation}
        disabled={isSubmitting}
        className="romdoc-focus-ring rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#024d49] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Se acceptă invitația..." : "Acceptă invitația clinicii"}
      </button>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800">
          {success}
        </div>
      )}
    </div>
  );
}
