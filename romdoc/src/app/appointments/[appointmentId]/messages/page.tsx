import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import AppointmentMessages from "@/components/appointments/appointment-messages";
import {
  getAppointmentMessageAccess,
} from "@/lib/appointments/get-appointment-message-access";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    appointmentId: string;
  }>;
};

type AppointmentDetailsRow = {
  id: string;
  doctor_id: string;
  clinic_id: string | null;
  patient_profile_id: string | null;
  patient_name: string;
  requested_date: string;
  requested_time: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string;
};

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(
      `${value}T12:00:00`
    )
  );
}

function formatTime(
  value: string | null
) {
  return value
    ? value.slice(
        0,
        5
      )
    : "—";
}

function getBackHref(
  role: string
) {
  if (
    role === "doctor"
  ) {
    return "/doctor-dashboard/inbox";
  }

  if (
    role === "staff"
  ) {
    return "/staff-dashboard";
  }

  return "/patient-dashboard";
}

function getStatusLabel(
  status: string
) {
  switch (status) {
    case "confirmed":
      return "Confirmată";
    case "rescheduled":
      return "Reprogramată";
    case "cancelled":
      return "Anulată";
    case "completed":
      return "Finalizată";
    case "no_show":
      return "Neprezentare";
    default:
      return "În așteptare";
  }
}

export default async function AppointmentMessagesPage({
  params,
}: PageProps) {
  const {
    appointmentId,
  } =
    await params;

  const supabase =
    await createClient();

  const admin =
    createAdminClient();

  const accessResult =
    await getAppointmentMessageAccess({
      supabase,
      admin,
      appointmentId,
    });

  if (
    accessResult.error
  ) {
    if (
      accessResult.status ===
      401
    ) {
      redirect(
        `/login?next=/appointments/${appointmentId}/messages`
      );
    }

    redirect(
      "/dashboard"
    );
  }

  const {
    access,
  } =
    accessResult;

  const {
    data: appointment,
    error:
      appointmentError,
  } = await admin
    .from("appointments")
    .select(
      "id, doctor_id, clinic_id, patient_profile_id, patient_name, requested_date, requested_time, scheduled_date, scheduled_time, status"
    )
    .eq(
      "id",
      appointmentId
    )
    .maybeSingle();

  if (
    appointmentError ||
    !appointment
  ) {
    redirect(
      getBackHref(
        access?.profile?.role ?? "patient"
      )
    );
  }

  const typedAppointment =
    appointment as AppointmentDetailsRow;

  const appointmentDate =
    typedAppointment.scheduled_date ??
    typedAppointment.requested_date;

  const appointmentTime =
    typedAppointment.scheduled_time ??
    typedAppointment.requested_time;

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-[13px] py-[21px] sm:px-[21px] sm:py-[34px]">
      <div className="mx-auto max-w-5xl">
        <Link
          href={getBackHref(
              access?.profile?.role ?? "patient"
            )}
          className="romdoc-focus-ring inline-flex min-h-[34px] items-center rounded-[13px] border border-gray-300 bg-white px-[13px] py-[8px] text-sm font-semibold text-gray-700 transition hover:border-[#036661] hover:text-[#036661]"
        >
          Înapoi
        </Link>

        <header className="mt-[13px] rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
          <div className="flex flex-col gap-[13px] sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#036661]">
                Mesaje programare
              </p>

              <h1 className="mt-[5px] text-3xl font-bold text-gray-900">
                Mesaje și fișiere
              </h1>

              <p className="mt-[8px] max-w-2xl text-sm leading-6 text-gray-600">
                Conversația este disponibilă numai participanților acestei programări.
              </p>
            </div>

            <span className="w-fit rounded-full bg-gray-100 px-[13px] py-[5px] text-sm font-semibold text-gray-700">
              {getStatusLabel(
                typedAppointment.status
              )}
            </span>
          </div>

          <div className="mt-[21px] grid gap-[13px] text-sm text-gray-700 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Pacient
              </p>

              <p className="mt-[5px] font-medium text-gray-900">
                {
                  typedAppointment.patient_name
                }
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Data
              </p>

              <p className="mt-[5px] font-medium text-gray-900">
                {formatDate(
                  appointmentDate
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Ora
              </p>

              <p className="mt-[5px] font-medium text-gray-900">
                {formatTime(
                  appointmentTime
                )}
              </p>
            </div>
          </div>
        </header>

        <div className="mt-[21px]">
          <AppointmentMessages
            appointmentId={
              appointmentId
            }
          />
        </div>
      </div>
    </main>
  );
}
