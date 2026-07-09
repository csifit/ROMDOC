"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CoverageAction = "approve" | "pause" | "end";

type ClinicDoctorCoverageActionsProps = {
  relationshipId: string;
  invitationStatus: string;
  coverageStatus: string;
  hasDoctor: boolean;
};

type CoverageResponse = {
  message?: string;
  error?: string;
};

export default function ClinicDoctorCoverageActions({
  relationshipId,
  invitationStatus,
  coverageStatus,
  hasDoctor,
}: ClinicDoctorCoverageActionsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<CoverageAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canApprove =
    invitationStatus === "accepted" &&
    coverageStatus !== "active" &&
    coverageStatus !== "ended" &&
    hasDoctor;

  const canPause = coverageStatus === "active";
  const canEnd = coverageStatus !== "ended" && coverageStatus !== "cancelled";

  async function runAction(action: CoverageAction) {
    if (pendingAction) {
      return;
    }

    setPendingAction(action);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/clinic-doctor-coverage", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          relationshipId,
          action,
          pauseReason:
            action === "pause"
              ? "Acoperirea a fost suspendată de administrator."
              : null,
        }),
      });

      const result = (await response.json()) as CoverageResponse;

      if (!response.ok) {
        throw new Error(result.error ?? "Acoperirea nu a putut fi actualizată.");
      }

      setSuccess(result.message ?? "Acoperirea a fost actualizată.");
      router.refresh();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Acoperirea nu a putut fi actualizată."
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => runAction("approve")}
          disabled={!canApprove || Boolean(pendingAction)}
          className="romdoc-focus-ring rounded-lg bg-[#036661] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#024d49] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendingAction === "approve" ? "Se aprobă..." : "Aprobă"}
        </button>

        <button
          type="button"
          onClick={() => runAction("pause")}
          disabled={!canPause || Boolean(pendingAction)}
          className="romdoc-focus-ring rounded-lg border border-orange-300 px-3 py-2 text-xs font-semibold text-orange-800 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendingAction === "pause" ? "Se suspendă..." : "Suspendă"}
        </button>

        <button
          type="button"
          onClick={() => runAction("end")}
          disabled={!canEnd || Boolean(pendingAction)}
          className="romdoc-focus-ring rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-800 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendingAction === "end" ? "Se încheie..." : "Încheie"}
        </button>
      </div>

      {error && <p className="text-xs leading-5 text-red-700">{error}</p>}
      {success && <p className="text-xs leading-5 text-green-700">{success}</p>}
    </div>
  );
}
