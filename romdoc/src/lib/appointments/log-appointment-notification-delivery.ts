import {
  createAdminClient,
} from "@/lib/supabase/admin";
import type {
  PatientNotificationStatus,
  SendAppointmentStatusEmailResult,
} from "@/lib/appointments/send-appointment-status-email";
import type {
  AppointmentReminderType,
  SendAppointmentReminderEmailResult,
} from "@/lib/appointments/send-appointment-reminder-email";
import {
  sendAppointmentSms,
} from "@/lib/appointments/send-appointment-sms";

export type AppointmentNotificationType =
  | PatientNotificationStatus
  | "reminder_48_hours"
  | "reminder_24_hours";

type DeliveryResult =
  | SendAppointmentStatusEmailResult
  | SendAppointmentReminderEmailResult;

type LogAppointmentNotificationInput = {
  appointmentId: string;
  notificationType: AppointmentNotificationType;
  recipientEmail: string;
  triggeredByProfileId: string | null;
  result: DeliveryResult;
  reminderScheduleId?: string | null;
  appointmentOccurrenceAt?: string | null;
  idempotencyKey?: string | null;
};

export function reminderTypeToNotificationType(
  reminderType: AppointmentReminderType
): AppointmentNotificationType {
  return reminderType ===
    "48_hours"
    ? "reminder_48_hours"
    : "reminder_24_hours";
}

async function sendReminderSmsSideEffect({
  appointmentId,
  notificationType,
  triggeredByProfileId,
}: {
  appointmentId: string;
  notificationType: AppointmentNotificationType;
  triggeredByProfileId: string | null;
}) {
  if (
    notificationType !==
    "reminder_24_hours"
  ) {
    return;
  }

  try {
    await sendAppointmentSms({
      appointmentId,
      event:
        "reminder_24_hours",
      triggeredByProfileId,
    });
  } catch (
    error
  ) {
    console.error(
      "Appointment reminder SMS side-effect failed:",
      error
    );
  }
}

export async function logAppointmentNotificationDelivery({
  appointmentId,
  notificationType,
  recipientEmail,
  triggeredByProfileId,
  result,
  reminderScheduleId = null,
  appointmentOccurrenceAt = null,
  idempotencyKey = null,
}: LogAppointmentNotificationInput) {
  const admin =
    createAdminClient();

  const deliveryStatus =
    result.sent
      ? "sent"
      : result.skipped
        ? "skipped"
        : "failed";

  const {
    error,
  } = await admin
    .from(
      "appointment_notification_deliveries"
    )
    .insert({
      appointment_id:
        appointmentId,
      notification_type:
        notificationType,
      channel:
        "email",
      recipient_email:
        recipientEmail,
      delivery_status:
        deliveryStatus,
      provider:
        "resend",
      provider_message_id:
        result.providerMessageId,
      error_code:
        result.errorCode,
      error_message:
        result.errorMessage
          ?.slice(
            0,
            2000
          ) ??
        null,
      triggered_by_profile_id:
        triggeredByProfileId,
      reminder_schedule_id:
        reminderScheduleId,
      appointment_occurrence_at:
        appointmentOccurrenceAt,
      idempotency_key:
        idempotencyKey,
    });

  if (error) {
    const isDuplicate =
      error.code ===
      "23505";

    if (
      isDuplicate
    ) {
      console.info(
        "Duplicate notification delivery log ignored:",
        {
          notificationType,
          reminderScheduleId,
          idempotencyKey,
        }
      );

      return {
        logged:
          false,
        duplicate:
          true,
      };
    }

    console.error(
      "Appointment notification delivery log failed:",
      error
    );

    return {
      logged:
        false,
      duplicate:
        false,
    };
  }

  await sendReminderSmsSideEffect({
    appointmentId,
    notificationType,
    triggeredByProfileId,
  });

  return {
    logged:
      true,
    duplicate:
      false,
  };
}
