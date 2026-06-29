"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import StaffAppointmentsFilteredList, {
  type StaffAppointmentListItem,
} from "@/components/staff/staff-appointments-filtered-list";
import StaffAppointmentsWeeklyCalendar, {
  type StaffWeeklyAppointment,
} from "@/components/staff/staff-appointments-weekly-calendar";
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
              getDoctorName(
                appointment
              ),
            clinicName:
              getClinicName(
                appointment
              ),
          })
        ),
      [appointments]
    );

  const calendarAppointments =
    useMemo<
      StaffWeeklyAppointment[]
    >(
      () =>
        appointments.flatMap(
          (appointment) => {
            const date =
              appointment.scheduled_date ??
              appointment.requested_date;

            const time =
              appointment.scheduled_time ??
              appointment.requested_time;

            if (!date || !time) {
              return [];
            }

            return [
              {
                id:
                  appointment.id,
                patientName:
                  appointment.patient_name,
                doctorName:
                  getDoctorName(
                    appointment
                  ),
                clinicName:
                  getClinicName(
                    appointment
                  ),
                date,
                time,
                status:
                  appointment.status,
              },
            ];
          }
        ),
      [appointments]
    );

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-gray-600">
          Se încarcă programările...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-[#036661]">
          Personal
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Programările medicului
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          Ai acces la toate programările și poți crea, confirma, reprograma, finaliza, marca drept neprezentare sau anula programări pentru medicii pe care îi gestionezi.
        </p>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
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

          <StaffAppointmentsWeeklyCalendar
            appointments={
              calendarAppointments
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
