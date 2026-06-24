import {
  NextRequest,
  NextResponse,
} from "next/server";
import { randomUUID } from "node:crypto";

import {
  sendAppointmentReminderEmail,
  type AppointmentReminderType,
} from "@/lib/appointments/send-appointment-reminder-email";
import {
  logAppointmentNotificationDelivery,
  reminderTypeToNotificationType,
} from "@/lib/appointments/log-appointment-notification-delivery";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_SIZE = 25;

type ClaimedReminder = {
  id: string;
  appointment_id: string;
  reminder_type: AppointmentReminderType;
  appointment_occurrence_at: string;
};

type DoctorProfile = {
  first_name: string | null;
  last_name: string | null;
};

type DoctorRelation = {
  slug: string;
  profiles: DoctorProfile | DoctorProfile[] | null;
};

type ClinicTranslation = {
  locale: string;
  name: string;
};

type ClinicRelation = {
  slug: string;
  clinic_translations: ClinicTranslation[];
};

type AppointmentRecord = {
  id: string;
  status: string;
  patient_name: string;
  patient_email: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  doctor_id: string;
  clinic_id: string | null;
  doctors: DoctorRelation | DoctorRelation[] | null;
  clinics: ClinicRelation | ClinicRelation[] | null;
};

function firstRelation<T>(
  value: T | T[] | null
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function isAuthorizedCronRequest(
  request: NextRequest
) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(
      "CRON_SECRET is missing. Appointment reminders cannot run safely."
    );

    return false;
  }

  return (
    request.headers.get("authorization") ===
    `Bearer ${cronSecret}`
  );
}

function getDoctorName(
  appointment: AppointmentRecord
) {
  const doctor = firstRelation(
    appointment.doctors
  );

  const profile = firstRelation(
    doctor?.profiles ?? null
  );

  const profileName = [
    profile?.first_name,
    profile?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (profileName) {
    return profileName;
  }

  return (
    doctor?.slug
      .split("-")
      .map(
        (part) =>
          part.charAt(0).toUpperCase() +
          part.slice(1)
      )
      .join(" ") ??
    "Medic RomDoc"
  );
}

function getClinicName(
  appointment: AppointmentRecord
) {
  const clinic = firstRelation(
    appointment.clinics
  );

  if (!clinic) {
    return "Clinică nespecificată";
  }

  return (
    clinic.clinic_translations.find(
      (translation) =>
        translation.locale === "ro"
    )?.name ??
    clinic.clinic_translations[0]?.name ??
    clinic.slug
  );
}

export async function GET(
  request: NextRequest
): Promise<Response> {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { error: "Cerere neautorizată." },
      { status: 401 }
    );
  }

  const admin = createAdminClient();
  const workerId = `vercel-cron:${randomUUID()}`;

  const {
    data: released,
    error: releaseError,
  } = await admin.rpc(
    "release_stale_appointment_reminder_locks"
  );

  if (releaseError) {
    console.error(
      "Reminder stale-lock release failed:",
      releaseError
    );
  }

  const {
    data: claimedData,
    error: claimError,
  } = await admin.rpc(
    "claim_due_appointment_reminders",
    {
      worker_id: workerId,
      batch_size: BATCH_SIZE,
    }
  );

  if (claimError) {
    console.error(
      "Reminder claim failed:",
      claimError
    );

    return NextResponse.json(
      {
        error:
          "Mementourile nu au putut fi preluate pentru procesare.",
      },
      { status: 500 }
    );
  }

  const claimed =
    (claimedData ?? []) as ClaimedReminder[];

  const summary = {
    workerId,
    releasedStaleLocks:
      typeof released === "number"
        ? released
        : Number(released ?? 0),
    claimed: claimed.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    cancelled: 0,
  };

  for (const reminder of claimed) {
    const idempotencyKey =
      `appointment-reminder/${reminder.id}`;

    const {
      data: alreadySent,
      error: duplicateCheckError,
    } = await admin.rpc(
      "appointment_reminder_already_sent",
      {
        target_reminder_schedule_id:
          reminder.id,
      }
    );

    if (duplicateCheckError) {
      console.error(
        "Reminder duplicate check failed:",
        duplicateCheckError
      );

      await admin.rpc(
        "finalize_appointment_reminder",
        {
          reminder_id: reminder.id,
          worker_id: workerId,
          final_status: "failed",
          error_code:
            "DUPLICATE_CHECK_FAILED",
          error_message:
            duplicateCheckError.message,
        }
      );

      summary.failed += 1;
      continue;
    }

    if (alreadySent) {
      await admin.rpc(
        "finalize_appointment_reminder",
        {
          reminder_id: reminder.id,
          worker_id: workerId,
          final_status: "sent",
          error_code: null,
          error_message: null,
        }
      );

      summary.sent += 1;
      continue;
    }

    const {
      data: appointmentData,
      error: appointmentError,
    } = await admin
      .from("appointments")
      .select(`
        id,
        status,
        patient_name,
        patient_email,
        scheduled_date,
        scheduled_time,
        doctor_id,
        clinic_id,
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
      .eq("id", reminder.appointment_id)
      .maybeSingle();

    const appointment =
      appointmentData as AppointmentRecord | null;

    if (appointmentError || !appointment) {
      await admin.rpc(
        "finalize_appointment_reminder",
        {
          reminder_id: reminder.id,
          worker_id: workerId,
          final_status: "skipped",
          error_code: "APPOINTMENT_NOT_FOUND",
          error_message:
            appointmentError?.message ??
            "Appointment no longer exists.",
        }
      );

      summary.skipped += 1;
      continue;
    }

    if (
      !["confirmed", "rescheduled"].includes(
        appointment.status
      )
    ) {
      await logAppointmentNotificationDelivery({
        appointmentId: appointment.id,
        notificationType:
          reminderTypeToNotificationType(
            reminder.reminder_type
          ),
        recipientEmail:
          appointment.patient_email,
        triggeredByProfileId: null,
        reminderScheduleId: reminder.id,
        appointmentOccurrenceAt:
          reminder.appointment_occurrence_at,
        idempotencyKey,
        result: {
          sent: false,
          skipped: true,
          providerMessageId: null,
          errorCode:
            "APPOINTMENT_NOT_ELIGIBLE",
          errorMessage:
            `Appointment status is ${appointment.status}.`,
        },
      });

      await admin.rpc(
        "finalize_appointment_reminder",
        {
          reminder_id: reminder.id,
          worker_id: workerId,
          final_status: "cancelled",
          error_code: null,
          error_message: null,
        }
      );

      summary.cancelled += 1;
      continue;
    }

    if (
      !appointment.scheduled_date ||
      !appointment.scheduled_time ||
      !appointment.patient_email.trim()
    ) {
      await logAppointmentNotificationDelivery({
        appointmentId: appointment.id,
        notificationType:
          reminderTypeToNotificationType(
            reminder.reminder_type
          ),
        recipientEmail:
          appointment.patient_email ||
          "missing@invalid.local",
        triggeredByProfileId: null,
        reminderScheduleId: reminder.id,
        appointmentOccurrenceAt:
          reminder.appointment_occurrence_at,
        idempotencyKey,
        result: {
          sent: false,
          skipped: true,
          providerMessageId: null,
          errorCode:
            "MISSING_APPOINTMENT_DATA",
          errorMessage:
            "Scheduled date, time, or patient email is missing.",
        },
      });

      await admin.rpc(
        "finalize_appointment_reminder",
        {
          reminder_id: reminder.id,
          worker_id: workerId,
          final_status: "skipped",
          error_code: "MISSING_APPOINTMENT_DATA",
          error_message:
            "Scheduled date, time, or patient email is missing.",
        }
      );

      summary.skipped += 1;
      continue;
    }

    const sendResult =
      await sendAppointmentReminderEmail({
        reminderType: reminder.reminder_type,
        patientName: appointment.patient_name,
        patientEmail: appointment.patient_email,
        doctorName: getDoctorName(appointment),
        clinicName: getClinicName(appointment),
        scheduledDate: appointment.scheduled_date,
        scheduledTime: appointment.scheduled_time,
        cancellationUrl:
          `${request.nextUrl.origin}/patient-dashboard`,
        idempotencyKey,
      });

    const logResult =
      await logAppointmentNotificationDelivery({
        appointmentId: appointment.id,
        notificationType:
          reminderTypeToNotificationType(
            reminder.reminder_type
          ),
        recipientEmail:
          appointment.patient_email,
        triggeredByProfileId: null,
        reminderScheduleId: reminder.id,
        appointmentOccurrenceAt:
          reminder.appointment_occurrence_at,
        idempotencyKey,
        result: sendResult,
      });

    if (
      sendResult.sent &&
      !logResult.logged &&
      !logResult.duplicate
    ) {
      console.error(
        "Successful reminder email was sent but its delivery log failed:",
        {
          reminderId: reminder.id,
          idempotencyKey,
        }
      );
    }

    const finalStatus = sendResult.sent
      ? "sent"
      : sendResult.skipped
        ? "skipped"
        : "failed";

    const {
      data: finalized,
      error: finalizeError,
    } = await admin.rpc(
      "finalize_appointment_reminder",
      {
        reminder_id: reminder.id,
        worker_id: workerId,
        final_status: finalStatus,
        error_code: sendResult.errorCode,
        error_message: sendResult.errorMessage,
      }
    );

    if (finalizeError || !finalized) {
      console.error(
        "Reminder finalization failed:",
        {
          reminderId: reminder.id,
          finalizeError,
        }
      );

      summary.failed += 1;
      continue;
    }

    if (finalStatus === "sent") {
      summary.sent += 1;
    } else if (finalStatus === "skipped") {
      summary.skipped += 1;
    } else {
      summary.failed += 1;
    }
  }

  return NextResponse.json(
    {
      success: true,
      ...summary,
      processedAt: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
