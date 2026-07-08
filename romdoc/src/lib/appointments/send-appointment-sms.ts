import { createAdminClient } from "@/lib/supabase/admin";

export type AppointmentSmsEvent =
  | "confirmed"
  | "reminder_24_hours";

type SmsSendResult = {
  sent: boolean;
  skipped: boolean;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

type SendAppointmentSmsInput = {
  appointmentId: string;
  event: AppointmentSmsEvent;
  triggeredByProfileId: string | null;
};

type SmsSettings = {
  sms_enabled: boolean;
  confirmation_sms_enabled: boolean;
  reminder_24h_sms_enabled: boolean;
};

type AppointmentRow = {
  id: string;
  doctor_id: string;
  patient_name: string;
  patient_phone: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  requested_date: string | null;
  requested_time: string | null;
  doctors:
    | {
        slug: string;
        profiles:
          | {
              first_name: string | null;
              last_name: string | null;
            }
          | {
              first_name: string | null;
              last_name: string | null;
            }[]
          | null;
      }
    | {
        slug: string;
        profiles:
          | {
              first_name: string | null;
              last_name: string | null;
            }
          | {
              first_name: string | null;
              last_name: string | null;
            }[]
          | null;
      }[]
    | null;
  clinics:
    | {
        slug: string;
        clinic_translations:
          | {
              locale: string;
              name: string;
            }[]
          | null;
      }
    | {
        slug: string;
        clinic_translations:
          | {
              locale: string;
              name: string;
            }[]
          | null;
      }[]
    | null;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function normalizePhoneToE164(phone: string) {
  const compact = phone.replace(/[\s().-]/g, "");

  if (/^\+[1-9]\d{7,14}$/.test(compact)) {
    return compact;
  }

  if (/^00[1-9]\d{7,14}$/.test(compact)) {
    return `+${compact.slice(2)}`;
  }

  if (/^0\d{9}$/.test(compact)) {
    return `+40${compact.slice(1)}`;
  }

  if (/^7\d{8}$/.test(compact)) {
    return `+40${compact}`;
  }

  return null;
}

function formatNameFromSlug(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getDoctorName(appointment: AppointmentRow) {
  const doctor = firstRelation(appointment.doctors);
  const profile = firstRelation(doctor?.profiles ?? null);

  const profileName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return profileName || (doctor ? formatNameFromSlug(doctor.slug) : "Medic RomDoc");
}

function getClinicName(appointment: AppointmentRow) {
  const clinic = firstRelation(appointment.clinics);

  if (!clinic) {
    return "clinica selectata";
  }

  return (
    clinic.clinic_translations?.find((translation) => translation.locale === "ro")?.name ??
    clinic.clinic_translations?.[0]?.name ??
    formatNameFromSlug(clinic.slug)
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Bucharest",
  }).format(new Date(`${date}T12:00:00`));
}

function formatTime(time: string) {
  return time.slice(0, 5);
}

function buildMessage(
  event: AppointmentSmsEvent,
  appointment: AppointmentRow
) {
  const doctorName = getDoctorName(appointment);
  const clinicName = getClinicName(appointment);
  const date = appointment.scheduled_date ?? appointment.requested_date;
  const time = appointment.scheduled_time ?? appointment.requested_time;

  if (!date || !time) {
    return null;
  }

  if (event === "reminder_24_hours") {
    return `RomDoc: Reamintire - ai programare maine, ${formatDate(date)}, ora ${formatTime(time)}, la ${doctorName}, ${clinicName}. Detalii in contul tau RomDoc.`;
  }

  return `RomDoc: Programarea ta la ${doctorName}, ${clinicName}, a fost confirmata pentru ${formatDate(date)}, ora ${formatTime(time)}. Detalii in contul tau RomDoc.`;
}

async function logSmsDelivery({
  appointmentId,
  doctorId,
  triggeredByProfileId,
  event,
  recipient,
  result,
}: {
  appointmentId: string;
  doctorId: string;
  triggeredByProfileId: string | null;
  event: AppointmentSmsEvent;
  recipient: string;
  result: SmsSendResult;
}) {
  const admin = createAdminClient();

  const status = result.sent
    ? "sent"
    : result.skipped
      ? "skipped"
      : "failed";

  const { error } = await admin
    .from("sms_delivery_logs")
    .insert({
      appointment_id: appointmentId,
      doctor_id: doctorId,
      triggered_by_profile_id: triggeredByProfileId,
      event,
      recipient,
      status,
      provider: "smslink",
      provider_message_id: result.providerMessageId,
      error_code: result.errorCode,
      error_message: result.errorMessage?.slice(0, 2000) ?? null,
    });

  if (error) {
    console.error("SMS delivery log failed:", error);
  }
}

function parseSmsLinkResponse(responseText: string): SmsSendResult {
  const trimmedResponse = responseText.trim();
  const responseParts = trimmedResponse.split(";");
  const category = responseParts[0];
  const responseId = responseParts[1] ?? null;
  const responseDescription = responseParts[2] ?? trimmedResponse;
  const responseVariables = responseParts[3] ?? "";

  if (category === "MESSAGE" && responseId === "1") {
    const [messageId] = responseVariables
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    return {
      sent: true,
      skipped: false,
      providerMessageId: messageId ?? null,
      errorCode: null,
      errorMessage: null,
    };
  }

  if (category === "ERROR") {
    return {
      sent: false,
      skipped: false,
      providerMessageId: null,
      errorCode: responseId ? `SMSLINK_ERROR_${responseId}` : "SMSLINK_ERROR",
      errorMessage: responseDescription || "SMSLink returned an error response.",
    };
  }

  return {
    sent: false,
    skipped: false,
    providerMessageId: null,
    errorCode: "UNKNOWN_SMSLINK_RESPONSE",
    errorMessage: trimmedResponse || "SMSLink returned an empty or unrecognized response.",
  };
}

async function sendSmsLinkSms(to: string, body: string): Promise<SmsSendResult> {
  const connectionId = process.env.SMSLINK_CONNECTION_ID;
  const password = process.env.SMSLINK_PASSWORD;

  if (!connectionId || !password) {
    return {
      sent: false,
      skipped: true,
      providerMessageId: null,
      errorCode: "MISSING_SMSLINK_CONFIGURATION",
      errorMessage: "SMSLINK_CONNECTION_ID or SMSLINK_PASSWORD is missing.",
    };
  }

  const url = new URL(
    "https://secure.smslink.ro/sms/gateway/communicate/index.php"
  );

  url.searchParams.set("connection_id", connectionId);
  url.searchParams.set("password", password);
  url.searchParams.set("to", to);
  url.searchParams.set("message", body);

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  const responseText = await response.text().catch(() => "");

  if (!response.ok) {
    return {
      sent: false,
      skipped: false,
      providerMessageId: null,
      errorCode: `HTTP_${response.status}`,
      errorMessage:
        responseText.trim() || "SMSLink HTTP request failed.",
    };
  }

  return parseSmsLinkResponse(responseText);
}

export async function sendAppointmentSms({
  appointmentId,
  event,
  triggeredByProfileId,
}: SendAppointmentSmsInput): Promise<SmsSendResult> {
  const admin = createAdminClient();

  const { data: settingsData, error: settingsError } = await admin
    .from("sms_platform_settings")
    .select("sms_enabled, confirmation_sms_enabled, reminder_24h_sms_enabled")
    .eq("id", 1)
    .maybeSingle();

  if (settingsError) {
    console.error("SMS settings lookup failed:", settingsError);
    return {
      sent: false,
      skipped: true,
      providerMessageId: null,
      errorCode: "SMS_SETTINGS_LOOKUP_FAILED",
      errorMessage: settingsError.message,
    };
  }

  const settings = settingsData as SmsSettings | null;

  if (!settings?.sms_enabled) {
    return {
      sent: false,
      skipped: true,
      providerMessageId: null,
      errorCode: "SMS_DISABLED",
      errorMessage: "SMS master switch is off.",
    };
  }

  if (event === "confirmed" && !settings.confirmation_sms_enabled) {
    return {
      sent: false,
      skipped: true,
      providerMessageId: null,
      errorCode: "CONFIRMATION_SMS_DISABLED",
      errorMessage: "Confirmation SMS switch is off.",
    };
  }

  if (event === "reminder_24_hours" && !settings.reminder_24h_sms_enabled) {
    return {
      sent: false,
      skipped: true,
      providerMessageId: null,
      errorCode: "REMINDER_24H_SMS_DISABLED",
      errorMessage: "24h reminder SMS switch is off.",
    };
  }

  const { data: existingSent } = await admin
    .from("sms_delivery_logs")
    .select("id")
    .eq("appointment_id", appointmentId)
    .eq("event", event)
    .eq("status", "sent")
    .limit(1)
    .maybeSingle();

  if (existingSent) {
    return {
      sent: false,
      skipped: true,
      providerMessageId: null,
      errorCode: "SMS_ALREADY_SENT",
      errorMessage: "This SMS event was already sent for the appointment.",
    };
  }

  const { data: appointmentData, error: appointmentError } = await admin
    .from("appointments")
    .select(`
      id,
      doctor_id,
      patient_name,
      patient_phone,
      scheduled_date,
      scheduled_time,
      requested_date,
      requested_time,
      doctors (
        slug,
        profiles (
          first_name,
          last_name
        )
      ),
      clinics (
        slug,
        clinic_translations (
          locale,
          name
        )
      )
    `)
    .eq("id", appointmentId)
    .maybeSingle();

  if (appointmentError || !appointmentData) {
    return {
      sent: false,
      skipped: true,
      providerMessageId: null,
      errorCode: "APPOINTMENT_NOT_FOUND",
      errorMessage: appointmentError?.message ?? "Appointment was not found.",
    };
  }

  const appointment = appointmentData as AppointmentRow;
  const normalizedPhone = normalizePhoneToE164(appointment.patient_phone ?? "");

  if (!normalizedPhone) {
    const result = {
      sent: false,
      skipped: true,
      providerMessageId: null,
      errorCode: "INVALID_PATIENT_PHONE",
      errorMessage: "Patient phone number cannot be normalized to E.164.",
    } satisfies SmsSendResult;

    await logSmsDelivery({
      appointmentId,
      doctorId: appointment.doctor_id,
      triggeredByProfileId,
      event,
      recipient: appointment.patient_phone || "missing",
      result,
    });

    return result;
  }

  const message = buildMessage(event, appointment);

  if (!message) {
    const result = {
      sent: false,
      skipped: true,
      providerMessageId: null,
      errorCode: "MISSING_APPOINTMENT_SLOT",
      errorMessage: "Appointment date or time is missing.",
    } satisfies SmsSendResult;

    await logSmsDelivery({
      appointmentId,
      doctorId: appointment.doctor_id,
      triggeredByProfileId,
      event,
      recipient: normalizedPhone,
      result,
    });

    return result;
  }

  const result = await sendSmsLinkSms(normalizedPhone, message);

  await logSmsDelivery({
    appointmentId,
    doctorId: appointment.doctor_id,
    triggeredByProfileId,
    event,
    recipient: normalizedPhone,
    result,
  });

  return result;
}
