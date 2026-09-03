import {
  NextRequest,
  NextResponse,
} from "next/server";

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
  isJoinableTelehealthPaymentStatus,
} from "@/lib/telehealth/constants";

type DoctorRelation = {
  slug: string;
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
  doctors:
    | DoctorRelation
    | DoctorRelation[]
    | null;
  clinics:
    | ClinicRelation
    | ClinicRelation[]
    | null;
};

type RouteContext = {
  params: Promise<{
    appointmentId: string;
  }>;
};

type CalendarCopy = {
  authenticationRequired: string;
  notFound: string;
  unavailable: string;
  missingTime: string;
  doctorFallback: string;
  clinicFallback: string;
  summaryPrefix: string;
  description: string;
  filePrefix: string;
};

const COPY:
  Record<
    AppLocale,
    CalendarCopy
  > = {
    ro: {
      authenticationRequired:
        "Autentifică-te cu contul pacientului pentru a descărca programarea.",
      notFound:
        "Programarea nu a fost găsită.",
      unavailable:
        "Calendarul este disponibil numai după confirmarea sau reprogramarea programării.",
      missingTime:
        "Ora programării nu este disponibilă.",
      doctorFallback:
        "Medic RomDoc",
      clinicFallback:
        "Clinică medicală",
      summaryPrefix:
        "Programare",
      description:
        "Programare medicală confirmată prin RomDoc.",
      filePrefix:
        "romdoc-programare",
    },
    en: {
      authenticationRequired:
        "Sign in with the patient account to download the appointment.",
      notFound:
        "The appointment was not found.",
      unavailable:
        "The calendar is available only after the appointment is confirmed or rescheduled.",
      missingTime:
        "The appointment time is unavailable.",
      doctorFallback:
        "RomDoc Doctor",
      clinicFallback:
        "Medical clinic",
      summaryPrefix:
        "Appointment",
      description:
        "Medical appointment confirmed through RomDoc.",
      filePrefix:
        "romdoc-appointment",
    },
    de: {
      authenticationRequired:
        "Melde dich mit dem Patientenkonto an, um den Termin herunterzuladen.",
      notFound:
        "Der Termin wurde nicht gefunden.",
      unavailable:
        "Der Kalender ist erst nach Bestätigung oder Verschiebung des Termins verfügbar.",
      missingTime:
        "Die Uhrzeit des Termins ist nicht verfügbar.",
      doctorFallback:
        "RomDoc-Arzt",
      clinicFallback:
        "Arztpraxis",
      summaryPrefix:
        "Termin",
      description:
        "Über RomDoc bestätigter Arzttermin.",
      filePrefix:
        "romdoc-termin",
    },
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
  return decodeURIComponent(
    slug
  )
    .split("-")
    .filter(Boolean)
    .map(
      (
        part
      ) =>
        part
          .charAt(0)
          .toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function escapeIcs(
  value: string
) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function localDateTime(
  date: string,
  time: string
) {
  return `${date.replaceAll(
    "-",
    ""
  )}T${time
    .slice(0, 5)
    .replace(
      ":",
      ""
    )}00`;
}

function addMinutes(
  date: string,
  time: string,
  minutes: number
) {
  const [
    year,
    month,
    day,
  ] =
    date
      .split("-")
      .map(Number);

  const [
    hour,
    minute,
  ] =
    time
      .slice(0, 5)
      .split(":")
      .map(Number);

  const result =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        hour,
        minute +
          minutes
      )
    );

  return (
    `${result
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "")}T` +
    result
      .toISOString()
      .slice(11, 19)
      .replaceAll(":", "")
  );
}

function utcStamp(
  date: Date
) {
  return date
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(
      /\.\d{3}Z$/,
      "Z"
    );
}

function textResponse(
  message: string,
  status: number
) {
  return new Response(
    message,
    {
      status,
      headers: {
        "Cache-Control":
          "no-store",
        "Content-Type":
          "text/plain; charset=utf-8",
      },
    }
  );
}

function getReturnPath(
  appointmentId: string,
  locale:
    AppLocale
) {
  return `/api/appointments/${encodeURIComponent(
    appointmentId
  )}/calendar?locale=${locale}`;
}

function getLoginRedirect(
  request: NextRequest,
  appointmentId: string,
  locale:
    AppLocale
) {
  const parameters =
    new URLSearchParams({
      locale,
      next:
        getReturnPath(
          appointmentId,
          locale
        ),
    });

  return NextResponse.redirect(
    new URL(
      `/login?${parameters.toString()}`,
      request.nextUrl.origin
    )
  );
}

export async function GET(
  request: NextRequest,
  {
    params,
  }: RouteContext
): Promise<Response> {
  const {
    appointmentId,
  } =
    await params;

  const locale =
    normalizeAppLocale(
      request.nextUrl
        .searchParams
        .get("locale")
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
        doctors (
          slug
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
        "Appointment calendar lookup failed:",
        error
      );
    }

    return textResponse(
      copy.notFound,
      404
    );
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

  if (!user) {
    return getLoginRedirect(
      request,
      appointmentId,
      locale
    );
  }

  const authenticatedEmail =
    user.email
      ?.trim()
      .toLowerCase() ??
    "";

  const ownsAppointment =
    appointment
      .patient_profile_id ===
      user.id ||
    (
      Boolean(
        authenticatedEmail
      ) &&
      appointment
        .patient_email
        .trim()
        .toLowerCase() ===
        authenticatedEmail
    );

  if (!ownsAppointment) {
    return getLoginRedirect(
      request,
      appointmentId,
      locale
    );
  }

  if (
    ![
      "confirmed",
      "rescheduled",
    ].includes(
      appointment.status
    )
  ) {
    return textResponse(
      copy.unavailable,
      409
    );
  }

  const date =
    appointment
      .scheduled_date ??
    appointment
      .requested_date;

  const time =
    appointment
      .scheduled_time ??
    appointment
      .requested_time;

  if (!time) {
    return textResponse(
      copy.missingTime,
      409
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

  const doctorName =
    doctor
      ? formatNameFromSlug(
          doctor.slug
        )
      : copy.doctorFallback;

  const clinicName =
    selectTranslation(
      clinic
        ?.clinic_translations,
      locale
    )?.name ??
    copy.clinicFallback;

  const address =
    clinic
      ?.formatted_address ??
    clinic
      ?.street_address ??
    "";

  const duration =
    Number(
      appointment
        .duration_minutes ??
      30
    );

  const requestUrl =
    new URL(
      `/appointments/${appointment.id}/request-received?locale=${locale}`,
      request.nextUrl.origin
    ).toString();

  const isVideo =
    appointment.consultation_mode === "video" &&
    Boolean(appointment.telehealth_public_reference) &&
    isJoinableTelehealthPaymentStatus(
      first(
        appointment.telehealth_payments
      )?.status
    );
  const eventUrl = isVideo
    ? new URL(`/telehealth/${appointment.telehealth_public_reference}`, request.nextUrl.origin).toString()
    : requestUrl;
  const eventLocation = isVideo
    ? (locale === "ro" ? "Consultație video RomDoc" : locale === "de" ? "RomDoc Videosprechstunde" : "RomDoc video consultation")
    : [clinicName, address].filter(Boolean).join(", ");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RomDoc//Appointment Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:RomDoc",
    "X-WR-TIMEZONE:Europe/Bucharest",
    "BEGIN:VEVENT",
    `UID:${appointment.id}@romdoc.fit`,
    `DTSTAMP:${utcStamp(
      new Date()
    )}`,
    `DTSTART;TZID=Europe/Bucharest:${localDateTime(
      date,
      time
    )}`,
    `DTEND;TZID=Europe/Bucharest:${addMinutes(
      date,
      time,
      duration
    )}`,
    `SUMMARY:${escapeIcs(
      `${copy.summaryPrefix} - ${doctorName}`
    )}`,
    `DESCRIPTION:${escapeIcs(
      `${copy.description}\n${isVideo ? (locale === "ro" ? "Conținutul audio și video nu este înregistrat, transcris sau stocat de RomDoc ori Daily." : locale === "de" ? "Audio und Video werden weder von RomDoc noch von Daily aufgezeichnet, transkribiert oder gespeichert." : "Audio and video are not recorded, transcribed, or stored by RomDoc or Daily.") : ""}\n${eventUrl}`
    )}`,
    `LOCATION:${escapeIcs(
      eventLocation
    )}`,
    `URL:${escapeIcs(
      eventUrl
    )}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  return new Response(
    ics,
    {
      status:
        200,
      headers: {
        "Content-Type":
          "text/calendar; charset=utf-8",
        "Content-Disposition":
          `attachment; filename="${copy.filePrefix}-${appointment.id}.ics"`,
        "Cache-Control":
          "private, no-store",
      },
    }
  );
}
