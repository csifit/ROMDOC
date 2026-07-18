"use client";

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
  patient_profile_id: string | null;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  requested_date: string;
  requested_time: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  duration_minutes: number | null;
  status: string;
  notes: string | null;
  reschedule_reason: string | null;
  source: string | null;
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
  appointments?: Appointment[];
  doctorOptions?: StaffDoctorOption[];
  error?: string;
};

function getFirstRelation<T>(
  relation:
    | T
    | T[]
    | null
    | undefined
) {
  if (!relation) {
    return null;
  }

  return Array.isArray(relation)
    ? relation[0] ?? null
    : relation;
}

function getClinicName(
  appointment: Appointment
) {
  const clinic =
    getFirstRelation(
      appointment.clinics
    );

  return (
    clinic?.clinic_translations
      ?.find(
        (translation) =>
          translation.locale === "ro"
      )?.name ??
    clinic?.clinic_translations?.[0]
      ?.name ??
    clinic?.slug ??
    "Clinică"
  );
}

function getDoctorName(
  appointment: Appointment
) {
  const doctor =
    getFirstRelation(
      appointment.doctors
    );

  if (!doctor) {
    return "Medic";
  }

  const translatedTitle =
    doctor.doctor_translations?.find(
      (translation) =>
        translation.locale === "ro"
    )?.title ??
    doctor.doctor_translations?.[0]
      ?.title ??
    null;

  const name = doctor.slug
    .split("-")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");

  return translatedTitle
    ? `${name} — ${translatedTitle}`
    : name;
}

export default function StaffAppointmentsManager() {
  const [
    appointments,
    setAppointments,
  ] = useState<Appointment[]>([]);

  const [
    doctorOptions,
    setDoctorOptions,
  ] = useState<
    StaffDoctorOption[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadAppointments =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response =
          await fetch(
            "/api/staff/appointments",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const result =
          (await response.json()) as
            StaffAppointmentsResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Programările nu au putut fi încărcate."
          );
        }

        setAppointments(
          result.appointments ?? []
        );

        setDoctorOptions(
          result.doctorOptions ?? []
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Programările nu au putut fi încărcate."
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  const appointmentListItems =
    useMemo<
      StaffAppointmentListItem[]
    >(
      () =>
        appointments.map(
          (appointment) => ({
            id: appointment.id,
            doctorId:
              appointment.doctor_id,
            clinicId:
              appointment.clinic_id,
            patientProfileId:
              appointment.patient_profile_id,
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
              getDoctorName(appointment),
            clinicName:
              getClinicName(appointment),
          })
        ),
      [appointments]
    );

  if (isLoading) {
    return (
      <div className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <p className="text-sm text-gray-600">
          Se încarcă programările...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-[34px]">
      <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <p className="text-sm font-semibold text-[#036661]">
          Personal
        </p>

        <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
          Programările medicului
        </h1>

        <p className="mt-[13px] max-w-4xl text-sm leading-6 text-gray-600">
          Ai acces la toate programările și poți crea, confirma, reprograma, finaliza, marca drept neprezentare sau anula programări pentru medicii pe care îi gestionezi.
        </p>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
        >
          <p className="font-semibold">
            Programările nu au putut fi încărcate.
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
            Reîncearcă
          </button>
        </div>
      )}

      {!error && (
        <>
          <StaffCreateAppointmentForm
            doctors={doctorOptions}
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
