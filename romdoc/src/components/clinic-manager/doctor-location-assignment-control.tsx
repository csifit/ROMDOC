"use client";

import {
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type ApprovedClinicLocation = {
  organizationId: string;
  clinicId: string;
  clinicName: string;
  formattedAddress: string | null;
};

type DoctorLocationAssignmentControlProps = {
  relationshipId: string;
  organizationId: string;
  currentClinicId: string | null;
  locations: ApprovedClinicLocation[];
};

type AssignmentResponse = {
  message?: string;
  error?: string;
};

export default function DoctorLocationAssignmentControl({
  relationshipId,
  organizationId,
  currentClinicId,
  locations,
}: DoctorLocationAssignmentControlProps) {
  const router = useRouter();
  const [selectedClinicId, setSelectedClinicId] =
    useState(currentClinicId ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] =
    useState<string | null>(null);
  const [error, setError] =
    useState<string | null>(null);

  const organizationLocations = useMemo(
    () =>
      locations.filter(
        (location) =>
          location.organizationId === organizationId
      ),
    [locations, organizationId]
  );

  async function saveAssignment() {
    if (!selectedClinicId || isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(
        "/api/clinic-manager/doctor-location-assignment",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            relationshipId,
            clinicId: selectedClinicId,
          }),
        }
      );

      const result =
        (await response.json()) as AssignmentResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Locația nu a putut fi salvată."
        );
      }

      setMessage(
        result.message ??
          "Locația a fost salvată."
      );

      router.refresh();
    } catch (assignmentError) {
      setError(
        assignmentError instanceof Error
          ? assignmentError.message
          : "Locația nu a putut fi salvată."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (organizationLocations.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
        Nu există încă locații aprobate pentru această organizație.
        Creează o cerere din pagina Locații și așteaptă aprobarea RomDoc.
      </div>
    );
  }

  const selectedLocation = organizationLocations.find(
    (location) => location.clinicId === selectedClinicId
  );

  return (
    <div className="min-w-[16rem] space-y-2">
      <select
        value={selectedClinicId}
        onChange={(event) => {
          setSelectedClinicId(event.target.value);
          setMessage(null);
          setError(null);
        }}
        className="romdoc-focus-ring w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
      >
        <option value="">Alege locația</option>
        {organizationLocations.map((location) => (
          <option
            key={location.clinicId}
            value={location.clinicId}
          >
            {location.clinicName}
          </option>
        ))}
      </select>

      {selectedLocation?.formattedAddress ? (
        <p className="text-xs leading-5 text-gray-500">
          {selectedLocation.formattedAddress}
        </p>
      ) : null}

      <button
        type="button"
        onClick={saveAssignment}
        disabled={
          isSaving ||
          !selectedClinicId ||
          selectedClinicId === currentClinicId
        }
        className="romdoc-focus-ring rounded-lg bg-[#036661] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#024d49] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Se salvează..." : "Salvează locația"}
      </button>

      {message ? (
        <p className="text-xs leading-5 text-green-700">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="text-xs leading-5 text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
