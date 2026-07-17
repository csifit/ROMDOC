import { NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type DoctorRelation = {
  slug: string;
};

type ClinicTranslation = {
  locale: string;
  name: string;
};

type ClinicRelation = {
  formatted_address: string | null;
  street_address: string | null;
  clinic_translations: ClinicTranslation[] | null;
};

type AppointmentRecord = {
  id: string;
  patient_profile_id: string | null;
  patient_email: string;
  requested_date: string;
  requested_time: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  duration_minutes: number | null;
  status: string;
  doctors: DoctorRelation | DoctorRelation[] | null;
  clinics: ClinicRelation | ClinicRelation[] | null;
};

type RouteContext = {
  params: Promise<{
    appointmentId: string;
  }>;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function doctorName(slug: string) {
  return decodeURIComponent(slug)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function clinicName(clinic: ClinicRelation | null) {
  return (
    clinic?.clinic_translations?.find((item) => item.locale === "ro")?.name ??
    clinic?.clinic_translations?.[0]?.name ??
    "Clinică medicală"
  );
}

function escapeIcs(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function localDateTime(date: string, time: string) {
  return `${date.replaceAll("-", "")}T${time
    .slice(0, 5)
    .replace(":", "")}00`;
}

function addMinutes(date: string, time: string, minutes: number) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.slice(0, 5).split(":").map(Number);

  const result = new Date(
    Date.UTC(year, month - 1, day, hour, minute + minutes)
  );

  return (
    `${result.toISOString().slice(0, 10).replaceAll("-", "")}T` +
    result.toISOString().slice(11, 19).replaceAll(":", "")
  );
}

function utcStamp(date: Date) {
  return date
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/, "Z");
}

function textResponse(message: string, status: number) {
  return new Response(message, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
): Promise<Response> {
  const { appointmentId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return textResponse("Autentificare necesară.", 401);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("appointments")
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
    .eq("id", appointmentId)
    .maybeSingle();

  if (error || !data) {
    return textResponse("Programarea nu a fost găsită.", 404);
  }

  const appointment = data as unknown as AppointmentRecord;
  const email = user.email?.trim().toLowerCase() ?? "";

  const ownsAppointment =
    appointment.patient_profile_id === user.id ||
    (Boolean(email) &&
      appointment.patient_email.trim().toLowerCase() === email);

  if (!ownsAppointment) {
    return textResponse("Programarea nu a fost găsită.", 404);
  }

  if (!["confirmed", "rescheduled"].includes(appointment.status)) {
    return textResponse(
      "Calendarul este disponibil numai după confirmarea programării.",
      409
    );
  }

  const date = appointment.scheduled_date || appointment.requested_date;
  const time = appointment.scheduled_time || appointment.requested_time;

  if (!time) {
    return textResponse("Ora programării nu este disponibilă.", 409);
  }

  const doctor = first(appointment.doctors);
  const clinic = first(appointment.clinics);

  const name = doctor ? doctorName(doctor.slug) : "Medic RomDoc";
  const displayClinicName = clinicName(clinic);
  const address =
    clinic?.formatted_address || clinic?.street_address || "";
  const duration = Number(appointment.duration_minutes ?? 30);

  const requestUrl = new URL(
    `/appointments/${appointment.id}/request-received`,
    request.nextUrl.origin
  ).toString();

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RomDoc//Appointment Calendar//RO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:RomDoc",
    "X-WR-TIMEZONE:Europe/Bucharest",
    "BEGIN:VEVENT",
    `UID:${appointment.id}@romdoc.fit`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART;TZID=Europe/Bucharest:${localDateTime(date, time)}`,
    `DTEND;TZID=Europe/Bucharest:${addMinutes(date, time, duration)}`,
    `SUMMARY:${escapeIcs(`Programare - ${name}`)}`,
    `DESCRIPTION:${escapeIcs(
      `Programare medicală confirmată prin RomDoc.\n${requestUrl}`
    )}`,
    `LOCATION:${escapeIcs(
      [displayClinicName, address].filter(Boolean).join(", ")
    )}`,
    `URL:${escapeIcs(requestUrl)}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="romdoc-programare-${appointment.id}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
