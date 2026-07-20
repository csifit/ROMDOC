"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import StaffAppointmentsCalendar from "@/components/staff/staff-appointments-calendar";
import StaffAppointmentsFilteredList, {
  type StaffAppointmentListItem,
} from "@/components/staff/staff-appointments-filtered-list";
import StaffCreateAppointmentForm, {
  type StaffDoctorOption,
} from "@/components/staff/staff-create-appointment-form";
import {
  normalizeAppLocale,
  selectTranslation,
} from "@/lib/i18n/app-locale";

type Translation = {
  locale: string;
  name?: string;
  title?: string;
};

type DoctorRelation = {
  id: string;
  slug: string;

  doctor_translations:
    | Translation[]
    | null;
};

type ClinicRelation = {
  id: string;
  slug: string;

  formatted_address:
    | string
    | null;

  clinic_translations:
    | Translation[]
    | null;
};

type Appointment = {
  id: string;
  doctor_id: string;
  clinic_id: string;

  patient_profile_id:
    | string
    | null;

  patient_name: string;
  patient_email: string;
  patient_phone: string;
  requested_date: string;

  requested_time:
    | string
    | null;

  scheduled_date:
    | string
    | null;

  scheduled_time:
    | string
    | null;

  duration_minutes:
    | number
    | null;

  status: string;

  notes:
    | string
    | null;

  reschedule_reason:
    | string
    | null;

  source:
    | string
    | null;

  created_at: string;

  doctors:
    | DoctorRelation
    | DoctorRelation[]
    | null;

  clinics:
    | ClinicRelation
    | ClinicRelation[]
    | null;
};

type StaffAppointmentsResponse = {
  appointments?:
    Appointment[];

  doctorOptions?:
    StaffDoctorOption[];

  error?: string;
};

function first<T>(
  relation:
    | T
    | T[]
    | null
    | undefined
) {
  if (!relation) {
    return null;
  }

  return Array.isArray(
    relation
  )
    ? relation[0] ??
        null
    : relation;
}

function formatSlugName(
  slug:
    string
) {
  return slug
    .split(
      "-"
    )
    .map(
      (
        part
      ) =>
        part
          .charAt(
            0
          )
          .toUpperCase() +
        part.slice(
          1
        )
    )
    .join(
      " "
    );
}

export default function StaffAppointmentsManager() {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "StaffOperationalDashboard.manager"
    );

  const [
    appointments,
    setAppointments,
  ] =
    useState<
      Appointment[]
    >(
      []
    );

  const [
    doctorOptions,
    setDoctorOptions,
  ] =
    useState<
      StaffDoctorOption[]
    >(
      []
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true
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

  const loadAppointments =
    useCallback(
      async () => {
        try {
          setIsLoading(
            true
          );

          setError(
            null
          );

          const response =
            await fetch(
              "/api/staff/appointments",
              {
                method:
                  "GET",

                cache:
                  "no-store",
              }
            );

          const result =
            (await response.json()) as
              StaffAppointmentsResponse;

          if (
            !response.ok
          ) {
            throw new Error(
              locale ===
                "ro" &&
              result.error
                ? result.error
                : t(
                    "loadError"
                  )
            );
          }

          setAppointments(
            result.appointments ??
            []
          );

          setDoctorOptions(
            result.doctorOptions ??
            []
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : t(
                  "loadError"
                )
          );
        } finally {
          setIsLoading(
            false
          );
        }
      },
      [
        locale,
        t,
      ]
    );

  useEffect(() => {
    void loadAppointments();
  }, [
    loadAppointments,
  ]);

  const appointmentListItems =
    useMemo<
      StaffAppointmentListItem[]
    >(
      () =>
        appointments.map(
          (
            appointment
          ) => {
            const doctor =
              first(
                appointment.doctors
              );

            const clinic =
              first(
                appointment.clinics
              );

            const doctorBaseName =
              doctor
                ? formatSlugName(
                    doctor.slug
                  )
                : t(
                    "doctorFallback"
                  );

            const doctorTitle =
              selectTranslation(
                doctor
                  ?.doctor_translations,
                locale
              )?.title ??
              null;

            const clinicName =
              selectTranslation(
                clinic
                  ?.clinic_translations,
                locale
              )?.name ??
              clinic?.slug ??
              t(
                "clinicFallback"
              );

            return {
              id:
                appointment.id,

              doctorId:
                appointment.doctor_id,

              clinicId:
                appointment.clinic_id,

              patientProfileId:
                appointment
                  .patient_profile_id,

              patientName:
                appointment.patient_name,

              patientEmail:
                appointment.patient_email,

              patientPhone:
                appointment.patient_phone,

              requestedDate:
                appointment.requested_date,

              requestedTime:
                appointment.requested_time,

              scheduledDate:
                appointment.scheduled_date,

              scheduledTime:
                appointment.scheduled_time,

              durationMinutes:
                appointment.duration_minutes,

              rescheduleReason:
                appointment.reschedule_reason,

              notes:
                appointment.notes,

              source:
                appointment.source,

              status:
                appointment.status,

              createdAt:
                appointment.created_at,

              doctorName:
                doctorTitle
                  ? `${doctorBaseName} — ${doctorTitle}`
                  : doctorBaseName,

              clinicName:
                clinicName,
            };
          }
        ),
      [
        appointments,
        locale,
        t,
      ]
    );

  if (
    isLoading
  ) {
    return (
      <div className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <p className="text-sm text-gray-600">
          {t(
            "loading"
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-[34px]">
      <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <p className="text-sm font-semibold text-[#036661]">
          {t(
            "eyebrow"
          )}
        </p>

        <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
          {t(
            "title"
          )}
        </h1>

        <p className="mt-[13px] max-w-4xl text-sm leading-6 text-gray-600">
          {t(
            "description"
          )}
        </p>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
        >
          <p className="font-semibold">
            {t(
              "loadError"
            )}
          </p>

          <p className="mt-[5px]">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadAppointments()
            }
            className="romdoc-focus-ring mt-[13px] inline-flex min-h-[34px] items-center rounded-[13px] border border-red-300 bg-white px-[13px] py-[8px] font-semibold text-red-800"
          >
            {t(
              "retry"
            )}
          </button>
        </div>
      )}

      {!error && (
        <>
          <StaffCreateAppointmentForm
            doctors={
              doctorOptions
            }
            onCreated={
              loadAppointments
            }
          />

          <StaffAppointmentsCalendar
            appointments={
              appointmentListItems
            }
            onUpdated={
              loadAppointments
            }
          />

          <StaffAppointmentsFilteredList
            appointments={
              appointmentListItems
            }
            onUpdated={
              loadAppointments
            }
          />
        </>
      )}
    </div>
  );
}
