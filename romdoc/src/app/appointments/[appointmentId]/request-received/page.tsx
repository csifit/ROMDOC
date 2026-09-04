import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import AppLocaleCookieSync from "@/components/i18n/app-locale-cookie-sync";
import PublicFooter from "@/components/public/public-footer";
import AppointmentStatusBadge from "@/components/ui/appointment-status-badge";
import TelehealthLaunchButton from "@/components/telehealth/telehealth-launch-button";
import TelehealthPaymentResumeButton from "@/components/telehealth/telehealth-payment-resume-button";
import {
  type AppointmentStatus,
} from "@/lib/appointments/appointment-status";
import {
  type AppLocale,
  normalizeAppLocale,
  selectTranslation,
} from "@/lib/i18n/app-locale";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";
import {
  getPublicTelehealthUrl,
  isJoinableTelehealthPaymentStatus,
} from "@/lib/telehealth/constants";

type DoctorRelation = {
  slug: string;
  public_name: string | null;
};

type ClinicTranslation = {
  locale: string;
  name: string;
};

type ClinicRelation = {
  formatted_address:
    | string
    | null;
  street_address:
    | string
    | null;
  clinic_translations:
    | ClinicTranslation[]
    | null;
};

type AppointmentRecord = {
  id: string;
  patient_profile_id:
    | string
    | null;
  patient_email: string;
  patient_name: string;
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
  consultation_mode: string;
  telehealth_public_reference: string | null;
  telehealth_payments:
    | { status: string }
    | Array<{ status: string }>
    | null;
  notes:
    | string
    | null;
  reschedule_reason:
    | string
    | null;
  doctors:
    | DoctorRelation
    | DoctorRelation[]
    | null;
  clinics:
    | ClinicRelation
    | ClinicRelation[]
    | null;
};

type PageProps = {
  params: Promise<{
    appointmentId: string;
  }>;
  searchParams: Promise<{
    emailSent?: string;
    locale?: string;
    payment?: string;
  }>;
};

type PageCopy = {
  brandLine: string;
  title: string;
  description: string;
  patientName: string;
  doctor: string;
  clinic: string;
  address: string;
  requested: string;
  scheduled: string;
  phone: string;
  notes: string;
  rescheduleReason: string;
  calendarTitle: string;
  calendarDescription: string;
  downloadCalendar: string;
  addGoogleCalendar: string;
  doctorProfile: string;
  patientDashboard: string;
  handoffTitle: string;
  handoffDescription: string;
  handoffHint: string;
  signInPatient: string;
  backHome: string;
};

const COPY:
  Record<
    AppLocale,
    PageCopy
  > = {
    ro: {
      brandLine:
        "Detalii programare",
      title:
        "Programarea ta RomDoc",
      description:
        "Verifică detaliile cererii și starea curentă a programării.",
      patientName:
        "Pacient",
      doctor:
        "Medic",
      clinic:
        "Clinică",
      address:
        "Adresă",
      requested:
        "Data solicitată",
      scheduled:
        "Data confirmată",
      phone:
        "Telefon",
      notes:
        "Observații",
      rescheduleReason:
        "Motivul reprogramării",
      calendarTitle:
        "Adaugă programarea în calendar",
      calendarDescription:
        "Calendarul este disponibil după confirmarea sau reprogramarea consultației.",
      downloadCalendar:
        "Descarcă fișierul .ics",
      addGoogleCalendar:
        "Adaugă în Google Calendar",
      doctorProfile:
        "Vezi profilul medicului",
      patientDashboard:
        "Deschide contul de pacient",
      handoffTitle:
        "Autentifică-te cu contul pacientului",
      handoffDescription:
        "Această programare aparține contului de pacient care a făcut solicitarea.",
      handoffHint:
        "Dacă ești autentificat ca medic sau personal, continuă la pagina de autentificare și introdu datele contului pacientului.",
      signInPatient:
        "Continuă cu contul pacientului",
      backHome:
        "Înapoi la RomDoc",
    },
    en: {
      brandLine:
        "Appointment details",
      title:
        "Your RomDoc appointment",
      description:
        "Review the request details and the current appointment status.",
      patientName:
        "Patient",
      doctor:
        "Doctor",
      clinic:
        "Clinic",
      address:
        "Address",
      requested:
        "Requested date",
      scheduled:
        "Confirmed date",
      phone:
        "Phone",
      notes:
        "Notes",
      rescheduleReason:
        "Rescheduling reason",
      calendarTitle:
        "Add the appointment to your calendar",
      calendarDescription:
        "Calendar options become available after the appointment is confirmed or rescheduled.",
      downloadCalendar:
        "Download .ics file",
      addGoogleCalendar:
        "Add to Google Calendar",
      doctorProfile:
        "View Doctor profile",
      patientDashboard:
        "Open patient account",
      handoffTitle:
        "Sign in with the patient account",
      handoffDescription:
        "This appointment belongs to the patient account that submitted the request.",
      handoffHint:
        "When you are currently signed in as a Doctor or staff member, continue to the login page and enter the patient account credentials.",
      signInPatient:
        "Continue with patient account",
      backHome:
        "Back to RomDoc",
    },
    de: {
      brandLine:
        "Termindetails",
      title:
        "Dein RomDoc-Termin",
      description:
        "Prüfe die Terminanfrage und den aktuellen Status.",
      patientName:
        "Patient",
      doctor:
        "Arzt",
      clinic:
        "Klinik",
      address:
        "Adresse",
      requested:
        "Gewünschter Termin",
      scheduled:
        "Bestätigter Termin",
      phone:
        "Telefon",
      notes:
        "Hinweise",
      rescheduleReason:
        "Grund der Verschiebung",
      calendarTitle:
        "Termin zum Kalender hinzufügen",
      calendarDescription:
        "Die Kalenderoptionen sind nach der Bestätigung oder Verschiebung verfügbar.",
      downloadCalendar:
        ".ics-Datei herunterladen",
      addGoogleCalendar:
        "Zu Google Kalender",
      doctorProfile:
        "Arztprofil ansehen",
      patientDashboard:
        "Patientenkonto öffnen",
      handoffTitle:
        "Mit dem Patientenkonto anmelden",
      handoffDescription:
        "Dieser Termin gehört zu dem Patientenkonto, das die Anfrage gesendet hat.",
      handoffHint:
        "Falls du derzeit als Arzt oder Mitarbeiter angemeldet bist, öffne die Anmeldung und verwende die Zugangsdaten des Patientenkontos.",
      signInPatient:
        "Mit Patientenkonto fortfahren",
      backHome:
        "Zurück zu RomDoc",
    },
  };

const INTL_LOCALE:
  Record<
    AppLocale,
    string
  > = {
    ro: "ro-RO",
    en: "en-GB",
    de: "de-DE",
  };

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

function formatNameFromSlug(
  slug: string
) {
  return decodeURIComponent(slug)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(
  value: string,
  locale:
    AppLocale
) {
  const [
    year,
    month,
    day,
  ] =
    value
      .split("-")
      .map(Number);

  return new Intl.DateTimeFormat(
    INTL_LOCALE[
      locale
    ],
    {
      weekday:
        "long",
      day:
        "2-digit",
      month:
        "long",
      year:
        "numeric",
      timeZone:
        "UTC",
    }
  ).format(
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    )
  );
}

function formatTime(
  value:
    | string
    | null
) {
  return value
    ? value.slice(
        0,
        5
      )
    : "—";
}

function getReturnPath(
  appointmentId: string,
  locale:
    AppLocale,
  emailSent:
    | string
    | undefined
) {
  const parameters =
    new URLSearchParams({
      locale,
    });

  if (emailSent) {
    parameters.set(
      "emailSent",
      emailSent
    );
  }

  return `/appointments/${encodeURIComponent(
    appointmentId
  )}/request-received?${parameters.toString()}`;
}

function getDoctorProfileHref(
  locale:
    AppLocale,
  slug: string
) {
  const encodedSlug =
    encodeURIComponent(
      slug
    );

  return locale ===
    "de"
    ? `/de/arzt/${encodedSlug}`
    : `/${locale}/doctor/${encodedSlug}`;
}

function getGoogleCalendarUrl({
  locale,
  doctorName,
  clinicName,
  address,
  date,
  time,
  durationMinutes,
  videoUrl,
}: {
  locale: AppLocale;
  doctorName: string;
  clinicName: string;
  address:
    | string
    | null;
  date: string;
  time: string;
  durationMinutes: number;
  videoUrl?: string | null;
}) {
  const [
    year,
    month,
    day,
  ] =
    date
      .split("-")
      .map(Number);

  const [
    hours,
    minutes,
  ] =
    time
      .slice(0, 5)
      .split(":")
      .map(Number);

  const start =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        hours,
        minutes
      )
    );

  const end =
    new Date(
      start.getTime() +
        durationMinutes *
          60 *
          1000
    );

  function compact(
    value: Date
  ) {
    return value
      .toISOString()
      .slice(0, 19)
      .replaceAll("-", "")
      .replaceAll(":", "");
  }

  const title =
    locale === "de"
      ? `Termin - ${doctorName}`
      : locale === "en"
        ? `Appointment - ${doctorName}`
        : `Programare - ${doctorName}`;

  const details = videoUrl
    ? locale === "de"
      ? `RomDoc Videosprechstunde. Die Sprechstunde wird weder aufgezeichnet noch gespeichert. ${videoUrl}`
      : locale === "en"
        ? `RomDoc video consultation. The consultation is not recorded or stored. ${videoUrl}`
        : `Consultație video RomDoc. Consultația nu este înregistrată sau stocată. ${videoUrl}`
    : locale === "de"
      ? "Über RomDoc bestätigter Arzttermin."
      : locale === "en"
        ? "Medical appointment confirmed through RomDoc."
        : "Programare medicală confirmată prin RomDoc.";

  const query =
    new URLSearchParams({
      action:
        "TEMPLATE",
      text:
        title,
      dates:
        `${compact(
          start
        )}/${compact(
          end
        )}`,
      details,
      location:
        videoUrl
          ? (locale === "de" ? "RomDoc Videosprechstunde" : locale === "en" ? "RomDoc video consultation" : "Consultație video RomDoc")
          : [clinicName, address].filter(Boolean).join(", "),
      ctz:
        "Europe/Bucharest",
    });

  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

function isAppointmentStatus(
  value: string
): value is AppointmentStatus {
  return [
    "pending",
    "confirmed",
    "rescheduled",
    "completed",
    "cancelled",
    "no_show",
  ].includes(value);
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-1 whitespace-pre-wrap text-gray-900">
        {value}
      </p>
    </div>
  );
}

function PatientAccountHandoff({
  appointmentId,
  locale,
  emailSent,
}: {
  appointmentId: string;
  locale: AppLocale;
  emailSent:
    | string
    | undefined;
}) {
  const copy =
    COPY[locale];

  const returnPath =
    getReturnPath(
      appointmentId,
      locale,
      emailSent
    );

  const loginParameters =
    new URLSearchParams({
      locale,
      next:
        returnPath,
    });

  return (
    <div className="flex min-h-screen flex-col bg-[#F0EEE9]">
      <AppLocaleCookieSync
        locale={locale}
      />

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <section className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
            RomDoc
          </p>

          <h1 className="mt-3 text-3xl font-bold text-gray-900">
            {copy.handoffTitle}
          </h1>

          <p className="mt-4 leading-7 text-gray-700">
            {copy.handoffDescription}
          </p>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            {copy.handoffHint}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/login?${loginParameters.toString()}`}
              className="romdoc-focus-ring inline-flex min-h-11 items-center justify-center rounded-xl bg-[#036661] px-5 py-3 font-semibold text-white hover:bg-[#02534f]"
            >
              {copy.signInPatient}
            </Link>

            <Link
              href={`/${locale}`}
              className="romdoc-focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-800 hover:bg-gray-50"
            >
              {copy.backHome}
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter
        locale={locale}
      />
    </div>
  );
}

export default async function
AppointmentRequestReceivedPage({
  params,
  searchParams,
}: PageProps) {
  const {
    appointmentId,
  } =
    await params;

  const query =
    await searchParams;

  const locale =
    normalizeAppLocale(
      query.locale
    );

  const copy =
    COPY[locale];

  const admin =
    createAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        "appointments"
      )
      .select(`
        id,
        patient_profile_id,
        patient_email,
        patient_name,
        patient_phone,
        requested_date,
        requested_time,
        scheduled_date,
        scheduled_time,
        duration_minutes,
        status,
        consultation_mode,
        telehealth_public_reference,
        telehealth_payments (
          status
        ),
        notes,
        reschedule_reason,
        doctors (
          slug,
          public_name
        ),
        clinics (
          formatted_address,
          street_address,
          clinic_translations (
            locale,
            name
          )
        )
      `)
      .eq(
        "id",
        appointmentId
      )
      .maybeSingle();

  if (
    error ||
    !data
  ) {
    if (error) {
      console.error(
        "Appointment request-received lookup failed:",
        error
      );
    }

    notFound();
  }

  const appointment =
    data as unknown as
      AppointmentRecord;

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth
      .getUser();

  const authenticatedEmail =
    user?.email
      ?.trim()
      .toLowerCase() ??
    "";

  const ownsAppointment =
    Boolean(user) &&
    (
      appointment
        .patient_profile_id ===
        user?.id ||
      (
        Boolean(
          authenticatedEmail
        ) &&
        appointment
          .patient_email
          .trim()
          .toLowerCase() ===
          authenticatedEmail
      )
    );

  if (!ownsAppointment) {
    return (
      <PatientAccountHandoff
        appointmentId={
          appointmentId
        }
        locale={locale}
        emailSent={
          query.emailSent
        }
      />
    );
  }

  if (
    user &&
    !user.email_confirmed_at
  ) {
    const returnPath =
      getReturnPath(
        appointmentId,
        locale,
        query.emailSent
      );

    const parameters =
      new URLSearchParams({
        locale,
        type:
          "patient",
        next:
          returnPath,
      });

    if (user.email) {
      parameters.set(
        "email",
        user.email
      );
    }

    redirect(
      `/check-email?${parameters.toString()}`
    );
  }

  const doctor =
    first(
      appointment.doctors
    );

  const clinic =
    first(
      appointment.clinics
    );

  const displayDoctorName =
    doctor
      ? doctor.public_name?.trim() ||
        formatNameFromSlug(doctor.slug)
      : locale === "de"
        ? "RomDoc-Arzt"
        : locale === "en"
          ? "RomDoc Doctor"
          : "Medic RomDoc";

  const displayClinicName =
    selectTranslation(
      clinic
        ?.clinic_translations,
      locale
    )?.name ??
    (
      locale === "de"
        ? "Klinik"
        : locale === "en"
          ? "Clinic"
          : "Clinică"
    );

  const address =
    clinic
      ?.formatted_address ??
    clinic
      ?.street_address ??
    null;

  const effectiveDate =
    appointment
      .scheduled_date ??
    appointment
      .requested_date;

  const effectiveTime =
    appointment
      .scheduled_time ??
    appointment
      .requested_time;

  const calendarAvailable =
    [
      "confirmed",
      "rescheduled",
    ].includes(
      appointment.status
    ) &&
    Boolean(
      effectiveDate &&
      effectiveTime
    );

  const calendarDownloadUrl =
    `/api/appointments/${encodeURIComponent(
      appointment.id
    )}/calendar?locale=${locale}`;

  const hasJoinableVideoPayment =
    isJoinableTelehealthPaymentStatus(
      first(
        appointment.telehealth_payments
      )?.status
    );

  const googleCalendarUrl =
    calendarAvailable &&
    effectiveTime
      ? getGoogleCalendarUrl({
          locale,
          doctorName:
            displayDoctorName,
          clinicName:
            displayClinicName,
          address,
          date:
            effectiveDate,
          time:
            effectiveTime,
          durationMinutes:
            Number(
              appointment
                .duration_minutes ??
              30
            ),
          videoUrl: hasJoinableVideoPayment && appointment.consultation_mode === "video" && appointment.telehealth_public_reference
            ? getPublicTelehealthUrl(appointment.telehealth_public_reference, locale)
            : null,
        })
      : null;

  const status =
    isAppointmentStatus(
      appointment.status
    )
      ? appointment.status
      : "pending";

  return (
    <div className="flex min-h-screen flex-col bg-[#F0EEE9]">
      <AppLocaleCookieSync
        locale={locale}
      />

      <main className="flex-1 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <header className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {copy.brandLine}
            </p>

            <h1 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
              {copy.title}
            </h1>

            <p className="mt-3 leading-7 text-gray-600">
              {copy.description}
            </p>
          </header>

          <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-5">
              <div>
                <p className="text-sm text-gray-500">
                  RomDoc
                </p>

                <h2 className="mt-1 text-2xl font-bold text-gray-900">
                  {displayDoctorName}
                </h2>
              </div>

              <AppointmentStatusBadge
                status={status}
                locale={locale}
              />
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <Detail
                label={
                  copy.patientName
                }
                value={
                  appointment
                    .patient_name
                }
              />

              <Detail
                label={
                  copy.doctor
                }
                value={
                  displayDoctorName
                }
              />

              <Detail
                label={
                  copy.clinic
                }
                value={
                  displayClinicName
                }
              />

              {address && (
                <Detail
                  label={
                    copy.address
                  }
                  value={
                    address
                  }
                />
              )}

              <Detail
                label={
                  copy.requested
                }
                value={`${formatDate(
                  appointment
                    .requested_date,
                  locale
                )}, ${formatTime(
                  appointment
                    .requested_time
                )}`}
              />

              {appointment
                .scheduled_date && (
                <Detail
                  label={
                    copy.scheduled
                  }
                  value={`${formatDate(
                    appointment
                      .scheduled_date,
                    locale
                  )}, ${formatTime(
                    appointment
                      .scheduled_time
                  )}`}
                />
              )}

              <Detail
                label={
                  copy.phone
                }
                value={
                  appointment
                    .patient_phone
                }
              />
            </div>

            {appointment.notes && (
              <div className="mt-6 rounded-xl bg-gray-50 p-4">
                <Detail
                  label={
                    copy.notes
                  }
                  value={
                    appointment.notes
                  }
                />
              </div>
            )}

            {appointment
              .reschedule_reason && (
              <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <Detail
                  label={
                    copy.rescheduleReason
                  }
                  value={
                    appointment
                      .reschedule_reason
                  }
                />
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              {hasJoinableVideoPayment && appointment.consultation_mode === "video" && appointment.telehealth_public_reference && ["confirmed", "rescheduled", "completed"].includes(appointment.status) && (
                <TelehealthLaunchButton
                  reference={appointment.telehealth_public_reference}
                  locale={locale}
                />
              )}
              {doctor && (
                <Link
                  href={
                    getDoctorProfileHref(
                      locale,
                      doctor.slug
                    )
                  }
                  className="romdoc-focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-800 hover:bg-gray-50"
                >
                  {copy.doctorProfile}
                </Link>
              )}

              <Link
                href={`/patient-dashboard?locale=${locale}`}
                className="romdoc-focus-ring inline-flex min-h-11 items-center justify-center rounded-xl bg-[#036661] px-5 py-3 font-semibold text-white hover:bg-[#02534f]"
              >
                {copy.patientDashboard}
              </Link>
            </div>
          </section>

          {appointment.consultation_mode === "video" && appointment.status === "pending" && (
            <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-950">
              {locale === "ro" ? "Plata este în curs de confirmare. Reîncarcă pagina în câteva momente." : locale === "de" ? "Die Zahlung wird bestätigt. Laden Sie die Seite in wenigen Augenblicken erneut." : "Payment confirmation is in progress. Refresh this page in a few moments."}
              <TelehealthPaymentResumeButton appointmentId={appointment.id} />
            </section>
          )}

          <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold text-gray-900">
              {copy.calendarTitle}
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              {copy.calendarDescription}
            </p>

            {calendarAvailable ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={
                    calendarDownloadUrl
                  }
                  className="romdoc-focus-ring inline-flex min-h-11 items-center justify-center rounded-xl bg-[#036661] px-5 py-3 font-semibold text-white hover:bg-[#02534f]"
                >
                  {copy.downloadCalendar}
                </a>

                {googleCalendarUrl && (
                  <a
                    href={
                      googleCalendarUrl
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="romdoc-focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border border-[#036661] bg-white px-5 py-3 font-semibold text-[#036661] hover:bg-[#036661]/5"
                  >
                    {copy.addGoogleCalendar}
                  </a>
                )}
              </div>
            ) : (
              <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {copy.calendarDescription}
              </p>
            )}
          </section>
        </div>
      </main>

      <PublicFooter
        locale={locale}
      />
    </div>
  );
}
