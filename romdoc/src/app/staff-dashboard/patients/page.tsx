import {
  NextIntlClientProvider,
} from "next-intl";
import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import StaffPatientsTable, {
  type StaffPatientDatabaseRow,
  type StaffPatientHistoryItem,
} from "@/components/staff/staff-patients-table";
import StaffLogoutButton from "@/components/staff/staff-logout-button";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

import roMessages from "../../../../messages/ro.json";
import enMessages from "../../../../messages/en.json";
import deMessages from "../../../../messages/de.json";

type DoctorPatientRow = {
  id: string;
  doctor_id: string;
  patient_profile_id: string | null;
  display_name: string;
  email: string | null;
  phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  county: string | null;
  postal_code: string | null;
  country: string | null;
};

type AppointmentRow = {
  id: string;
  doctor_id: string;
  patient_profile_id: string | null;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  requested_date: string;
  requested_time: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string;
};

type DoctorRow = {
  id: string;
  slug: string;
  profile:
    | {
        first_name: string | null;
        last_name: string | null;
      }
    | Array<{
        first_name: string | null;
        last_name: string | null;
      }>
    | null;
};

const messagesByLocale = {
  ro: roMessages,
  en: enMessages,
  de: deMessages,
} as const;

const NAV_COPY = {
  ro: {
    appointments:
      "Programări",
    home:
      "Acasă",
    role:
      "Personal medical",
  },
  en: {
    appointments:
      "Appointments",
    home:
      "Home",
    role:
      "Medical staff",
  },
  de: {
    appointments:
      "Termine",
    home:
      "Startseite",
    role:
      "Praxispersonal",
  },
} as const;

function first<T>(
  value:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(
    value
  )
    ? value[0] ??
        null
    : value;
}

function formatSlugName(
  slug: string
) {
  return slug
    .split("-")
    .map(
      (part) =>
        part
          .charAt(0)
          .toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function doctorName(
  doctor:
    DoctorRow
) {
  const profile =
    first(
      doctor.profile
    );

  const profileName =
    [
      profile?.first_name,
      profile?.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  return profileName
    ? `Dr. ${profileName}`
    : formatSlugName(
        doctor.slug
      );
}

function normalizeName(
  value: string
) {
  return value
    .trim()
    .toLowerCase();
}

function normalizeEmail(
  value:
    | string
    | null
    | undefined
) {
  return (
    value ??
    ""
  )
    .trim()
    .toLowerCase();
}

function normalizePhone(
  value:
    | string
    | null
    | undefined
) {
  return (
    value ??
    ""
  ).replace(
    /\D/g,
    ""
  );
}

function appointmentTimestamp(
  appointment:
    AppointmentRow
) {
  const date =
    appointment
      .scheduled_date ??
    appointment
      .requested_date;

  const time =
    appointment
      .scheduled_time ??
    appointment
      .requested_time ??
    "00:00:00";

  return new Date(
    `${date}T${time.slice(0, 8)}`
  ).getTime();
}

function appointmentMatchesPatient(
  appointment:
    AppointmentRow,
  patient:
    DoctorPatientRow
) {
  if (
    appointment.doctor_id !==
    patient.doctor_id
  ) {
    return false;
  }

  if (
    patient.patient_profile_id &&
    appointment.patient_profile_id ===
      patient.patient_profile_id
  ) {
    return true;
  }

  if (
    normalizeName(
      appointment.patient_name
    ) !==
    normalizeName(
      patient.display_name
    )
  ) {
    return false;
  }

  const patientEmail =
    normalizeEmail(
      patient.email
    );

  const appointmentEmail =
    normalizeEmail(
      appointment.patient_email
    );

  const patientPhone =
    normalizePhone(
      patient.phone
    );

  const appointmentPhone =
    normalizePhone(
      appointment.patient_phone
    );

  return (
    Boolean(
      patientEmail &&
      appointmentEmail &&
      patientEmail ===
        appointmentEmail
    ) ||
    Boolean(
      patientPhone &&
      appointmentPhone &&
      patientPhone ===
        appointmentPhone
    )
  );
}

export default async function
StaffPatientsPage() {
  const locale =
    await getStoredAppLocale();

  const copy =
    NAV_COPY[locale];

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
    error:
      userError,
  } =
    await supabase.auth
      .getUser();

  if (
    userError ||
    !user
  ) {
    const parameters =
      new URLSearchParams({
        locale,
        next:
          "/staff-dashboard/patients",
      });

    redirect(
      `/login?${parameters.toString()}`
    );
  }

  const {
    data:
      profile,
    error:
      profileError,
  } =
    await supabase
      .from(
        "profiles"
      )
      .select(
        "role, account_status, first_name, last_name"
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !==
      "staff" ||
    profile.account_status !==
      "active"
  ) {
    redirect(
      "/dashboard"
    );
  }

  const admin =
    createAdminClient();

  const {
    data:
      assignments,
    error:
      assignmentError,
  } =
    await admin
      .from(
        "doctor_staff"
      )
      .select(
        "doctor_id"
      )
      .eq(
        "staff_profile_id",
        user.id
      )
      .eq(
        "status",
        "active"
      );

  if (
    assignmentError
  ) {
    console.error(
      "Staff patient assignment lookup failed:",
      assignmentError
    );
  }

  const doctorIds =
    Array.from(
      new Set(
        (
          assignments ??
          []
        ).map(
          (
            assignment
          ) =>
            assignment.doctor_id
        )
      )
    );

  if (
    doctorIds.length ===
    0
  ) {
    redirect(
      "/staff-dashboard"
    );
  }

  const [
    patientResult,
    appointmentResult,
    doctorResult,
  ] =
    await Promise.all([
      admin
        .from(
          "doctor_patients"
        )
        .select(`
          id,
          doctor_id,
          patient_profile_id,
          display_name,
          email,
          phone,
          address_line_1,
          address_line_2,
          city,
          county,
          postal_code,
          country
        `)
        .in(
          "doctor_id",
          doctorIds
        )
        .is(
          "archived_at",
          null
        )
        .order(
          "display_name",
          {
            ascending:
              true,
          }
        ),

      admin
        .from(
          "appointments"
        )
        .select(`
          id,
          doctor_id,
          patient_profile_id,
          patient_name,
          patient_email,
          patient_phone,
          requested_date,
          requested_time,
          scheduled_date,
          scheduled_time,
          status
        `)
        .in(
          "doctor_id",
          doctorIds
        ),

      admin
        .from(
          "doctors"
        )
        .select(`
          id,
          slug,
          profile:profiles!doctors_profile_id_fkey (
            first_name,
            last_name
          )
        `)
        .in(
          "id",
          doctorIds
        ),
    ]);

  const loadError =
    patientResult.error ??
    appointmentResult.error ??
    doctorResult.error ??
    null;

  if (
    loadError
  ) {
    console.error(
      "Staff patient database load failed:",
      loadError
    );
  }

  const patientRows =
    (
      patientResult.data as
        DoctorPatientRow[] |
        null
    ) ??
    [];

  const appointmentRows =
    (
      appointmentResult.data as
        AppointmentRow[] |
        null
    ) ??
    [];

  const doctorRows =
    (
      doctorResult.data as unknown as
        DoctorRow[] |
        null
    ) ??
    [];

  const doctorNames =
    new Map(
      doctorRows.map(
        (
          doctor
        ) => [
          doctor.id,
          doctorName(
            doctor
          ),
        ]
      )
    );

  const now =
    Date.now();

  const patients:
    StaffPatientDatabaseRow[] =
    patientRows.map(
      (
        patient
      ) => {
        const matching =
          appointmentRows
            .filter(
              (
                appointment
              ) =>
                appointmentMatchesPatient(
                  appointment,
                  patient
                )
            )
            .sort(
              (
                firstAppointment,
                secondAppointment
              ) =>
                appointmentTimestamp(
                  secondAppointment
                ) -
                appointmentTimestamp(
                  firstAppointment
                )
            );

        const history:
          StaffPatientHistoryItem[] =
          matching.map(
            (
              appointment
            ) => ({
              id:
                appointment.id,
              date:
                appointment
                  .scheduled_date ??
                appointment
                  .requested_date,
              time:
                appointment
                  .scheduled_time ??
                appointment
                  .requested_time,
              status:
                appointment.status,
            })
          );

        const previous =
          matching.find(
            (
              appointment
            ) =>
              appointmentTimestamp(
                appointment
              ) <=
              now
          ) ??
          null;

        const next =
          [...matching]
            .filter(
              (
                appointment
              ) =>
                [
                  "pending",
                  "confirmed",
                  "rescheduled",
                ].includes(
                  appointment.status
                ) &&
                appointmentTimestamp(
                  appointment
                ) >=
                  now
            )
            .sort(
              (
                firstAppointment,
                secondAppointment
              ) =>
                appointmentTimestamp(
                  firstAppointment
                ) -
                appointmentTimestamp(
                  secondAppointment
                )
            )[0] ??
          null;

        const medicalAppointment =
          patient.patient_profile_id
            ? matching.find(
                (
                  appointment
                ) =>
                  appointment.patient_profile_id ===
                    patient.patient_profile_id &&
                  [
                    "confirmed",
                    "rescheduled",
                    "completed",
                  ].includes(
                    appointment.status
                  )
              ) ??
              null
            : null;

        return {
          id:
            patient.id,
          doctorId:
            patient.doctor_id,
          doctorName:
            doctorNames.get(
              patient.doctor_id
            ) ??
            "Doctor",
          displayName:
            patient.display_name,
          email:
            patient.email,
          phone:
            patient.phone,
          patientProfileId:
            patient.patient_profile_id,
          addressLine1:
            patient.address_line_1,
          addressLine2:
            patient.address_line_2,
          city:
            patient.city,
          county:
            patient.county,
          postalCode:
            patient.postal_code,
          country:
            patient.country,
          lastAppointment:
            previous
              ? {
                  date:
                    previous
                      .scheduled_date ??
                    previous
                      .requested_date,
                  time:
                    previous
                      .scheduled_time ??
                    previous
                      .requested_time,
                }
              : null,
          nextAppointment:
            next
              ? {
                  date:
                    next
                      .scheduled_date ??
                    next
                      .requested_date,
                  time:
                    next
                      .scheduled_time ??
                    next
                      .requested_time,
                }
              : null,
          medicalAppointmentId:
            medicalAppointment
              ?.id ??
            null,
          history,
        };
      }
    );

  const staffName =
    [
      profile.first_name,
      profile.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    user.email ||
    copy.role;

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={
        messagesByLocale[
          locale
        ]
      }
    >
      <main className="min-h-screen bg-[#F0EEE9] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div>
              <Link
                href={`/${locale}`}
                className="text-2xl font-bold text-gray-900"
              >
                RomDoc
              </Link>

              <p className="mt-1 text-sm text-gray-600">
                {staffName}
              </p>

              <span className="mt-2 inline-flex rounded-full bg-[#F0EEE9] px-3 py-1 text-xs font-semibold text-[#9A4F35]">
                {copy.role}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/staff-dashboard"
                className="romdoc-button romdoc-button-secondary romdoc-button-sm"
              >
                {copy.appointments}
              </Link>

              <Link
                href={`/${locale}`}
                className="romdoc-button romdoc-button-secondary romdoc-button-sm"
              >
                {copy.home}
              </Link>

              <StaffLogoutButton />
            </div>
          </header>

          <StaffPatientsTable
            patients={
              patients
            }
            loadError={
              Boolean(
                loadError
              )
            }
          />
        </div>
      </main>
    </NextIntlClientProvider>
  );
}
