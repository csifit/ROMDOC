import Link from "next/link";
import { redirect } from "next/navigation";

import AppointmentMessages from "@/components/appointments/appointment-messages";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    appointmentId: string;
  }>;
};

type ProfileRow = {
  id: string;
  role: string;
  account_status: string | null;
  first_name: string | null;
  last_name: string | null;
};

type AppointmentRow = {
  id: string;
  doctor_id: string;
  patient_profile_id: string | null;
  patient_name: string;
  requested_date: string;
  requested_time: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatTime(value: string | null) {
  return value ? value.slice(0, 5) : "—";
}

function getBackHref(role: string) {
  if (role === "doctor") {
    return "/doctor-dashboard/appointments";
  }

  return "/patient-dashboard";
}

export default async function AppointmentMessagesPage({
  params,
}: PageProps) {
  const { appointmentId } = await params;

  if (!isUuid(appointmentId)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(
      `/login?next=/appointments/${appointmentId}/messages`
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await admin
    .from("profiles")
    .select(
      "id, role, account_status, first_name, last_name"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    redirect("/dashboard");
  }

  const typedProfile = profile as ProfileRow;

  const {
    data: appointment,
    error: appointmentError,
  } = await admin
    .from("appointments")
    .select(
      "id, doctor_id, patient_profile_id, patient_name, requested_date, requested_time, scheduled_date, scheduled_time, status"
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (appointmentError || !appointment) {
    redirect(getBackHref(typedProfile.role));
  }

  const typedAppointment =
    appointment as AppointmentRow;

  let hasAccess =
    typedProfile.role === "patient" &&
    typedAppointment.patient_profile_id === user.id;

  if (!hasAccess && typedProfile.role === "doctor") {
    const { data: doctor } = await admin
      .from("doctors")
      .select("id, profile_id")
      .eq("id", typedAppointment.doctor_id)
      .maybeSingle();

    hasAccess =
      !!doctor && doctor.profile_id === user.id;
  }

  if (!hasAccess) {
    redirect("/dashboard");
  }

  const appointmentDate =
    typedAppointment.scheduled_date ??
    typedAppointment.requested_date;

  const appointmentTime =
    typedAppointment.scheduled_time ??
    typedAppointment.requested_time;

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href={getBackHref(typedProfile.role)}
          className="inline-flex rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#036661] hover:text-[#036661]"
        >
          Înapoi la programări
        </Link>

        <header className="mt-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-[#036661]">
            Mesaje programare
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Mesaje și fișiere pentru programare
          </h1>

          <div className="mt-5 grid gap-4 text-sm text-gray-700 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Pacient
              </p>
              <p className="mt-1 font-medium text-gray-900">
                {typedAppointment.patient_name}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Data
              </p>
              <p className="mt-1 font-medium text-gray-900">
                {formatDate(appointmentDate)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Ora
              </p>
              <p className="mt-1 font-medium text-gray-900">
                {formatTime(appointmentTime)}
              </p>
            </div>
          </div>
        </header>

        <div className="mt-6">
          <AppointmentMessages
            appointmentId={appointmentId}
          />
        </div>
      </div>
    </main>
  );
}
