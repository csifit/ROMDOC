import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import DoctorPatientFolderManager from "@/components/doctor/doctor-patient-folder-manager";
import StaffPatientFolderManager from "@/components/staff/staff-patient-folder-manager";
import {
  canReadMedicalFolder,
  isUuid,
} from "@/lib/medical-folder/folder-operations";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    appointmentId: string;
  }>;
};

function getStatusLabel(
  status: string
) {
  switch (status) {
    case "confirmed":
      return "Confirmată";

    case "rescheduled":
      return "Reprogramată";

    case "completed":
      return "Finalizată";

    default:
      return status;
  }
}

function formatDate(
  date: string
) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(
    new Date(
      `${date}T12:00:00`
    )
  );
}

export default async function MedicalFolderPage({
  params,
}: Props) {
  const {
    appointmentId,
  } = await params;

  if (
    !isUuid(appointmentId)
  ) {
    notFound();
  }

  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    redirect(
      `/login?next=${encodeURIComponent(
        `/medical-folder/${appointmentId}`
      )}`
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "role, account_status, first_name, last_name"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.account_status !==
      "active" ||
    ![
      "doctor",
      "staff",
    ].includes(profile.role)
  ) {
    redirect("/dashboard");
  }

  const admin =
    createAdminClient();

  const {
    data: appointment,
    error: appointmentError,
  } = await admin
    .from("appointments")
    .select(`
      id,
      doctor_id,
      clinic_id,
      patient_profile_id,
      patient_name,
      status,
      requested_date,
      requested_time,
      scheduled_date,
      scheduled_time
    `)
    .eq("id", appointmentId)
    .maybeSingle();

  if (
    appointmentError ||
    !appointment ||
    !appointment.patient_profile_id ||
    !canReadMedicalFolder(
      appointment.status
    )
  ) {
    notFound();
  }

  let authorized = false;

  if (
    profile.role ===
    "doctor"
  ) {
    const {
      data: doctor,
      error: doctorError,
    } = await supabase
      .from("doctors")
      .select("id")
      .eq(
        "profile_id",
        user.id
      )
      .maybeSingle();

    authorized =
      !doctorError &&
      doctor?.id ===
        appointment.doctor_id;
  } else {
    const {
      data: assignment,
      error: assignmentError,
    } = await admin
      .from("doctor_staff")
      .select("id")
      .eq(
        "staff_profile_id",
        user.id
      )
      .eq(
        "doctor_id",
        appointment.doctor_id
      )
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    authorized =
      !assignmentError &&
      Boolean(assignment);
  }

  if (!authorized) {
    notFound();
  }

  const effectiveDate =
    appointment.scheduled_date ??
    appointment.requested_date;

  const effectiveTime =
    appointment.scheduled_time ??
    appointment.requested_time;

  const returnPath =
    profile.role === "doctor"
      ? "/doctor-dashboard/appointments"
      : "/staff-dashboard";

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-semibold text-[#036661]">
                RomDoc
              </p>

              <h1 className="mt-2 text-3xl font-bold text-gray-900">
                Dosarul medical al pacientului
              </h1>

              <p className="mt-3 text-lg font-semibold text-gray-900">
                {
                  appointment.patient_name
                }
              </p>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                <span>
                  Status:{" "}
                  <strong>
                    {getStatusLabel(
                      appointment.status
                    )}
                  </strong>
                </span>

                <span>
                  Data:{" "}
                  <strong>
                    {formatDate(
                      effectiveDate
                    )}
                    {effectiveTime
                      ? `, ${effectiveTime.slice(
                          0,
                          5
                        )}`
                      : ""}
                  </strong>
                </span>
              </div>
            </div>

            <Link
              href={returnPath}
              className="romdoc-button romdoc-button-secondary w-fit"
            >
              Înapoi la programări
            </Link>
          </div>
        </header>

        {profile.role ===
        "doctor" ? (
          <DoctorPatientFolderManager
            appointmentId={
              appointment.id
            }
            appointmentStatus={
              appointment.status
            }
            standalone
          />
        ) : (
          <StaffPatientFolderManager
            appointmentId={
              appointment.id
            }
            appointmentStatus={
              appointment.status
            }
            standalone
          />
        )}
      </div>
    </main>
  );
}
