"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type ApprovedClinicLocation = {
  organizationId: string;
  clinicId: string;
  clinicName: string;

  formattedAddress:
    | string
    | null;
};

type DoctorLocationAssignmentControlProps = {
  relationshipId: string;
  organizationId: string;

  currentClinicId:
    | string
    | null;

  locations:
    ApprovedClinicLocation[];
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
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "ClinicOrganisationDashboard.doctorAssignment"
    );

  const router =
    useRouter();

  const [
    selectedClinicId,
    setSelectedClinicId,
  ] =
    useState(
      currentClinicId ??
      ""
    );

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(
      false
    );

  const [
    message,
    setMessage,
  ] =
    useState<
      string | null
    >(
      null
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

  const organizationLocations =
    useMemo(
      () =>
        locations.filter(
          (
            location
          ) =>
            location.organizationId ===
            organizationId
        ),
      [
        locations,
        organizationId,
      ]
    );

  async function saveAssignment() {
    if (
      !selectedClinicId ||
      isSaving ||
      selectedClinicId ===
        currentClinicId
    ) {
      return;
    }

    setIsSaving(
      true
    );

    setMessage(
      null
    );

    setError(
      null
    );

    try {
      const response =
        await fetch(
          "/api/clinic-manager/doctor-location-assignment",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                relationshipId,

                clinicId:
                  selectedClinicId,

                locale,
              }),
          }
        );

      const result =
        (await response.json()) as
          AssignmentResponse;

      if (
        !response.ok
      ) {
        throw new Error(
          locale ===
            "ro" &&
          result.error
            ? result.error
            : t(
                "error"
              )
        );
      }

      setMessage(
        locale ===
          "ro" &&
        result.message
          ? result.message
          : t(
              "success"
            )
      );

      router.refresh();
    } catch (
      assignmentError
    ) {
      setError(
        assignmentError instanceof
          Error
          ? assignmentError.message
          : t(
              "error"
            )
      );
    } finally {
      setIsSaving(
        false
      );
    }
  }

  if (
    organizationLocations.length ===
    0
  ) {
    return (
      <div className="rounded-[13px] border border-amber-200 bg-amber-50 p-[13px] text-xs leading-5 text-amber-900">
        {t(
          "noLocations"
        )}
      </div>
    );
  }

  const selectedLocation =
    organizationLocations.find(
      (
        location
      ) =>
        location.clinicId ===
        selectedClinicId
    );

  return (
    <div className="min-w-[16rem] space-y-[8px]">
      <select
        value={
          selectedClinicId
        }
        onChange={(
          event
        ) => {
          setSelectedClinicId(
            event.target
              .value
          );

          setMessage(
            null
          );

          setError(
            null
          );
        }}
        disabled={
          isSaving
        }
        className="romdoc-focus-ring w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[8px] text-sm text-gray-900"
      >
        <option value="">
          {t(
            "choose"
          )}
        </option>

        {organizationLocations.map(
          (
            location
          ) => (
            <option
              key={
                location.clinicId
              }
              value={
                location.clinicId
              }
            >
              {
                location.clinicName
              }
            </option>
          )
        )}
      </select>

      {selectedLocation
        ?.formattedAddress && (
        <p className="text-xs leading-5 text-gray-500">
          {
            selectedLocation.formattedAddress
          }
        </p>
      )}

      <button
        type="button"
        onClick={() =>
          void saveAssignment()
        }
        disabled={
          isSaving ||
          !selectedClinicId ||
          selectedClinicId ===
            currentClinicId
        }
        className="romdoc-focus-ring rounded-[8px] bg-[#036661] px-[13px] py-[8px] text-xs font-semibold text-white transition hover:bg-[#024d49] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving
          ? t(
              "saving"
            )
          : t(
              "save"
            )}
      </button>

      {message && (
        <p
          role="status"
          className="text-xs leading-5 text-green-700"
        >
          {
            message
          }
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="text-xs leading-5 text-red-700"
        >
          {
            error
          }
        </p>
      )}
    </div>
  );
}
