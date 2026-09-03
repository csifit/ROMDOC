import Link from "next/link";
import {
  NextIntlClientProvider,
} from "next-intl";
import {
  getTranslations,
} from "next-intl/server";
import {
  notFound,
  redirect,
} from "next/navigation";

import DoctorPatientFolderManager from "@/components/doctor/doctor-patient-folder-manager";
import StaffPatientFolderManager from "@/components/staff/staff-patient-folder-manager";
import {
  getAppointmentStatusLabel,
} from "@/lib/appointments/appointment-status";
import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
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

import roMessages from "../../../../messages/ro.json";
import enMessages from "../../../../messages/en.json";
import deMessages from "../../../../messages/de.json";

type Props = {
  params: Promise<{
    appointmentId: string;
  }>;
  searchParams: Promise<{
    locale?: string;
  }>;
};

const messagesByLocale = {
  ro: roMessages,
  en: enMessages,
  de: deMessages,
} as const;

const INTL_LOCALE = {
  ro: "ro-RO",
  en: "en-GB",
  de: "de-DE",
} as const;

export default async function MedicalFolderPage({
  params,
  searchParams,
}: Props) {
  const { appointmentId } =
    await params;

  const query =
    await searchParams;

  const storedLocale =
    await getStoredAppLocale();

  const locale = query.locale
    ? normalizeAppLocale(
        query.locale
      )
    : storedLocale;

  const t =
    await getTranslations({
      locale,
      namespace:
        "DoctorAppointmentOperations.folder.page",
    });

  if (!isUuid(appointmentId)) {
    notFound();
  }

  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth
    .getUser();

  if (
    userError ||
    !user
  ) {
    const nextPath =
      `/medical-folder/${appointmentId}?locale=${locale}`;

    redirect(
      `/login?locale=${locale}&next=${encodeURIComponent(nextPath)}`
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
    profile.account_status !== "active" ||
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
      scheduled_time,
      consultation_mode
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
  let familyDoctorCanEditCompleted =
    false;

  if (profile.role === "doctor") {
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

    if (
      authorized &&
      doctor?.id &&
      appointment.status ===
        "completed"
    ) {
      const {
        data: familyLink,
        error: familyLinkError,
      } = await admin
        .from(
          "patient_family_doctors"
        )
        .select("doctor_id")
        .eq(
          "patient_profile_id",
          appointment.patient_profile_id
        )
        .eq(
          "doctor_id",
          doctor.id
        )
        .maybeSingle();

      if (familyLinkError) {
        console.error(
          "Family Doctor Medical Folder lookup failed:",
          familyLinkError
        );
      }

      familyDoctorCanEditCompleted =
        Boolean(familyLink);
    }
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
      .eq(
        "status",
        "active"
      )
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
      ? "/doctor-dashboard/patients"
      : "/staff-dashboard";

  const formattedDate =
    new Intl.DateTimeFormat(
      INTL_LOCALE[locale],
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    ).format(
      new Date(
        `${effectiveDate}T12:00:00`
      )
    );

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={
        messagesByLocale[locale]
      }
    >
      <main className="min-h-screen bg-[#F0EEE9] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <header className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm font-semibold text-[#036661]">
                  RomDoc
                </p>

                <h1 className="mt-2 text-3xl font-bold text-gray-900">
                  {t("title")}
                </h1>

                <p className="mt-3 text-lg font-semibold text-gray-900">
                  {appointment.patient_name}
                </p>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                  <span>
                    {t("status")}: {" "}
                    <strong>
                      {getAppointmentStatusLabel(
                        appointment.status,
                        locale
                      )}
                    </strong>
                  </span>

                  <span>
                    {t("date")}: {" "}
                    <strong>
                      {formattedDate}
                      {effectiveTime
                        ? `, ${effectiveTime.slice(0, 5)}`
                        : ""}
                    </strong>
                  </span>

                  <span>
                    {locale === "ro" ? "Tip consultație" : locale === "de" ? "Terminart" : "Consultation type"}: {" "}
                    <strong>
                      {appointment.consultation_mode === "video"
                        ? (locale === "ro" ? "Video" : locale === "de" ? "Video" : "Video")
                        : (locale === "ro" ? "În persoană" : locale === "de" ? "Persönlich" : "In person")}
                    </strong>
                  </span>
                </div>
              </div>

              <Link
                href={returnPath}
                className="romdoc-button romdoc-button-secondary w-fit"
              >
                {t("back")}
              </Link>
            </div>
          </header>

          {profile.role === "doctor" ? (
            <DoctorPatientFolderManager
              appointmentId={
                appointment.id
              }
              appointmentStatus={
                appointment.status
              }
              familyDoctorCanEditCompleted={
                familyDoctorCanEditCompleted
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
    </NextIntlClientProvider>
  );
}
