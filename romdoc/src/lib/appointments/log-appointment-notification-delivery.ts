import {
  createAdminClient,
} from "@/lib/supabase/admin";
import type {
  PatientNotificationStatus,
  SendAppointmentStatusEmailResult,
} from "@/lib/appointments/send-appointment-status-email";

type LogAppointmentNotificationInput = {
  appointmentId: string;
  notificationType: PatientNotificationStatus;
  recipientEmail: string;
  triggeredByProfileId: string | null;
  result: SendAppointmentStatusEmailResult;
};

export async function logAppointmentNotificationDelivery({
  appointmentId,
  notificationType,
  recipientEmail,
  triggeredByProfileId,
  result,
}: LogAppointmentNotificationInput) {
  const admin = createAdminClient();

  const deliveryStatus =
    result.sent
      ? "sent"
      : result.skipped
        ? "skipped"
        : "failed";

  const { error } = await admin
    .from("appointment_notification_deliveries")
    .insert({
      appointment_id: appointmentId,
      notification_type: notificationType,
      channel: "email",
      recipient_email: recipientEmail,
      delivery_status: deliveryStatus,
      provider: "resend",
      provider_message_id:
        result.providerMessageId,
      error_code: result.errorCode,
      error_message:
        result.errorMessage?.slice(0, 2000) ?? null,
      triggered_by_profile_id:
        triggeredByProfileId,
    });

  if (error) {
    console.error(
      "Appointment notification delivery log failed:",
      error
    );
  }
}
